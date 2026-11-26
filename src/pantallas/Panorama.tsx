import { useEffect, useState } from 'react'
import { useEstado } from '../lib/contexto'
import { rutaDatos } from '../lib/datos'
import { Estimacion, Pie, Semaforo, Supuesto, Tarjeta } from '../componentes/ui'
import { fechaCorta, fechaLarga, num, plural } from '../lib/formato'
import { senal } from '../lib/lluvia'

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
  const { datos, ir, iniciarRecorrido, lluvia } = useEstado()
  const c = datos.resumen.censo
  const presa = datos.presa
  const ultimo = presa?.serie[presa.serie.length - 1]
  const u = datos.resumen.parametros.semaforo
  const r = lluvia.resumen
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
    <section className="panorama-linea-base" aria-label="Presa y viviendas sin agua entubada">
      <Tarjeta>
        <p className="m-0 text-[20px] font-bold leading-snug">
          {ultimo ? <>Último registro de la presa: <strong className="cifra font-extrabold text-verde-texto">{ultimo.porcentaje.toLocaleString('es-MX')} %</strong> ({fechaLarga(ultimo.fecha)}). </> : <>Nivel de la presa: sin dato. </>}
          En el municipio, <strong className="cifra font-extrabold text-verde-texto">{num(c.pers_sin_agua_est)} personas</strong> en{' '}
          <strong className="cifra font-extrabold text-verde-texto">{num(c.localidades_con_viv_sin_agua)} localidades</strong> viven en viviendas sin agua entubada (Censo 2020).
        </p>
        <Pie>
          Personas: <Estimacion /> viviendas sin agua entubada por el promedio de ocupantes de cada localidad.
          {ultimo?.origen === 'semilla' && ' Presa: último dato capturado a mano de una nota que cita a Conagua.'} No hay datos de servicios para{' '}
          {num(c.localidades_enmascaradas)} {plural(c.localidades_enmascaradas, 'localidad', 'localidades')} de una o dos viviendas, donde viven {num(c.pob_localidades_enmascaradas)} personas.
        </Pie>
      </Tarjeta>
      <Tarjeta titulo={<>Semáforo hídrico <Supuesto>umbrales por validar</Supuesto></>}>
        <div className="flex items-center justify-between gap-3 border-b border-borde py-2">
          <div><div className="font-bold">Presa Valle de Bravo</div><div className="text-[14px] text-gris">{ultimo ? `${ultimo.porcentaje.toLocaleString('es-MX')} % de llenado · ${fechaCorta(ultimo.fecha)}` : 'Sin dato'}</div></div>
          <Semaforo estado={senal(ultimo?.porcentaje, u.presa_verde_desde, u.presa_amarillo_desde)} />
        </div>
        <div className="flex items-center justify-between gap-3 py-2">
          <div><div className="font-bold">Lluvia de los últimos 30 días</div><div className="text-[14px] text-gris">{r.pctNormal !== null && r.hasta ? `${num(r.pctNormal)} % de la referencia histórica · al ${fechaCorta(r.hasta)}${lluvia.estado === 'actual' ? '' : ' · copia guardada'}` : 'Sin consulta válida guardada'}</div></div>
          <Semaforo estado={senal(r.pctNormal, u.lluvia30_verde_desde, u.lluvia30_amarillo_desde)} />
        </div>
        <Pie>Presa llena no significa agua en todas las casas. Lluvia: Open-Meteo, modelo en malla; comparación exploratoria por validar.</Pie>
        <button type="button" className="text-action" onClick={() => ir('agua')}>Consultar contexto hídrico →</button>
      </Tarjeta>
    </section>
    <section className="itinerary" aria-label="Qué puedes explorar">
      {[['Leer el territorio', 'Ubica las carencias y sus fuentes.', 'mapa'], ['Abrir una comunidad', 'Conoce los datos y lo que aún falta saber.', 'prioridades'], ['Imaginar posibilidades', 'Revisa posibles usos y las siguientes etapas.', 'usos']].map(([titulo, texto, ruta], i) => <button key={titulo} type="button" onClick={() => ir(ruta as 'mapa' | 'prioridades' | 'usos')}><span className="step-number">{i + 1}</span><span><strong>{titulo}</strong><span>{texto}</span></span><span className="step-arrow" aria-hidden>→</span></button>)}
    </section>
    <section className="honest-intro">
      <div><h2>Un punto de partida, con límites claros.</h2><p>Esta herramienta propone una prioridad <strong>relativa</strong> entre localidades a partir de datos públicos. Ayuda a preparar preguntas y conversaciones; requiere validación con las comunidades antes de orientar decisiones reales.</p><button type="button" className="text-action" onClick={() => ir('fuentes')}>Consultar fuentes, supuestos y límites →</button></div>
      <dl className="maturity-list"><div><dt>Disponible</dt><dd>Mapa y datos públicos de Valle de Bravo</dd></div><div><dt>Demo local</dt><dd>Perfiles y proyectos simulados con seguimiento</dd></div><div><dt>Prototipo</dt><dd>Priorización y simulación de captación</dd></div><div><dt>A futuro</dt><dd>Observatorio ciudadano del agua para México</dd></div></dl>
    </section>
    <section className="mx-4 my-5 rounded-xl border border-borde bg-white p-4 sm:p-6" aria-labelledby="guia-en-panorama">
      <h2 id="guia-en-panorama" className="m-0 text-xl font-extrabold">¿Viste algo que afecta al agua?</h2>
      <p className="my-2 text-gris">Identifica la situación y revisa qué información puede ser útil sin ponerte en riesgo.</p>
      <a className="text-action inline-block" href="#/guia">Qué hacer si ves… <span aria-hidden>→</span></a>
    </section>
    <footer className="site-footer"><span>Agua y territorio · Regenera Consultora</span><button type="button" onClick={() => ir('acerca')}>Acerca del proyecto ↗</button></footer>
  </div>
}
