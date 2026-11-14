"""Servidor de la demo: solo localhost, sin instalar dependencias ni descargar datos."""
import argparse
import functools
import http.server
import json
import threading
import urllib.request
import webbrowser
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--no-browser', action='store_true')
    args = ap.parse_args()
    root = Path(__file__).resolve().parent
    site = root / 'sitio'
    if not (site / 'index.html').is_file():
        raise SystemExit('Falta la carpeta sitio. Extrae el ZIP completo antes de abrir la demo.')
    marker = json.loads((site / 'demo-id.json').read_text(encoding='utf-8'))

    class Handler(http.server.SimpleHTTPRequestHandler):
        extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript', '.geojson': 'application/geo+json', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml'}
        def log_message(self, *_):
            pass
        def end_headers(self):
            self.send_header('Cache-Control', 'no-cache')
            super().end_headers()

    handler = functools.partial(Handler, directory=str(site))
    server = None
    for port in range(8788, 8808):
        try:
            server = http.server.ThreadingHTTPServer(('127.0.0.1', port), handler)
            break
        except OSError:
            # Reutilizar solo una instancia de ESTA candidata; no interferir con otros servicios.
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{port}/demo-id.json', timeout=.4) as r:
                    if json.load(r) == marker:
                        url = f'http://127.0.0.1:{port}/'
                        print('La demo ya esta abierta:', url)
                        if not args.no_browser:
                            webbrowser.open(url)
                        return
            except Exception:
                pass
    if server is None:
        raise SystemExit('No se encontro un puerto local libre entre 8788 y 8807.')
    url = f'http://127.0.0.1:{port}/'
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    print('\nDEMO VALLE DE BRAVO\n' + url + '\n\nDeja esta ventana abierta durante la demo. Ctrl+C para cerrarla.\nEl mapa, las fichas y el recorrido no requieren internet.\n', flush=True)
    if not args.no_browser:
        webbrowser.open(url)
    try:
        thread.join()
    except KeyboardInterrupt:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
