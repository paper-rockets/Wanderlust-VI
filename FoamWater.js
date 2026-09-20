import * as THREE from "three";

/**
 * Procedural DuDv wave texture generator
 * Used as an automatic fallback if an external image is not supplied.
 */
function createProceduralDuDvTexture(size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 4;
      const v = (y / size) * Math.PI * 4;

      const dx = Math.sin(u * 2 + v) * 0.5 + Math.cos(u * 3 - v * 2) * 0.3;
      const dy = Math.cos(v * 2 + u) * 0.5 + Math.sin(v * 3 - u * 2) * 0.3;

      const r = Math.floor((dx * 0.5 + 0.5) * 255);
      const g = Math.floor((dy * 0.5 + 0.5) * 255);

      const idx = (y * size + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = 128;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const vertexShader = `
#include <fog_pars_vertex>

varying vec2 vUv;

void main() {
  vUv = uv;

  #include <begin_vertex>
  #include <project_vertex>
  #include <fog_vertex>
}
`;

function getFragmentShader() {
  const colorChunk = THREE.ShaderChunk && THREE.ShaderChunk.colorspace_fragment
    ? "#include <colorspace_fragment>"
    : "#include <encodings_fragment>";

  return `
#include <common>
#include <packing>
#include <fog_pars_fragment>

varying vec2 vUv;
uniform sampler2D tDepth;
uniform sampler2D tDudv;
uniform vec3 waterColor;
uniform vec3 foamColor;
uniform float cameraNear;
uniform float cameraFar;
uniform float time;
uniform float threshold;
uniform float uvScale;
uniform vec2 resolution;

float getDepth( const in vec2 screenPosition ) {
  #if DEPTH_PACKING == 1
    return unpackRGBAToDepth( texture2D( tDepth, screenPosition ) );
  #else
    return texture2D( tDepth, screenPosition ).x;
  #endif
}

float getViewZ( const in float depth ) {
  #if ORTHOGRAPHIC_CAMERA == 1
    return orthographicDepthToViewZ( depth, cameraNear, cameraFar );
  #else
    return perspectiveDepthToViewZ( depth, cameraNear, cameraFar );
  #endif
}

void main() {
  vec2 screenUV = gl_FragCoord.xy / resolution;

  float fragmentLinearEyeDepth = getViewZ( gl_FragCoord.z );
  float linearEyeDepth = getViewZ( getDepth( screenUV ) );

  float rawDiff = max( 0.0, fragmentLinearEyeDepth - linearEyeDepth );

  // Wave ripple distortion
  vec2 waveOffset = texture2D( tDudv, ( vUv * uvScale ) - time * 0.05 ).rg;
  waveOffset = ( waveOffset * 2.0 - 1.0 ) * 0.06;

  float diff = rawDiff + waveOffset.x * min( 1.0, threshold * 2.5 );

  // Smooth contact foam falloff to avoid harsh pixel stair-steps
  float foamFactor = 1.0 - smoothstep( 0.0, threshold, diff );

  gl_FragColor.rgb = mix( waterColor, foamColor, foamFactor );
  gl_FragColor.a = 1.0;

  #include <tonemapping_fragment>
  ${colorChunk}
  #include <fog_fragment>
}
`;
}

/**
 * FoamWater - A reusable depth-based foam water shader for Three.js
 */
export class FoamWater {
  constructor({
    renderer,
    scene,
    camera,
    width = 10,
    height = 10,
    foamColor = 0xffffff,
    waterColor = 0x14c6a5,
    threshold = 0.1,
    uvScale = null,
    dudvMap = "./water_dudv.png"
  }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.foamColor = new THREE.Color(foamColor);
    this.waterColor = new THREE.Color(waterColor);
    this.threshold = threshold;
    this.uvScale = uvScale !== null ? uvScale : Math.max(2.0, width / 5.0);

    const pixelRatio = renderer.getPixelRatio ? renderer.getPixelRatio() : 1;
    const size = new THREE.Vector2();
    if (renderer.getSize) {
      renderer.getSize(size);
    }
    if (size.x === 0 || size.y === 0) {
      size.set(window.innerWidth, window.innerHeight);
    }

    const isWebGL2 = renderer.capabilities && renderer.capabilities.isWebGL2;
    const supportsDepth = isWebGL2 || (renderer.extensions && !!renderer.extensions.get("WEBGL_depth_texture"));

    // Render target for depth pass
    this.renderTarget = new THREE.WebGLRenderTarget(
      size.x * pixelRatio,
      size.y * pixelRatio
    );
    this.renderTarget.texture.minFilter = THREE.NearestFilter;
    this.renderTarget.texture.magFilter = THREE.NearestFilter;
    this.renderTarget.texture.generateMipmaps = false;
    this.renderTarget.stencilBuffer = false;

    if (supportsDepth) {
      this.renderTarget.depthTexture = new THREE.DepthTexture();
      this.renderTarget.depthTexture.type = (renderer.capabilities && renderer.capabilities.isWebGL2)
        ? THREE.UnsignedIntType
        : THREE.UnsignedShortType;
      this.renderTarget.depthTexture.minFilter = THREE.NearestFilter;
      this.renderTarget.depthTexture.maxFilter = THREE.NearestFilter;
    }

    // Material for drawing scene depth
    this.depthMaterial = new THREE.MeshDepthMaterial();
    this.depthMaterial.depthPacking = THREE.RGBADepthPacking;
    this.depthMaterial.blending = THREE.NoBlending;

    // Load DuDv texture
    let dudvTexture;
    if (dudvMap && typeof dudvMap === "string") {
      dudvTexture = new THREE.TextureLoader().load(
        dudvMap,
        undefined,
        undefined,
        () => {
          this.material.uniforms.tDudv.value = createProceduralDuDvTexture();
        }
      );
      dudvTexture.wrapS = dudvTexture.wrapT = THREE.RepeatWrapping;
    } else if (dudvMap && dudvMap.isTexture) {
      dudvTexture = dudvMap;
    } else {
      dudvTexture = createProceduralDuDvTexture();
    }

    const initialUniforms = {
      time: { value: 0 },
      threshold: { value: this.threshold },
      uvScale: { value: this.uvScale },
      tDudv: { value: dudvTexture },
      tDepth: {
        value: supportsDepth ? this.renderTarget.depthTexture : this.renderTarget.texture
      },
      cameraNear: { value: camera.near },
      cameraFar: { value: camera.far },
      resolution: { value: new THREE.Vector2(size.x * pixelRatio, size.y * pixelRatio) },
      foamColor: { value: this.foamColor },
      waterColor: { value: this.waterColor }
    };

    const fogUniforms = (THREE.UniformsLib && THREE.UniformsLib["fog"]) || {};
    const mergedUniforms = THREE.UniformsUtils
      ? THREE.UniformsUtils.merge([fogUniforms, initialUniforms])
      : Object.assign({}, fogUniforms, initialUniforms);

    const PlaneGeom = THREE.PlaneGeometry || THREE.PlaneBufferGeometry;
    this.geometry = new PlaneGeom(width, height);

    this.material = new THREE.ShaderMaterial({
      defines: {
        DEPTH_PACKING: supportsDepth ? 0 : 1,
        ORTHOGRAPHIC_CAMERA: 0
      },
      uniforms: mergedUniforms,
      vertexShader: vertexShader,
      fragmentShader: getFragmentShader(),
      fog: true
    });

    this.uniforms = this.material.uniforms;

    this.uniforms.cameraNear.value = camera.near;
    this.uniforms.cameraFar.value = camera.far;
    this.uniforms.resolution.value.set(size.x * pixelRatio, size.y * pixelRatio);
    this.uniforms.tDudv.value = dudvTexture;
    this.uniforms.tDepth.value = supportsDepth ? this.renderTarget.depthTexture : this.renderTarget.texture;
    this.uniforms.threshold.value = this.threshold;
    this.uniforms.uvScale.value = this.uvScale;
    this.uniforms.foamColor.value = this.foamColor;
    this.uniforms.waterColor.value = this.waterColor;

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.rotation.x = -Math.PI * 0.5;

    if (this.scene) {
      this.scene.add(this.mesh);
    }
  }

  /**
   * Must be called in the animation loop before scene rendering.
   */
  update(time) {
    if (time !== undefined) {
      this.uniforms.time.value = time;
    }
    this.uniforms.threshold.value = this.threshold;
    this.uniforms.uvScale.value = this.uvScale;
    this.uniforms.foamColor.value.copy(this.foamColor);
    this.uniforms.waterColor.value.copy(this.waterColor);
    this.uniforms.cameraNear.value = this.camera.near;
    this.uniforms.cameraFar.value = this.camera.far;

    // 1. Depth pass: capture scene depth
    this.mesh.visible = false;
    this.scene.overrideMaterial = this.depthMaterial;

    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);

    this.scene.overrideMaterial = null;
    this.mesh.visible = true;
  }

  resize(width, height) {
    const pixelRatio = this.renderer.getPixelRatio ? this.renderer.getPixelRatio() : 1;
    const w = (width || window.innerWidth) * pixelRatio;
    const h = (height || window.innerHeight) * pixelRatio;

    this.renderTarget.setSize(w, h);
    if (this.uniforms && this.uniforms.resolution) {
      this.uniforms.resolution.value.set(w, h);
    }
  }

  setFoamColor(color) {
    this.foamColor.set(color);
    if (this.uniforms && this.uniforms.foamColor) {
      this.uniforms.foamColor.value.copy(this.foamColor);
    }
  }

  setWaterColor(color) {
    this.waterColor.set(color);
    if (this.uniforms && this.uniforms.waterColor) {
      this.uniforms.waterColor.value.copy(this.waterColor);
    }
  }

  setThreshold(val) {
    this.threshold = val;
    if (this.uniforms && this.uniforms.threshold) {
      this.uniforms.threshold.value = val;
    }
  }

  setUvScale(val) {
    this.uvScale = val;
    if (this.uniforms && this.uniforms.uvScale) {
      this.uniforms.uvScale.value = val;
    }
  }
}
