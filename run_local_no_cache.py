import os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

if __name__ == "__main__":
    port = 8080
    print(f"ReachEmpireBot no-cache server: http://127.0.0.1:{port}/")
    print(f"Serving folder: {ROOT}")
    ThreadingHTTPServer(("0.0.0.0", port), NoCacheHandler).serve_forever()
