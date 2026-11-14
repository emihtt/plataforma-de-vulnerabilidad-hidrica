"""Valida dist con rutas y errores 404 reales de un sitio de proyecto de GitHub Pages.

Requiere npm run build:pages y los requisitos de scripts/requirements-test.txt.
No modifica los datos publicados ni necesita conexiones a servicios externos.
"""
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from threading import Thread
from urllib.parse import unquote, urljoin, urlsplit

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
PREFIX = '/plataforma-de-vulnerabilidad-hidrica/'
OUT = Path(os.environ.get('QA_OUTPUT_DIR', str(ROOT.parent / 'evidencia/pages')))
OUT.mkdir(parents=True, exist_ok=True)
KEY = 'agua-territorio:proyectos:v1'
REPORT = {'passed': False, 'browser': 'Playwright Chromium', 'browser_fallback': 'Browser plugin not available', 'checks': [], 'pageerrors': [], 'http_errors': []}
DEPLOYMENT = {'revision': 1}


class PagesHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if path == PREFIX.rstrip('/'):
            self.send_response(301)
            self.send_header('Location', PREFIX)
            self.end_headers()
            return
        if not path.startswith(PREFIX):
            self.send_error(404)
            return
        if path == PREFIX + 'sw.js':
            body = (DIST / 'sw.js').read_bytes() + f'\n// QA deployment {DEPLOYMENT["revision"]}\n'.encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/javascript')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def translate_path(self, path):
        path = unquote(urlsplit(path).path)
        candidate = (DIST / path.removeprefix(PREFIX)).resolve()
        return str(candidate if candidate.is_relative_to(DIST.resolve()) else DIST / '__404__')

    def list_directory(self, _path):
        self.send_error(404)

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()


@contextmanager
def server():
    httpd = ThreadingHTTPServer(('127.0.0.1', 0), partial(PagesHandler, directory=str(DIST)))
    thread = Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    try:
        yield f'http://127.0.0.1:{httpd.server_port}{PREFIX}'
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join(timeout=5)


def run(base):
    REPORT['url'] = base
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        context = browser.new_context(viewport={'width': 1366, 'height': 900}, locale='es-MX', timezone_id='Asia/Tokyo')
        # Respuesta negativa controlada: el piloto debe abrir sin depender de la API de lluvia.
        context.route('https://**/*', lambda route: route.fulfill(status=503, body='Servicio externo no disponible'))
        page = context.new_page()
        external_requests = []
        page.on('request', lambda r: external_requests.append(r.url) if r.url.startswith('https://') else None)
        page.on('pageerror', lambda err: REPORT['pageerrors'].append(str(err)))
        page.on('response', lambda r: REPORT['http_errors'].append({'status': r.status, 'url': r.url}) if r.status >= 400 and r.url.startswith(base) else None)
        page.goto(base)
        expect(page).to_have_title(re.compile('Plataforma de Agua'))
        page.get_by_role('heading', name='Entender el agua empieza en el territorio.').wait_for()
        assert context.request.get(urljoin(base, '/data/resumen.json')).status == 404
        assert context.request.get(base + '.nojekyll').status == 200
        manifest = context.request.get(base + 'manifest.webmanifest').json()
        assert urljoin(base, manifest['scope']) == base
        assert urljoin(base, manifest['start_url']) == base
        for icon in manifest['icons']:
            assert context.request.get(urljoin(base, icon['src'])).status == 200
        for route in ['perfiles', 'mapa', 'prioridades', 'proyectos', 'seguimiento', 'agua', 'fuentes', 'usos', 'acerca']:
            if route == 'agua':
                assert not external_requests, external_requests
            page.goto(base + '#/' + route)
            page.locator('main h1').wait_for()
            assert 'No se pudo abrir esta vista' not in page.locator('body').inner_text()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.goto(base + '#/mapa?loc=151100037')
        page.get_by_role('dialog').wait_for()
        page.get_by_role('button', name='Cerrar', exact=True).click()
        expect(page.get_by_role('dialog')).to_have_count(0)
        page.screenshot(path=str(OUT / 'pages-mapa-desktop.png'))
        REPORT['checks'].append('Subdirectorio, rutas hash, ficha enlazada, manifest, iconos y worker sin errores 404')
        REPORT['checks'].append('Sin consultas externas al explorar el piloto; meteorología solo al abrir contexto hídrico')

        damaged = browser.new_context(service_workers='block', timezone_id='Asia/Tokyo')
        damaged.route('https://**/*', lambda route: route.fulfill(status=503, body='No disponible'))
        damaged.add_init_script('''if(localStorage.getItem('plataforma-agua:lluvia:v1')===null) localStorage.setItem('plataforma-agua:lluvia:v1', '{}');
          localStorage.setItem('agua-territorio:pesos:v1', JSON.stringify({schemaVersion:1,pesos:{sin_agua_entubada:0,marginacion:100,aislamiento:0,sin_almacenamiento:0,sin_drenaje:0,hogares_indigenas:0}}));''')
        dp = damaged.new_page()
        dp.on('pageerror', lambda err: REPORT['pageerrors'].append(str(err)))
        dp.goto(base + '#/prioridades')
        dp.locator('main h1').wait_for()
        assert '66' in dp.locator('main').inner_text()
        assert dp.evaluate('localStorage.getItem("plataforma-agua:lluvia:v1")') == '{}'
        dp.screenshot(path=str(OUT / 'pages-prioridades-recuperadas.png'))
        REPORT['checks'].append('Lluvia dañada y pesos de variables inactivas: aplicación y 66 prioridades disponibles')

        # El respaldo meteorológico conserva la fecha original tras un fallo de consulta.
        # Es una serie sintética de QA, no una cifra incorporada a los datos del piloto.
        dp.evaluate('''() => localStorage.setItem('plataforma-agua:lluvia:v1', JSON.stringify({
          consultado:'2026-11-14T12:00:00Z',dias:Array.from({length:44},(_,i)=>({
          fecha:new Date(Date.UTC(2026,9,1+i)).toISOString().slice(0,10),mm:1,prob:null,tmax:null,tmin:null}))}))''')
        dp.goto(base + '#/agua')
        dp.reload()
        expect(dp.get_by_text('Se muestra la copia guardada', exact=False)).to_be_visible()
        assert dp.evaluate('JSON.parse(localStorage.getItem("plataforma-agua:lluvia:v1")).consultado') == '2026-11-14T12:00:00Z'
        REPORT['checks'].append('Respaldo de lluvia conserva su fecha original y se identifica como copia guardada')

        failed = browser.new_context(service_workers='block')
        failed.route('**/data/resumen.json', lambda route: route.fulfill(status=404, body='No encontrado'))
        fp = failed.new_page()
        fp.goto(base)
        expect(fp.get_by_role('alert')).to_contain_text('No se pudieron cargar los datos del piloto')
        failed.unroute('**/data/resumen.json')
        fp.get_by_role('button', name='Volver a intentar').click()
        fp.get_by_role('heading', name='Entender el agua empieza en el territorio.').wait_for()
        REPORT['checks'].append('Archivo obligatorio ausente: error comprensible y reintento funcional')

        # Dos pestañas no pueden sobrescribir silenciosamente los proyectos de la otra.
        page.evaluate('localStorage.setItem("agua-territorio:perfil:v1", "organizacion")')
        page.goto(base + '#/proyectos')
        page.reload()
        page.get_by_role('button', name='Registrar proyecto', exact=True).click()
        page.get_by_label('Nombre del proyecto', exact=True).fill('Edición en pestaña A')
        page.get_by_label('Entidad responsable', exact=True).fill('Prueba local')
        second = context.new_page()
        second.goto(base + '#/proyectos')
        second.locator('.project-card').first.wait_for()
        second.evaluate('''k => {const v=JSON.parse(localStorage.getItem(k));v.proyectos[0].nombre='Cambio conservado en pestaña B';localStorage.setItem(k,JSON.stringify(v))}''', KEY)
        page.get_by_role('button', name='Guardar proyecto', exact=True).click()
        expect(page.get_by_role('alert')).to_contain_text('cambiaron en otra pestaña')
        assert page.evaluate('k => JSON.parse(localStorage.getItem(k)).proyectos[0].nombre', KEY) == 'Cambio conservado en pestaña B'
        page.get_by_role('button', name='Cancelar edición').click()
        second.close()
        REPORT['checks'].append('Ediciones concurrentes: conflicto visible y datos de la otra pestaña preservados')

        page.evaluate('navigator.serviceWorker.ready')
        page.reload()
        page.wait_for_function('navigator.serviceWorker.controller !== null')
        page.get_by_role('button', name='Registrar proyecto', exact=True).click()
        page.get_by_label('Nombre del proyecto', exact=True).fill('Borrador sin perder')
        DEPLOYMENT['revision'] = 2
        page.evaluate('navigator.serviceWorker.getRegistration().then(r => r.update())')
        page.get_by_role('status', name='Actualización disponible').wait_for()
        expect(page.get_by_label('Nombre del proyecto', exact=True)).to_have_value('Borrador sin perder')
        page.get_by_role('button', name='Actualizar y recargar').click()
        expect(page.get_by_role('alert')).to_contain_text('Guarda o cancela')
        page.screenshot(path=str(OUT / 'pages-actualizacion-protegida.png'))
        page.get_by_role('button', name='Cancelar edición').click()
        page.get_by_role('button', name='Actualizar y recargar').click()
        page.locator('.project-card').first.wait_for()
        expect(page.get_by_role('status', name='Actualización disponible')).to_have_count(0)
        REPORT['checks'].append('Actualización PWA real: espera a la persona, protege el borrador y recarga al aceptar')
        context.set_offline(True)
        page.goto(base + '#/mapa?escala=microcuenca')
        page.get_by_role('application', name='Mapa de microcuencas modeladas').wait_for()
        page.reload()
        page.get_by_role('application', name='Mapa de microcuencas modeladas').wait_for()
        page.screenshot(path=str(OUT / 'pages-sin-internet.png'))
        context.set_offline(False)
        REPORT['checks'].append('PWA bajo subdirectorio: mapa y recarga sin conexión')
        assert not REPORT['pageerrors'], REPORT['pageerrors']
        assert not REPORT['http_errors'], REPORT['http_errors']
        browser.close()
    # Reutiliza el recorrido completo de gestión, consulta, móvil e importación/exportación.
    subprocess.run([sys.executable, str(ROOT / 'scripts/qa_perfiles.py'), base], check=True,
                   env={**os.environ, 'QA_OUTPUT_DIR': str(OUT / 'recorrido')})
    REPORT['checks'].append('Recorrido completo de perfiles, GIS, proyectos, indicadores, respaldos y móvil')
    REPORT['passed'] = True


if __name__ == '__main__':
    try:
        if not (DIST / 'index.html').is_file():
            raise RuntimeError('Falta dist/index.html; ejecuta npm run build:pages primero.')
        with server() as base_url:
            run(base_url)
    except Exception as exc:
        REPORT['failure'] = str(exc)
        raise
    finally:
        (OUT / 'pruebas-pages.json').write_text(json.dumps(REPORT, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps(REPORT, ensure_ascii=True, indent=2))
