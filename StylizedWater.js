import * as THREE from 'three';

// ------------------------------------------------------------
// Procedural Texture Helpers (Fallback when PNGs are not provided)
// ------------------------------------------------------------

export function createProceduralNormalTexture(width = 256, height = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    // Layered sines to produce a tiling water normal map
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const u = (x / width) * Math.PI * 2;
            const v = (y / height) * Math.PI * 2;

            // Compute height derivatives
            const dhdx =
                Math.cos(u * 3) * 0.4 +
                Math.cos(u * 7 + v * 2) * 0.25 +
                Math.cos(u * 13 - v * 5) * 0.15;
            const dhdy =
                Math.sin(v * 3) * 0.4 +
                Math.sin(v * 7 + u * 2) * 0.25 +
                Math.sin(v * 13 - u * 5) * 0.15;

            // Normal vector (-dhdx, -dhdy, 1) normalized
            let nx = -dhdx * 0.6;
            let ny = -dhdy * 0.6;
            let nz = 1.0;
            const len = Math.hypot(nx, ny, nz);
            nx /= len; ny /= len; nz /= len;

            const idx = (y * width + x) * 4;
            data[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
            data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
            data[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
            data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

export function createProceduralDisplacementTexture(width = 256, height = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const u = (x / width) * Math.PI * 2;
            const v = (y / height) * Math.PI * 2;

            const h =
                (Math.sin(u * 2 + v) * 0.4 +
                 Math.cos(u * 4 - v * 2) * 0.3 +
                 Math.sin(u * 8 + v * 6) * 0.2 + 0.9) / 1.8;

            const val = Math.floor(Math.min(1, Math.max(0, h)) * 255);
            const idx = (y * width + x) * 4;
            data[idx] = val;
            data[idx + 1] = val;
            data[idx + 2] = val;
            data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

export function createProceduralEdgeNoiseTexture(width = 256, height = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    // Smooth pseudo-random cellular noise for foam edges
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const u = (x / width) * 16.0;
            const v = (y / height) * 16.0;

            const val1 = Math.sin(u * 1.7) * Math.cos(v * 2.3);
            const val2 = Math.sin((u + v) * 3.1) * 0.5;
            const val3 = Math.cos((u - v) * 4.7) * 0.25;
            const combined = (val1 + val2 + val3 + 1.75) / 3.5;

            const byteVal = Math.floor(Math.min(1, Math.max(0, combined)) * 255);
            const idx = (y * width + x) * 4;
            data[idx] = byteVal;
            data[idx + 1] = byteVal;
            data[idx + 2] = byteVal;
            data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

export function createProceduralEdgeRampTexture(width = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = 4;
    const ctx = canvas.getContext('2d');

    // Stylized foam ramp: bright solid foam at shoreline, crisp outer edge
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0.0, '#ffffff');
    grad.addColorStop(0.35, '#ffffff');
    grad.addColorStop(0.65, '#99ddff');
    grad.addColorStop(0.85, '#226688');
    grad.addColorStop(1.0, '#000000');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, 4);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
}

// ------------------------------------------------------------
// Shaders
// ------------------------------------------------------------

const vertexShader = /* glsl */ `
uniform float uTime;

uniform float uWindIntensity;
uniform vec3 uWindDirection;

uniform sampler2D tDisplacement;
uniform float uDisplacementStrength;
uniform float uDisplacementScrollSpeed;
uniform vec2 uDisplacementScrollOffset;
uniform float uDisplacementScaleOffset;
uniform vec2 uDisplacementScale;

varying vec3 vWorldPosition;
varying vec3 vViewPosition;

void main() {
    vec3 p = position;

    vec4 baseWorld = modelMatrix * vec4(p, 1.0);
    vec3 worldPos = baseWorld.xyz;

#ifdef USE_DISPLACEMENT
    float windFactor = uWindIntensity * 0.7 + 0.3;

    vec2 windXZ = uWindDirection.xz;
    float windLen = max(length(windXZ), 0.0001);
    windXZ /= windLen;

    float t =
        uTime *
        uDisplacementScrollSpeed *
        windFactor;

    float d1 = texture2D(
        tDisplacement,
        worldPos.xz * uDisplacementScale
        + t * -windXZ
    ).r;

    float d2 = texture2D(
        tDisplacement,
        worldPos.xz *
        uDisplacementScale *
        uDisplacementScaleOffset
        + t * (-windXZ + uDisplacementScrollOffset)
    ).r;

    float displacementMixed = mix(d1, d2, 0.4);

    float offset =
        (displacementMixed * 2.0 - 1.0)
        * uDisplacementStrength;

    p.y += offset;
#endif

    vec4 world = modelMatrix * vec4(p, 1.0);
    vec4 view = viewMatrix * world;

    vWorldPosition = world.xyz;
    vViewPosition = view.xyz;

    gl_Position = projectionMatrix * view;
}
`;

const fragmentShader = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;

uniform sampler2D tSceneColor;
uniform sampler2D tSceneDepth;

uniform mat4 uProjection;
uniform mat4 uInvProjection;
uniform mat4 uCameraMatrixWorld;

// ------------------------------------------------
// COLOR
// ------------------------------------------------

uniform vec3 uAbsorptionColor;

uniform float uFresnelRadius;
uniform vec3 uFresnelColor;

uniform float uRoughness;
uniform float uSpecular;

uniform float uDepthDistance;
uniform float uBeersLaw;

// ------------------------------------------------
// NORMAL / REFRACTION
// ------------------------------------------------

uniform sampler2D tNormal;

uniform float uRefractionStrength;
uniform float uNormalStrength;
uniform float uScrollSpeed;

uniform vec2 uScrollOffset;
uniform float uScaleOffset;
uniform vec2 uNormalScale;

// ------------------------------------------------
// EDGE / FOAM
// ------------------------------------------------

uniform float uEdgeThickness;
uniform float uEdgeSpeed;
uniform vec2 uEdgeNoiseScale;

uniform sampler2D tEdgeNoise;
uniform sampler2D tEdgeRamp;

// ------------------------------------------------
// WIND
// ------------------------------------------------

uniform float uWindIntensity;
uniform vec3 uWindDirection;

// ------------------------------------------------
// PLAYER WAVES
// ------------------------------------------------

uniform vec3 uPlayerPosition;
uniform float uInfluenceSize;
uniform float uPlayerWaveFrequency;
uniform float uPlayerWaveSpeed;

// ------------------------------------------------
// CAUSTICS
// ------------------------------------------------

uniform float uCausticSize;
uniform float uCausticRange;
uniform float uCausticStrength;

// ------------------------------------------------
// SSR
// ------------------------------------------------

uniform float uSSRStrength;
uniform float uSSRTravel;
uniform float uSSRStepNear;
uniform float uSSRStepFar;
uniform float uSSRTolerance;
uniform int uSSRSteps;

// ------------------------------------------------
// LIGHTING
// ------------------------------------------------

uniform vec3 uSunDirection;
uniform vec3 uSunColor;

varying vec3 vWorldPosition;
varying vec3 vViewPosition;


// ============================================================
// DEPTH RECONSTRUCTION
// ============================================================

vec3 viewPositionFromDepth(
    vec2 uv,
    float depth
) {
    vec4 ndc = vec4(
        uv * 2.0 - 1.0,
        depth * 2.0 - 1.0,
        1.0
    );

    vec4 view = uInvProjection * ndc;

    return view.xyz / view.w;
}


vec3 worldPositionFromDepth(
    vec2 uv,
    float depth
) {
    vec3 viewPos =
        viewPositionFromDepth(uv, depth);

    vec4 world =
        uCameraMatrixWorld *
        vec4(viewPos, 1.0);

    return world.xyz;
}


bool uvInBounds(vec2 uv) {
    return
        uv.x >= 0.0 &&
        uv.x <= 1.0 &&
        uv.y >= 0.0 &&
        uv.y <= 1.0;
}


// ============================================================
// FRESNEL
// ============================================================

float fresnelTerm(
    vec3 N,
    vec3 V
) {
    return pow(
        1.0 -
        clamp(
            dot(
                normalize(N),
                normalize(V)
            ),
            0.0,
            1.0
        ),
        uFresnelRadius
    );
}


// ============================================================
// NORMAL MAP
// ============================================================

vec3 getWaterNormal(
    vec2 windXZ,
    float windFactor
) {
    float t =
        uTime *
        uScrollSpeed *
        windFactor;

    vec3 n1 = texture2D(
        tNormal,
        vWorldPosition.xz *
        uNormalScale
        + t * -windXZ
    ).xyz;

    vec3 n2 = texture2D(
        tNormal,
        vWorldPosition.xz *
        uNormalScale *
        uScaleOffset
        + t * 0.8 *
        (-windXZ + uScrollOffset)
    ).xyz;

    vec3 n = mix(n1, n2, 0.5);

    n = n * 2.0 - 1.0;

    // tangent normal -> horizontal water world normal
    vec3 mapNormal = normalize(
        vec3(
            n.x * uNormalStrength,
            max(n.z, 0.08),
            n.y * uNormalStrength
        )
    );

    // actual displaced geometric normal
    vec3 dx = dFdx(vWorldPosition);
    vec3 dy = dFdy(vWorldPosition);

    vec3 geometryNormal =
        normalize(cross(dx, dy));

    if (geometryNormal.y < 0.0)
        geometryNormal *= -1.0;

    return normalize(
        geometryNormal +
        vec3(
            mapNormal.x,
            mapNormal.y - 1.0,
            mapNormal.z
        )
    );
}


// ============================================================
// CAUSTIC NOISE
// ported from original BCC / OpenSimplex-style routine
// ============================================================

vec4 permute(vec4 t) {
    return t * (t * 34.0 + 133.0);
}


vec3 grad3(float hash) {

    vec3 cube =
        mod(
            floor(
                hash /
                vec3(1.0, 2.0, 4.0)
            ),
            2.0
        ) * 2.0 - 1.0;

    vec3 cuboct = cube;

    int index =
        int(
            clamp(
                floor(hash / 16.0),
                0.0,
                2.0
            )
        );

    if (index == 0)
        cuboct.x = 0.0;

    if (index == 1)
        cuboct.y = 0.0;

    if (index == 2)
        cuboct.z = 0.0;

    float type =
        mod(
            floor(hash / 8.0),
            2.0
        );

    vec3 rhomb =
        (1.0 - type) * cube +
        type *
        (
            cuboct +
            cross(cube, cuboct)
        );

    vec3 g =
        cuboct * 1.22474487139 +
        rhomb;

    g *=
        (
            -0.042942436724648037 *
            type +
            1.0
        )
        *
        3.5946317686139184;

    return g;
}


vec4 noisePart(vec3 X) {

    vec3 b = floor(X);

    vec4 i4 =
        vec4(
            X - b,
            2.5
        );

    vec3 v1 =
        b +
        floor(
            dot(
                i4,
                vec4(0.25)
            )
        );

    vec3 v2 =
        b +
        vec3(1.0, 0.0, 0.0)
        +
        vec3(-1.0, 1.0, 1.0)
        *
        floor(
            dot(
                i4,
                vec4(
                    -0.25,
                    0.25,
                    0.25,
                    0.35
                )
            )
        );

    vec3 v3 =
        b +
        vec3(0.0, 1.0, 0.0)
        +
        vec3(1.0, -1.0, 1.0)
        *
        floor(
            dot(
                i4,
                vec4(
                    0.25,
                    -0.25,
                    0.25,
                    0.35
                )
            )
        );

    vec3 v4 =
        b +
        vec3(0.0, 0.0, 1.0)
        +
        vec3(1.0, 1.0, -1.0)
        *
        floor(
            dot(
                i4,
                vec4(
                    0.25,
                    0.25,
                    -0.25,
                    0.35
                )
            )
        );

    vec4 hashes =
        permute(
            mod(
                vec4(
                    v1.x,
                    v2.x,
                    v3.x,
                    v4.x
                ),
                289.0
            )
        );

    hashes =
        permute(
            mod(
                hashes +
                vec4(
                    v1.y,
                    v2.y,
                    v3.y,
                    v4.y
                ),
                289.0
            )
        );

    hashes =
        mod(
            permute(
                mod(
                    hashes +
                    vec4(
                        v1.z,
                        v2.z,
                        v3.z,
                        v4.z
                    ),
                    289.0
                )
            ),
            48.0
        );

    vec3 d1 = X - v1;
    vec3 d2 = X - v2;
    vec3 d3 = X - v3;
    vec3 d4 = X - v4;

    vec4 a =
        max(
            0.75 -
            vec4(
                dot(d1,d1),
                dot(d2,d2),
                dot(d3,d3),
                dot(d4,d4)
            ),
            0.0
        );

    vec4 aa = a * a;
    vec4 aaaa = aa * aa;

    vec3 g1 = grad3(hashes.x);
    vec3 g2 = grad3(hashes.y);
    vec3 g3 = grad3(hashes.z);
    vec3 g4 = grad3(hashes.w);

    vec4 extrapolation =
        vec4(
            dot(d1,g1),
            dot(d2,g2),
            dot(d3,g3),
            dot(d4,g4)
        );

    vec4 weights =
        aa *
        a *
        extrapolation;

    vec3 derivative =
        -8.0 *
        (
            d1 * weights.x +
            d2 * weights.y +
            d3 * weights.z +
            d4 * weights.w
        )
        +
        (
            g1 * aaaa.x +
            g2 * aaaa.y +
            g3 * aaaa.z +
            g4 * aaaa.w
        );

    return vec4(
        derivative,
        dot(
            aaaa,
            extrapolation
        )
    );
}


vec4 causticNoise(vec3 X) {

    X =
        dot(
            X,
            vec3(2.0 / 3.0)
        )
        - X;

    vec4 result =
        noisePart(X)
        +
        noisePart(
            X + 144.5
        );

    return vec4(
        dot(
            result.xyz,
            vec3(2.0 / 3.0)
        )
        - result.xyz,
        result.w
    );
}


// ============================================================
// SSR
// ============================================================

vec2 viewToUV(vec3 viewPosition) {

    vec4 clip =
        uProjection *
        vec4(
            viewPosition,
            1.0
        );

    vec2 ndc =
        clip.xy /
        clip.w;

    return
        ndc * 0.5 +
        0.5;
}


vec3 calculateSSR(
    vec3 viewNormal,
    out float hitAlpha
) {

    hitAlpha = 0.0;

    vec3 incident =
        normalize(
            vViewPosition
        );

    vec3 rayDirection =
        normalize(
            reflect(
                incident,
                viewNormal
            )
        );

    vec3 rayPosition =
        vViewPosition +
        viewNormal * 0.05;

    vec3 sampledColor =
        vec3(0.0);

    for (
        int i = 0;
        i < 96;
        i++
    ) {

        if (i >= uSSRSteps)
            break;

        float progress =
            float(i) /
            max(
                float(uSSRSteps - 1),
                1.0
            );

        float stepLength =
            mix(
                uSSRStepNear,
                uSSRStepFar,
                progress
            );

        rayPosition +=
            rayDirection *
            stepLength;

        if (
            length(
                rayPosition -
                vViewPosition
            )
            >
            uSSRTravel
        )
            break;

        vec2 uv =
            viewToUV(
                rayPosition
            );

        if (!uvInBounds(uv))
            break;

        float depth =
            texture2D(
                tSceneDepth,
                uv
            ).r;

        if (depth >= 0.99999)
            continue;

        vec3 scenePosition =
            viewPositionFromDepth(
                uv,
                depth
            );

        float rayDepth =
            -rayPosition.z;

        float sceneDepth =
            -scenePosition.z;

        float difference =
            rayDepth -
            sceneDepth;

        if (
            difference > 0.0 &&
            difference <
            uSSRTolerance *
            stepLength
        ) {

            sampledColor =
                texture2D(
                    tSceneColor,
                    uv
                ).rgb;

            vec2 edge =
                1.0 -
                abs(
                    uv * 2.0 -
                    1.0
                );

            edge =
                sqrt(
                    max(
                        edge,
                        0.0
                    )
                );

            hitAlpha =
                clamp(
                    min(
                        edge.x,
                        edge.y
                    ),
                    0.0,
                    1.0
                );

            break;
        }
    }

    return sampledColor;
}


// ============================================================
// MAIN
// ============================================================

void main() {

    vec2 screenUV =
        gl_FragCoord.xy /
        uResolution;

    vec2 windXZ =
        uWindDirection.xz;

    float windLength =
        max(
            length(windXZ),
            0.0001
        );

    windXZ /= windLength;

    float windFactor =
        uWindIntensity * 0.7 +
        0.3;


    // --------------------------------------------------------
    // SURFACE NORMAL
    // --------------------------------------------------------

    vec3 worldNormal =
        getWaterNormal(
            windXZ,
            windFactor
        );

    vec3 viewNormal =
        normalize(
            mat3(viewMatrix) *
            worldNormal
        );


    // --------------------------------------------------------
    // ORIGINAL DEPTH
    // --------------------------------------------------------

    float rawDepth =
        texture2D(
            tSceneDepth,
            screenUV
        ).r;

    vec3 sceneViewPosition =
        viewPositionFromDepth(
            screenUV,
            rawDepth
        );

    float waterDepth =
        max(
            vViewPosition.z -
            sceneViewPosition.z,
            0.0
        );


    // --------------------------------------------------------
    // EDGE / CONTACT FOAM
    // --------------------------------------------------------

    float edgeBlend =
        1.0 -
        clamp(
            waterDepth /
            max(
                uEdgeThickness,
                0.001
            ),
            0.0,
            1.0
        );

    vec2 edgeUV =
        vWorldPosition.xz *
        uEdgeNoiseScale;

    edgeUV +=
        -windXZ *
        uTime *
        uEdgeSpeed *
        windFactor;

    float edgeNoise =
        texture2D(
            tEdgeNoise,
            edgeUV
        ).r;

    float edgeRamp =
        texture2D(
            tEdgeRamp,
            vec2(
                clamp(
                    edgeNoise *
                    (1.0 - edgeBlend),
                    0.0,
                    1.0
                ),
                0.5
            )
        ).r;

    float edgeMask =
        edgeRamp *
        edgeBlend;


    // --------------------------------------------------------
    // PLAYER WAVES
    // --------------------------------------------------------

    float playerMask = 0.0;

#ifdef USE_PLAYER_WAVES

    vec3 playerRelative =
        vWorldPosition -
        uPlayerPosition;

    float playerHeight =
        smoothstep(
            1.0,
            0.0,
            abs(
                playerRelative.y
            )
        );

    float distanceToPlayer =
        length(
            playerRelative.xz
        );

    float influence =
        smoothstep(
            uInfluenceSize,
            0.0,
            distanceToPlayer
        );

    float ring =
        sin(
            distanceToPlayer *
            uPlayerWaveFrequency
            -
            uTime *
            uPlayerWaveSpeed
            +
            edgeNoise * 2.0
        );

    ring =
        pow(
            ring * 0.5 + 0.5,
            6.0
        );

    playerMask =
        ring *
        influence *
        playerHeight;

#endif

    float rippleMask =
        clamp(
            edgeMask +
            playerMask,
            0.0,
            1.0
        );


    // --------------------------------------------------------
    // REFRACTION
    // --------------------------------------------------------

    float refractionDepth =
        clamp(
            waterDepth /
            max(
                uDepthDistance,
                0.001
            ),
            0.0,
            1.0
        );

    vec2 refractedUV =
        screenUV +
        worldNormal.xz *
        uRefractionStrength *
        0.015 *
        refractionDepth;

    bool validRefraction =
        uvInBounds(
            refractedUV
        );

    float refractedDepthRaw =
        texture2D(
            tSceneDepth,
            refractedUV
        ).r;

    vec3 refractedViewPosition =
        viewPositionFromDepth(
            refractedUV,
            refractedDepthRaw
        );

    float refractedWaterDepth =
        max(
            vViewPosition.z -
            refractedViewPosition.z,
            0.0
        );

    // Don't refract objects which are actually
    // in front of the water.
    if (
        refractedWaterDepth <=
        0.0001
    ) {
        validRefraction = false;
    }


    vec3 screenColor;

    float finalWaterDepth;

    if (validRefraction) {

        screenColor =
            texture2D(
                tSceneColor,
                refractedUV
            ).rgb;

        finalWaterDepth =
            refractedWaterDepth;

    } else {

        screenColor =
            texture2D(
                tSceneColor,
                screenUV
            ).rgb;

        finalWaterDepth =
            waterDepth;
    }


    screenColor *= 0.9;


    // --------------------------------------------------------
    // BEER-LAMBERT ABSORPTION
    // --------------------------------------------------------

    float depthBlend =
        clamp(
            finalWaterDepth /
            max(
                uDepthDistance,
                0.001
            ),
            0.0,
            1.0
        );

    depthBlend =
        1.0 -
        exp(
            -depthBlend *
            uBeersLaw
        );

    vec3 opposingColor =
        vec3(1.0) -
        uAbsorptionColor;

    vec3 color =
        clamp(
            screenColor -
            uAbsorptionColor *
            depthBlend,
            0.0,
            1.0
        );

    color =
        mix(
            color,
            opposingColor,
            depthBlend *
            depthBlend
        );


    // --------------------------------------------------------
    // FRESNEL
    // --------------------------------------------------------

#ifdef USE_FRESNEL

    vec3 viewDirection =
        normalize(
            cameraPosition -
            vWorldPosition
        );

    float fresnel =
        fresnelTerm(
            worldNormal,
            viewDirection
        );

    color =
        mix(
            color,
            uFresnelColor,
            fresnel
        );

#endif


    // --------------------------------------------------------
    // CAUSTICS
    // --------------------------------------------------------

#ifdef USE_CAUSTICS

    float causticFade =
        1.0 -
        clamp(
            finalWaterDepth /
            max(
                uCausticRange,
                0.001
            ),
            0.0,
            1.0
        );

    if (causticFade > 0.001) {

        vec3 sceneWorld =
            worldPositionFromDepth(
                validRefraction
                    ? refractedUV
                    : screenUV,

                validRefraction
                    ? refractedDepthRaw
                    : rawDepth
            );

        vec3 noisePosition =
            vec3(
                sceneWorld.xz *
                uCausticSize,
                mod(
                    uTime,
                    578.0
                )
                *
                0.8660254
            );

        vec4 noise =
            causticNoise(
                noisePosition
            );

        noise =
            causticNoise(
                noisePosition -
                noise.xyz /
                16.0
            );

        float caustic =
            noise.w * 0.5 +
            0.5;

        color +=
            caustic *
            uCausticStrength *
            causticFade *
            causticFade *
            (1.0 - depthBlend);
    }

#endif


    // --------------------------------------------------------
    // SSR
    // --------------------------------------------------------

#ifdef USE_SSR

    float ssrAlpha;

    vec3 reflection =
        calculateSSR(
            viewNormal,
            ssrAlpha
        );

    color =
        mix(
            color,
            reflection,
            ssrAlpha *
            (1.0 - uRoughness) *
            uSSRStrength
        );

#endif


    // --------------------------------------------------------
    // CONTACT FOAM + PLAYER RIPPLES
    // --------------------------------------------------------

    color =
        mix(
            color,
            vec3(0.98),
            rippleMask
        );


    // --------------------------------------------------------
    // SIMPLE SUN SPECULAR
    // --------------------------------------------------------

    vec3 V =
        normalize(
            cameraPosition -
            vWorldPosition
        );

    vec3 L =
        normalize(
            uSunDirection
        );

    vec3 H =
        normalize(
            V + L
        );

    float shininess =
        mix(
            8.0,
            256.0,
            pow(
                1.0 - uRoughness,
                2.0
            )
        );

    float highlight =
        pow(
            max(
                dot(
                    worldNormal,
                    H
                ),
                0.0
            ),
            shininess
        );

    color +=
        uSunColor *
        highlight *
        uSpecular;


    gl_FragColor =
        vec4(
            max(
                color,
                vec3(0.0)
            ),
            1.0
        );

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`;


export class StylizedWater {

    constructor({
        renderer,
        scene,
        camera,

        normalTexture = null,
        displacementTexture = null,
        edgeNoiseTexture = null,
        edgeRampTexture = null,

        size = 10000,
        segments = 256,

        caustics = true,
        fresnel = true,
        playerWaves = true,
        displacement = true,

        // OFF by default intentionally.
        ssr = false
    }) {

        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        const drawingSize =
            renderer.getDrawingBufferSize(
                new THREE.Vector2()
            );

        const width = Math.max(1, drawingSize.x);
        const height = Math.max(1, drawingSize.y);

        this.target =
            new THREE.WebGLRenderTarget(
                width,
                height,
                {
                    depthBuffer: true,
                    stencilBuffer: false,
                    minFilter: THREE.LinearFilter,
                    magFilter: THREE.LinearFilter
                }
            );

        this.target.depthTexture =
            new THREE.DepthTexture(
                width,
                height,
                THREE.UnsignedIntType
            );

        this.target.depthTexture.format =
            THREE.DepthFormat;


        // ----------------------------------------
        // texture setup (use procedural fallbacks if null)
        // ----------------------------------------

        normalTexture = normalTexture || createProceduralNormalTexture();
        displacementTexture = displacementTexture || createProceduralDisplacementTexture();
        edgeNoiseTexture = edgeNoiseTexture || createProceduralEdgeNoiseTexture();
        edgeRampTexture = edgeRampTexture || createProceduralEdgeRampTexture();

        for (const tex of [
            normalTexture,
            displacementTexture,
            edgeNoiseTexture
        ]) {
            if (!tex) continue;
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.colorSpace = THREE.NoColorSpace;
        }

        if (edgeRampTexture) {
            edgeRampTexture.wrapS = THREE.ClampToEdgeWrapping;
            edgeRampTexture.wrapT = THREE.ClampToEdgeWrapping;
            edgeRampTexture.colorSpace = THREE.NoColorSpace;
        }

        this.normalTexture = normalTexture;
        this.displacementTexture = displacementTexture;
        this.edgeNoiseTexture = edgeNoiseTexture;
        this.edgeRampTexture = edgeRampTexture;


        // ----------------------------------------
        // defines
        // ----------------------------------------

        const defines = {};

        if (caustics)
            defines.USE_CAUSTICS = 1;

        if (fresnel)
            defines.USE_FRESNEL = 1;

        if (playerWaves)
            defines.USE_PLAYER_WAVES = 1;

        if (displacement)
            defines.USE_DISPLACEMENT = 1;

        if (ssr)
            defines.USE_SSR = 1;


        // ----------------------------------------
        // material
        // ----------------------------------------

        this.material =
            new THREE.ShaderMaterial({

                defines,

                extensions: {
                    derivatives: true
                },

                vertexShader,
                fragmentShader,

                depthTest: true,
                depthWrite: true,

                side: THREE.DoubleSide,

                uniforms: {

                    uTime: {
                        value: 0
                    },

                    uResolution: {
                        value: new THREE.Vector2(width, height)
                    },

                    tSceneColor: {
                        value: this.target.texture
                    },

                    tSceneDepth: {
                        value: this.target.depthTexture
                    },

                    uProjection: {
                        value: new THREE.Matrix4()
                    },

                    uInvProjection: {
                        value: new THREE.Matrix4()
                    },

                    uCameraMatrixWorld: {
                        value: new THREE.Matrix4()
                    },


                    // COLOR

                    uAbsorptionColor: {
                        value: new THREE.Color(1.0, 0.35, 0.0)
                    },

                    uFresnelRadius: {
                        value: 2.0
                    },

                    uFresnelColor: {
                        value: new THREE.Color(0.0, 0.57, 0.72)
                    },

                    uRoughness: {
                        value: 0.15
                    },

                    uSpecular: {
                        value: 0.25
                    },

                    uDepthDistance: {
                        value: 25.0
                    },

                    uBeersLaw: {
                        value: 4.5
                    },


                    // DISPLACEMENT

                    tDisplacement: {
                        value: displacementTexture
                    },

                    uDisplacementStrength: {
                        value: 0.3
                    },

                    uDisplacementScrollSpeed: {
                        value: 0.1
                    },

                    uDisplacementScrollOffset: {
                        value: new THREE.Vector2(-0.2, 0.3)
                    },

                    uDisplacementScaleOffset: {
                        value: 0.5
                    },

                    uDisplacementScale: {
                        value: new THREE.Vector2(0.04, 0.04)
                    },


                    // EDGE

                    uEdgeThickness: {
                        value: 0.3
                    },

                    uEdgeSpeed: {
                        value: 0.35
                    },

                    uEdgeNoiseScale: {
                        value: new THREE.Vector2(0.4, 0.4)
                    },

                    tEdgeNoise: {
                        value: edgeNoiseTexture
                    },

                    tEdgeRamp: {
                        value: edgeRampTexture
                    },


                    // PLAYER

                    uPlayerPosition: {
                        value: new THREE.Vector3()
                    },

                    uInfluenceSize: {
                        value: 1.0
                    },

                    uPlayerWaveFrequency: {
                        value: 10.0
                    },

                    uPlayerWaveSpeed: {
                        value: 5.0
                    },


                    // CAUSTICS

                    uCausticSize: {
                        value: 2.0
                    },

                    uCausticRange: {
                        value: 40.0
                    },

                    uCausticStrength: {
                        value: 0.08
                    },


                    // SSR

                    uSSRStrength: {
                        value: 0.65
                    },

                    uSSRTravel: {
                        value: 100.0
                    },

                    uSSRStepNear: {
                        value: 1.0
                    },

                    uSSRStepFar: {
                        value: 5.0
                    },

                    uSSRTolerance: {
                        value: 1.0
                    },

                    uSSRSteps: {
                        value: 48
                    },


                    // NORMAL

                    tNormal: {
                        value: normalTexture
                    },

                    uRefractionStrength: {
                        value: 1.25
                    },

                    uNormalStrength: {
                        value: 1.0
                    },

                    uScrollSpeed: {
                        value: 0.3
                    },

                    uScrollOffset: {
                        value: new THREE.Vector2(0.1, -0.3)
                    },

                    uScaleOffset: {
                        value: 0.5
                    },

                    uNormalScale: {
                        value: new THREE.Vector2(0.1, 0.1)
                    },


                    // WIND

                    uWindIntensity: {
                        value: 0.5
                    },

                    uWindDirection: {
                        value: new THREE.Vector3(1, 0, 0.4)
                    },


                    // SIMPLE SUNLIGHT

                    uSunDirection: {
                        value: new THREE.Vector3(0.3, 1.0, 0.4).normalize()
                    },

                    uSunColor: {
                        value: new THREE.Color(1.0, 0.95, 0.85)
                    }
                }
            });


        // ----------------------------------------
        // mesh
        // ----------------------------------------

        const geometry =
            new THREE.PlaneGeometry(
                size,
                size,
                segments,
                segments
            );

        geometry.rotateX(-Math.PI / 2);

        this.mesh =
            new THREE.Mesh(
                geometry,
                this.material
            );

        this.mesh.frustumCulled = false;
    }


    update(timeSeconds) {

        const u = this.material.uniforms;

        u.uTime.value = timeSeconds;

        this.camera.updateMatrixWorld();

        u.uProjection.value.copy(
            this.camera.projectionMatrix
        );

        u.uInvProjection.value.copy(
            this.camera.projectionMatrixInverse
        );

        u.uCameraMatrixWorld.value.copy(
            this.camera.matrixWorld
        );
    }


    setPlayerPosition(position) {

        this.material.uniforms
            .uPlayerPosition
            .value
            .copy(position);
    }


    captureBackground() {

        const renderer = this.renderer;

        const oldTarget = renderer.getRenderTarget();

        const wasVisible = this.mesh.visible;

        // Critical:
        // don't let the water appear in its own
        // color/depth texture.
        this.mesh.visible = false;

        renderer.setRenderTarget(this.target);

        renderer.clear();

        renderer.render(this.scene, this.camera);

        renderer.setRenderTarget(oldTarget);

        this.mesh.visible = wasVisible;
    }


    resize() {

        const size =
            this.renderer
                .getDrawingBufferSize(
                    new THREE.Vector2()
                );

        const w = Math.max(1, size.x);
        const h = Math.max(1, size.y);

        this.target.setSize(w, h);

        this.material.uniforms
            .uResolution
            .value
            .set(w, h);
    }


    dispose() {

        this.mesh.geometry.dispose();

        this.material.dispose();

        this.target.dispose();
    }
}
