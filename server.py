import http.server
import socketserver
import sys
import os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

class ThreadingTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.extensions_map.update({
            '.js': 'application/javascript',
            '.mjs': 'application/javascript',
            '.glb': 'model/gltf-binary',
            '.gltf': 'model/gltf+json',
            '.css': 'text/css',
            '.html': 'text/html',
        })

    def translate_path(self, path):
        # Fallback for /flight_models/ -> check public/flight_models/
        p = super().translate_path(path)
        if not os.path.exists(p) and '/flight_models/' in path:
            alt = os.path.join(os.getcwd(), 'public', path.lstrip('/'))
            if os.path.exists(alt):
                return alt
        return p

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    with ThreadingTCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
        print(f"Serving at port {PORT} with no-cache headers. Access at http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
        httpd.server_close()
