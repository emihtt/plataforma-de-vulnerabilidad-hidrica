import { useEffect, useState } from 'react'
import { useEstado } from '../lib/contexto'
import { rutaDatos } from '../lib/datos'
import { num } from '../lib/formato'

type Geometria = { type: string; coordinates: number[][][] }

/** Vista SVG con las mismas geometrías públicas del mapa; no requiere teselas externas. */
function Territorio() {
  const { datos, abrirFicha } = useEstado()
  const [capas, setCapas] = useState<{ geometry: Geometria; properties: { capa: string } }[]>([])
  useEffect(() => {
    const control = new AbortController()
    fetch(rutaDatos('contexto.geojson'), { signal: control.signal }).then((r) => r.json()).then((g) => setCapas(g.features)).catch(() => undefined)
    return () => control.abort()
  }, [])
  const xy = ([lon, lat]: number[]) => [28 + (lon + 100.27) / 0.32 * 484, 397 - (lat - 19.055) / 0.24 * 365]
  const path = (rings: number[][][]) => rings.map((r) => r.map((p, i) => `${i ? 'L' : 'M'}${xy(p).map((n) => n.toFixed(1)).join(',')}`).join(' ') + 'Z').join(' ')
  return <figure className="territory-figure">
    <svg viewBox="0 0 550 430" role="img" aria-label="Contorno de Valle de Bravo, cuerpos de agua y ubicación de las 72 localidades censales">
      {capas.filter((f) => f.geometry.type === 'Polygon' && ['limite', 'agua'].includes(f.properties.capa)).map((f, i) => <path key={i} d={path(f.geometry.coordinates)} fill={f.properties.capa === 'agua' ? '#9bd1d3' : '#f7faf8'} stroke={f.properties.capa === 'agua' ? '#9bd1d3' : '#1a6155'} strokeWidth={f.properties.capa === 'agua' ? 0.5 : 1.5} fillRule="evenodd" />)}
      {datos.localidades.map((l) => { const [cx, cy] = xy([l.lon, l.lat]); return <circle key={l.cvegeo} cx={cx} cy={cy} r={l.cvegeo === '151100037' ? 5 : 2.8} fill={l.enmascarada ? '#fff' : '#348f82'} stroke={l.enmascarada ? '#687b75' : '#fff'} strokeWidth="0.8" /> })}
    </svg>
    <figcaption>{num(datos.resumen.censo.localidades_total)} localidades · Censo 2020 <small className="block text-[11px]">Contorno y cuerpos de agua: © colaboradores de OpenStreetMap</small><button type="button" onClick={() => abrirFicha('151100037')}>Conocer San Gabriel Ixtla ↗</button></figcaption>
  </figure>
}

export default function Panorama() {
  const { datos, ir, iniciarRecorrido } = useEstado()
  const c = datos.resumen.censo
  return <div className="panorama-page">
    <section className="intro-hero">
      <div className="hero-copy">
        <h1>Entender el agua empieza en el territorio.</h1>
        <p>Un primer mapa para conversar sobre las necesidades de agua en las comunidades de Valle de Bravo.</p>
        <div className="hero-actions">
          <button type="button" className="primary-action" onClick={iniciarRecorrido}>Comenzar recorrido · 3 min <span aria-hidden>→</span></button>
          <button type="button" className="secondary-action" onClick={() => ir('mapa')}>Explorar el mapa</button>
        </div>
      </div>
      <Territorio />
    </section>
    <section className="stat-band" aria-label="Línea base censal">
      <div><strong className="cifra">{num(c.viv_sin_agua)}</strong><span>viviendas sin agua entubada</span><small>En localidades con datos de servicios · INEGI 2020</small></div>
      <div><strong className="cifra">{num(c.localidades_con_datos)} <em>de</em> {num(c.localidades_total)}</strong><span>localidades con datos de servicios</span><small>{num(c.localidades_enmascaradas)} sin información por confidencialidad</small></div>
      <div><strong className="cifra">2020</strong><span>año de la información censal</span><small>Una línea base para contrastar con la realidad actual</small></div>
    </section>
    <section className="itinerary" aria-label="Qué puedes explorar">
      {[['Leer el territorio', 'Ubica las carencias y sus fuentes.', 'mapa'], ['Abrir una comunidad', 'Conoce los datos y lo que aún falta saber.', 'prioridades'], ['Imaginar posibilidades', 'Revisa posibles usos y las siguientes etapas.', 'usos']].map(([titulo, texto, ruta], i) => <button key={titulo} type="button" onClick={() => ir(ruta as 'mapa' | 'prioridades' | 'usos')}><span className="step-number">{i + 1}</span><span><strong>{titulo}</strong><span>{texto}</span></span><span className="step-arrow" aria-hidden>→</span></button>)}
    </section>
    <section className="honest-intro">
      <div><h2>Un punto de partida, con límites claros.</h2><p>Esta herramienta propone una prioridad <strong>relativa</strong> entre localidades a partir de datos públicos. Ayuda a preparar preguntas y conversaciones; requiere validación con las comunidades antes de orientar decisiones reales.</p><button type="button" className="text-action" onClick={() => ir('fuentes')}>Consultar fuentes, supuestos y límites →</button></div>
      <dl className="maturity-list"><div><dt>Disponible</dt><dd>Mapa y datos públicos de Valle de Bravo</dd></div><div><dt>Prototipo</dt><dd>Priorización y simulación de captación</dd></div><div><dt>A futuro</dt><dd>Observatorio ciudadano del agua para México</dd></div></dl>
    </section>
    <footer className="site-footer"><span>Plataforma de Vulnerabilidad Hídrica · Regenera Consultora</span><button type="button" onClick={() => ir('acerca')}>Acerca del proyecto ↗</button></footer>
  </div>
}
