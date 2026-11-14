"""Prueba funcional de perfiles, GIS, proyectos, seguimiento y contingencias."""
import atexit
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import sys
from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4180/'
OUT = Path(__file__).resolve().parents[2] / 'evidencia/perfiles'
OUT.mkdir(parents=True, exist_ok=True)
KEY = 'agua-territorio:proyectos:v1'
report = {'url': BASE, 'checked_utc': datetime.now(timezone.utc).isoformat(), 'passed': False, 'checks': [], 'pageerrors': [], 'console_warnings': []}
atexit.register(lambda: (OUT / 'pruebas-perfiles.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8'))
old_hook = sys.excepthook
def failure(t, v, trace):
    report['failure'] = str(v)
    old_hook(t, v, trace)
sys.excepthook = failure

with sync_playwright() as pw:
    browser = pw.chromium.launch(args=['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    ctx = browser.new_context(viewport={'width': 1366, 'height': 900}, locale='es-MX')
    page = ctx.new_page()
    page.on('pageerror', lambda e: report['pageerrors'].append(str(e)))
    page.on('console', lambda m: report['console_warnings'].append(m.text) if m.type == 'warning' and 'GPU' not in m.text else None)
    report['index_sha256'] = hashlib.sha256(ctx.request.get(BASE).body()).hexdigest()
    hydro = ctx.request.get(BASE + 'data/unidades_hidricas.json').json()
    micro = hydro['adscripciones']['151100037']['microcuenca']['unidad']
    micro_nombre = next(f['properties']['nombre'] for f in hydro['features'] if f['properties']['id'] == micro)
    def nav(nombre):
        page.get_by_role('navigation', name='Secciones principales').get_by_role('button', name=nombre, exact=True).click()
    def perfil(nombre):
        page.get_by_role('button', name='Cambiar perfil', exact=True).click()
        page.get_by_role('button', name=re.compile(nombre)).click()
    def storage():
        return page.evaluate('(k) => JSON.parse(localStorage.getItem(k))', KEY)
    page.goto(BASE)
    page.get_by_role('heading', name='Entender el agua empieza en el territorio.').wait_for()
    page.screenshot(path=str(OUT / '01-panorama.png'))
    page.get_by_role('button', name=re.compile('Comenzar recorrido')).click()
    page.get_by_role('heading', name='¿Desde dónde quieres participar?').wait_for()
    expect(page.locator('.profile-options button')).to_have_count(5)
    page.get_by_role('button', name=re.compile('Organizaciones que instalan')).click()
    page.screenshot(path=str(OUT / '02-perfiles-desktop.png'))
    page.get_by_role('button', name='Explorar territorio →').first.click()
    page.locator('.maplibregl-canvas').wait_for()
    expect(page.locator('.tour-count')).to_contain_text('2 / 5')
    page.locator('.variable-picker summary').click()
    expect(page.get_by_role('checkbox', name=re.compile('Sin agua entubada'))).to_be_checked()
    page.get_by_role('checkbox', name=re.compile('Sin drenaje')).check()
    assert 'sin_drenaje' in page.url
    page.locator('.variable-picker summary').click()
    scales = page.get_by_role('group', name='Escala territorial')
    scales.get_by_role('button', name=re.compile('Microcuencas')).click()
    page.get_by_role('application', name='Mapa de microcuencas modeladas').wait_for()
    expect(page.locator('.hydro-unit-list button')).to_have_count(11)
    page.get_by_role('button', name=re.compile(re.escape(micro_nombre))).click()
    page.wait_for_timeout(900)
    page.screenshot(path=str(OUT / '03-microcuencas-desktop.png'))
    page.get_by_role('button', name='Abrir línea base y ficha →').click()
    page.get_by_role('heading', name=micro_nombre, exact=True).wait_for()
    expect(page.get_by_text('No es una delimitación oficial mexicana.', exact=False)).to_be_visible()
    page.pdf(path=str(OUT / 'ficha-territorial.pdf'), print_background=True, prefer_css_page_size=True)
    report['checks'].append('5 perfiles, recorrido, variables graduales, 11 unidades de detalle y ficha imprimible')
    page.get_by_role('button', name='← Volver al mapa').click()
    scales.get_by_role('button', name=re.compile('Cuencas', re.I)).first.click()
    # Selección exacta para evitar confundir Cuencas con Microcuencas.
    page.get_by_role('group', name='Escala territorial').locator('button').nth(1).click()
    page.get_by_role('application', name='Mapa de cuencas modeladas').wait_for()
    expect(page.locator('.hydro-unit-list button')).to_have_count(1)
    nav('Prioridades')
    expect(page.get_by_text('Sin comparación', exact=True)).to_be_visible()
    page.locator('.unit-weights summary').click()
    page.get_by_role('slider', name='Peso de Sin agua entubada', exact=True).fill('70')
    assert page.evaluate('JSON.parse(localStorage.getItem("agua-territorio:pesos:v1")).pesos.sin_agua_entubada') == 70
    page.reload()
    page.locator('.unit-weights summary').click()
    expect(page.locator('.unit-weights')).to_contain_text('88 %')
    page.get_by_role('button', name='Restablecer pesos', exact=True).click()
    report['checks'].append('Cuenca única: línea base disponible y ausencia de clasificación engañosa')
    # Recorrido completo para ambas experiencias.
    for nombre in ['Organizaciones que instalan', 'Comités de agua']:
        nav('Panorama')
        page.get_by_role('button', name=re.compile('Comenzar recorrido')).click()
        page.get_by_role('button', name=re.compile(nombre)).click()
        for accion in ['Explorar territorio →', 'Ver proyecto de ejemplo →', 'Ver seguimiento →', 'Ver usos y futuro →', 'Terminar recorrido']:
            page.locator('.tour-actions').get_by_role('button', name=accion, exact=True).click()
        page.get_by_role('heading', name='Entender el agua empieza en el territorio.').wait_for()
    report['checks'].append('Recorrido de cinco pasos completado en gestión y consulta comunitaria')
    perfil('Fundaciones, empresas')
    nav('Proyectos')
    expect(page.locator('.project-card')).to_have_count(3)
    page.screenshot(path=str(OUT / '04-proyectos-desktop.png'))
    page.get_by_role('button', name='Registrar proyecto', exact=True).click()
    page.get_by_label('Nombre del proyecto', exact=True).fill('Proyecto QA local')
    page.get_by_label('Entidad responsable', exact=True).fill('Entidad de prueba local')
    page.get_by_label('Descripción del proyecto', exact=True).fill('Prueba funcional sin intervención ni fondos reales.')
    page.get_by_role('button', name='Agregar componente', exact=True).click()
    c1 = page.get_by_role('group', name='Componente 1', exact=True)
    c1.get_by_label('Personas objetivo', exact=True).fill('100')
    c1.get_by_label('Viviendas objetivo', exact=True).fill('25')
    page.get_by_role('button', name='Agregar componente', exact=True).click()
    c2 = page.get_by_role('group', name='Componente 2', exact=True)
    c2.get_by_role('combobox', name='Tipo de intervención', exact=True).select_option('Almacenamiento')
    c2.get_by_label('Personas objetivo', exact=True).fill('100')
    c2.get_by_label('Viviendas objetivo', exact=True).fill('25')
    for indice in [1, 2]:
        page.get_by_role('button', name='Agregar aporte financiero', exact=True).click()
        a = page.get_by_role('group', name=f'Aporte {indice}', exact=True)
        a.get_by_label('Aportante', exact=True).fill(f'Aportante QA {indice}')
        a.get_by_label('Monto en MXN', exact=True).fill('1234.50')
        a.get_by_role('combobox', name='Estado del aporte', exact=True).select_option('Solicitado')
        a.get_by_role('checkbox', name='1. Captación de lluvia', exact=True).check()
    page.get_by_role('button', name='Agregar indicador', exact=True).click()
    indicador = page.get_by_role('group', name='Indicador 1', exact=True)
    for label, valor in [('Nombre del indicador', 'Sistemas habilitados QA'), ('Unidad de medida', 'sistemas'), ('Universo observado', 'Las mismas 25 viviendas del ejemplo QA'), ('Método y definición', 'Conteo acumulado con definición estable'), ('Fuente del indicador', 'Registro QA sin verificar')]:
        indicador.get_by_label(label, exact=True).fill(valor)
    indicador.get_by_label('Meta del indicador', exact=True).fill('25')
    for i, fecha, valor in [(1, '2026-10-01', '0'), (2, '2026-11-01', '5'), (3, '2026-11-14', '')]:
        indicador.get_by_role('button', name='Agregar medición', exact=True).click()
        indicador.get_by_label(f'Fecha de medición {i}', exact=True).fill(fecha)
        if valor: indicador.get_by_label(f'Valor de medición {i}', exact=True).fill(valor)
    page.get_by_role('button', name='Guardar proyecto', exact=True).click()
    expect(page.get_by_role('status').filter(has_text='Proyecto guardado')).to_be_visible()
    p = next(p for p in storage()['proyectos'] if p['nombre'] == 'Proyecto QA local')
    assert len(p['componentes']) == 2 and len(p['aportes']) == 2 and p['componentes'][0]['personas'] == 100
    assert p['aportes'][0]['componentes'] == p['aportes'][1]['componentes']
    page.reload()
    page.get_by_role('heading', name='Proyecto QA local', exact=True).wait_for()
    page.get_by_role('button', name='Ver seguimiento →', exact=True).click()
    expect(page.get_by_text('No calculable', exact=True)).to_be_visible()
    expect(page.get_by_role('cell', name='Sin dato', exact=True)).to_be_visible()
    assert next(x for x in storage()['proyectos'] if x['id'] == p['id'])['indicadores'][0]['mediciones'][2]['valor'] is None
    page.screenshot(path=str(OUT / '05-seguimiento-desktop.png'))
    report['checks'].append('Alta persistente: 2 intervenciones, 2 aportes vinculados, base cero y medición faltante sin inventar resultados')
    perfil('Comités de agua')
    nav('Proyectos')
    expect(page.get_by_role('button', name='Registrar proyecto', exact=True)).to_have_count(0)
    expect(page.locator('.project-card')).to_have_count(3)
    page.goto(BASE + '#/proyectos?proyecto=' + p['id'])
    expect(page.get_by_text('Ese proyecto no está disponible', exact=False)).to_be_visible()
    report['checks'].append('Consulta comunitaria: solo proyectos visibles; sin controles de gestión ni apertura directa de borrador')
    perfil('Gobiernos y organismos')
    page.goto(BASE + '#/proyectos?proyecto=' + p['id'])
    page.get_by_role('button', name='Editar proyecto', exact=True).click()
    page.get_by_role('checkbox', name='Mostrar este proyecto en la vista comunitaria de esta demo', exact=True).check()
    page.get_by_role('button', name='Guardar proyecto', exact=True).click()
    with page.expect_download() as downloaded:
        page.get_by_role('button', name='Exportar proyectos JSON', exact=True).click()
    file = OUT / 'proyectos-qa-exportados.json'; downloaded.value.save_as(str(file))
    exported = json.loads(file.read_text(encoding='utf-8'))
    assert len(exported['proyectos']) == 4
    page.locator('input[type=file]').set_input_files(str(file))
    expect(page.get_by_role('alert')).to_contain_text('ya existe')
    assert len(storage()['proyectos']) == 4
    copia = json.loads(json.dumps(exported['proyectos'][0]))
    copia['id'] = 'qa-importado'; copia['nombre'] = 'Proyecto importado QA'
    page.locator('input[type=file]').set_input_files({'name': 'proyecto-nuevo.json', 'mimeType': 'application/json', 'buffer': json.dumps({'schemaVersion': 1, 'proyectos': [copia]}).encode('utf-8')})
    expect(page.get_by_role('status')).to_contain_text('Importación completada')
    assert len(storage()['proyectos']) == 5
    page.get_by_role('button', name='Archivar proyecto', exact=True).click()
    page.get_by_role('checkbox', name='Incluir proyectos archivados', exact=True).check()
    expect(page.locator('.project-card')).to_have_count(5)
    report['checks'].append('Exportación JSON válida, conflicto de importación rechazado sin cambios y archivo reversible')
    # Vista móvil y cambios de escala con el mismo contenido.
    mobile = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, locale='es-MX')
    mp = mobile.new_page(); mp.on('pageerror', lambda e: report['pageerrors'].append(str(e)))
    mp.goto(BASE + '#/perfiles')
    mp.get_by_role('heading', name='¿Desde dónde quieres participar?').wait_for()
    mp.screenshot(path=str(OUT / '06-perfiles-movil.png'))
    mp.get_by_role('button', name=re.compile('Personas que cuidan')).click()
    mp.get_by_role('button', name='Explorar territorio →', exact=True).click()
    mp.get_by_role('group', name='Escala territorial').locator('button').nth(2).click()
    mp.get_by_role('application', name='Mapa de microcuencas modeladas').wait_for()
    mp.wait_for_timeout(800); mp.screenshot(path=str(OUT / '07-microcuencas-movil.png'))
    for ruta in ['proyectos', 'seguimiento', 'prioridades', 'fuentes']:
        mp.goto(BASE + '#/' + ruta)
        mp.locator('main h1').wait_for()
        assert mp.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert mp.locator('main').evaluate('(e) => e.scrollWidth <= e.clientWidth')
    mp.goto(BASE + '#/proyectos')
    mp.locator('.project-card').first.wait_for(); mp.screenshot(path=str(OUT / '08-proyectos-movil.png'))
    report['checks'].append('Móvil 390x844: perfiles, mapa y secciones sin desborde horizontal')
    # Arranque nuevo sin caché, sin red externa.
    offline = browser.new_context(service_workers='block', viewport={'width': 1366, 'height': 900})
    offline.route('**/*', lambda r: r.continue_() if r.request.url.startswith(BASE) else r.abort())
    op = offline.new_page(); op.on('pageerror', lambda e: report['pageerrors'].append(str(e)))
    op.goto(BASE + '#/mapa?escala=microcuenca')
    op.get_by_role('application', name='Mapa de microcuencas modeladas').wait_for()
    op.locator('.hydro-unit-list button').first.wait_for()
    op.goto(BASE + '#/seguimiento'); op.locator('.tracking-chart').wait_for()
    assert offline.request.get(BASE + 'licencias/HydroSHEDS_TechDoc_v1_4.pdf').status == 200
    report['checks'].append('Sin red externa desde primera apertura: geometrías, proyectos, seguimiento y licencia incluidos')
    # Almacenamiento corrupto: no se borra y no se anuncia un guardado falso.
    bad = browser.new_context(service_workers='block')
    bad.add_init_script(f'localStorage.setItem({json.dumps(KEY)}, "contenido-invalido")')
    bp = bad.new_page(); bp.goto(BASE + '#/proyectos')
    expect(bp.get_by_role('alert')).to_contain_text('Se conserva cualquier contenido previo')
    assert bp.evaluate('(k) => localStorage.getItem(k)', KEY) == 'contenido-invalido'
    quota = browser.new_context(service_workers='block')
    quota.add_init_script('Storage.prototype.setItem = function(){throw new DOMException("cuota", "QuotaExceededError")}')
    qp = quota.new_page(); qp.goto(BASE + '#/proyectos')
    expect(qp.get_by_role('alert')).to_contain_text('No se pudo leer o inicializar')
    no_save = browser.new_context(service_workers='block')
    no_save.add_init_script('localStorage.setItem("agua-territorio:perfil:v1", "organizacion")')
    sp = no_save.new_page(); sp.goto(BASE + '#/proyectos')
    sp.get_by_role('button', name='Registrar proyecto', exact=True).click()
    sp.get_by_label('Nombre del proyecto', exact=True).fill('No debe guardarse')
    sp.get_by_label('Entidad responsable', exact=True).fill('QA')
    sp.evaluate('() => { Storage.prototype.setItem = function(){throw new DOMException("cuota", "QuotaExceededError")} }')
    sp.get_by_role('button', name='Guardar proyecto', exact=True).click()
    expect(sp.get_by_role('alert')).to_contain_text('No se guardaron los cambios')
    expect(sp.get_by_role('status').filter(has_text='Proyecto guardado')).to_have_count(0)
    assert len(sp.evaluate('(k) => JSON.parse(localStorage.getItem(k)).proyectos', KEY)) == 3
    report['checks'].append('Almacenamiento corrupto o bloqueado: error explícito y sin sobrescritura ni falso guardado')
    # Caché PWA completamente sin red.
    page.goto(BASE)
    page.evaluate('navigator.serviceWorker.ready')
    page.reload(); page.wait_for_function('navigator.serviceWorker.controller !== null')
    ctx.set_offline(True)
    page.goto(BASE + '#/mapa?escala=microcuenca')
    page.get_by_role('application', name='Mapa de microcuencas modeladas').wait_for()
    page.goto(BASE + '#/seguimiento'); page.locator('.tracking-chart').wait_for()
    ctx.set_offline(False)
    report['checks'].append('PWA instalada: mapa y seguimiento tras recarga con red completamente desconectada')
    page.goto(BASE + '#/seguimiento?proyecto=demo-proyecto-localidad')
    page.locator('.tracking-chart').wait_for()
    page.locator('main').evaluate('(e) => e.scrollTop = 110')
    page.screenshot(path=str(OUT / '09-seguimiento-ejemplo.png'))
    assert not report['pageerrors'], report['pageerrors']
    report['passed'] = True
    browser.close()
print(json.dumps(report, ensure_ascii=True, indent=2))
