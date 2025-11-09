#!/usr/bin/env python3
"""
Simple HTTP server for serving React SPA with proper routing support.
Serves index.html for all non-file routes to support client-side routing.
"""
import http.server
import socketserver
import os
import sys
from urllib.parse import urlparse

class SPAHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disable caching for development
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # If it's an API request, return 404 (APIs should be on different servers)
        if path.startswith('/api/'):
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error": "API endpoints are served by backend servers"}')
            return
        
        # Check if the requested path is a file that exists
        file_path = path.lstrip('/')
        if file_path and os.path.isfile(file_path):
            # Serve the actual file
            super().do_GET()
        else:
            # For all other paths (including routes like /epub-to-audiobook),
            # serve index.html (SPA routing)
            self.path = '/index.html'
            super().do_GET()

    def log_message(self, format, *args):
        # Custom logging to show what's being served
        if args[0].startswith('GET /api/'):
            return  # Don't log API 404s
        super().log_message(format, *args)


def main():
    PORT = 8080
    
    # Allow port to be specified as command-line argument
    if len(sys.argv) > 1:
        try:
            PORT = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port number: {sys.argv[1]}. Using default port {PORT}")
    
    # Change to the directory containing this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    try:
        with socketserver.TCPServer(("", PORT), SPAHTTPRequestHandler) as httpd:
            print(f"========================================")
            print(f"Frontend Server Running")
            print(f"========================================")
            print(f"Serving at: http://localhost:{PORT}")
            print(f"Directory: {script_dir}")
            print(f"Press CTRL+C to stop")
            print(f"========================================")
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 10048:  # Port already in use
            print(f"ERROR: Port {PORT} is already in use.")
            print(f"Please stop the other server or use a different port:")
            print(f"  python frontend-server.py {PORT + 1}")
            sys.exit(1)
        else:
            raise


if __name__ == "__main__":
    main()


