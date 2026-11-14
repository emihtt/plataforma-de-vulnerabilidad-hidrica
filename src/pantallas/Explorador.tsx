import { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import urlWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import Mapa from './Mapa'
import ControlesTerritorio from '../componentes/ControlesTerritorio'
import { useEstado } from '../lib/contexto'
import { rutaDatos } from '../lib/datos'
import { lineaBase, territorios } from '../lib/territorios'
import { num, pct } from '../lib/formato'
maplibregl.setWorkerUrl(urlWorker)

function MapaUnidades() {
  const { datos, escala, unidad, seleccionarTerritorio, abrirTerritorio, ir } = useEstado()
  const [busca, setBusca] = useState(''), [completa, setCompleta] = useState(false), [fallo, setFallo] = useState(false)
  const caja = useRef<HTMLDivElement>(null), mapa = useRef<maplibregl.Map | null>(null)
  const unidades = useMemo(() => territorios(datos, escala), [datos, escala])
  const visibles = unidades.filter((t) => t.nombre.toLowerCase().includes(busca.toLowerCase()) || t.id.includes(busca))
  const seleccion = unidades.find((t) => t.id === unidad), base = seleccion ? lineaBase(seleccion) : null
  const elegir = useRef(seleccionarTerritorio); elegir.current = seleccionarTerritorio
  useEffect(() => {
    if (!caja.current) return
    const puntos = datos.localidades.map((l) => [l.lon, l.lat] as [number, number])
    let m: maplibregl.Map
    try { m = new maplibregl.Map({ container: caja.current, style: { version: 8, sources: {}, layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#edf3f0' } }] }, bounds: new maplibregl.LngLatBounds(puntos[0], puntos[0]).extend([Math.min(...puntos.map((p) => p[0])), Math.min(...puntos.map((p) => p[1]))]).extend([Math.max(...puntos.map((p) => p[0])), Math.max(...puntos.map((p) => p[1]))]), fitBoundsOptions: { padding: 40 }, attributionControl: false, maxZoom: 16, dragRotate: false, pitchWithRotate: false }) } catch { setFallo(true); return }
    mapa.current = m
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    m.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: 'HydroBASINS © WWF · Lehner y Grill (2013) | Contexto © OpenStreetMap | INEGI 2020' }), 'bottom-left')
    m.on('load', () => {
      m.addSource('unidades', { type: 'geojson', data: { type: 'FeatureCollection', features: unidades.map((u) => u.feature!) } })
      m.addSource('contexto', { type: 'geojson', data: rutaDatos('contexto.geojson') })
      m.addLayer({ id: 'unidad-fill', type: 'fill', source: 'unidades', paint: { 'fill-color': '#9dd4c0', 'fill-opacity': .4 } })
      m.addLayer({ id: 'unidad-borde', type: 'line', source: 'unidades', paint: { 'line-color': '#157462', 'line-width': 2 } })
      m.addLayer({ id: 'agua', type: 'fill', source: 'contexto', filter: ['==', ['get', 'capa'], 'agua'], paint: { 'fill-color': '#9acbd8' } })
      m.addLayer({ id: 'municipio', type: 'line', source: 'contexto', filter: ['==', ['get', 'capa'], 'limite'], paint: { 'line-color': '#5a6c64', 'line-width': 1.4, 'line-dasharray': [3, 2] } })
      m.addSource('localidades', { type: 'geojson', data: { type: 'FeatureCollection', features: datos.localidades.map((l) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [l.lon, l.lat] }, properties: { nombre: l.nombre } })) } })
      m.addLayer({ id: 'puntos', type: 'circle', source: 'localidades', paint: { 'circle-radius': 3, 'circle-color': '#174a3f', 'circle-stroke-color': '#fff', 'circle-stroke-width': .8 } })
      m.on('click', 'unidad-fill', (e) => { const id = e.features?.[0]?.properties.id; if (id) elegir.current(escala, String(id)) })
      m.on('mouseenter', 'unidad-fill', () => { m.getCanvas().style.cursor = 'pointer' })
      m.on('mouseleave', 'unidad-fill', () => { m.getCanvas().style.cursor = '' })
    })
    const obs = new ResizeObserver(() => m.resize()); obs.observe(caja.current)
    return () => { obs.disconnect(); m.remove(); mapa.current = null }
  }, [datos, escala, unidades])
  useEffect(() => {
    const m = mapa.current
    if (!m) return
    const actualizar = () => {
      if (m.getLayer('unidad-fill')) m.setPaintProperty('unidad-fill', 'fill-color', ['case', ['==', ['get', 'id'], unidad ?? ''], '#2d9b7f', '#c0dfd1'])
      const bounds = new maplibregl.LngLatBounds()
      if (completa) {
        const recorrer = (c: unknown) => {
          if (Array.isArray(c) && typeof c[0] === 'number') bounds.extend(c as [number, number])
          else if (Array.isArray(c)) c.forEach(recorrer)
        }
        ;(seleccion ? [seleccion] : unidades).forEach((u) => recorrer(u.feature!.geometry.coordinates))
      } else datos.localidades.forEach((l) => bounds.extend([l.lon, l.lat]))
      if (!bounds.isEmpty()) m.fitBounds(bounds, { padding: 40, duration: 0 })
    }
    if (m.isStyleLoaded()) actualizar(); else m.once('load', actualizar)
    return () => { m.off('load', actualizar) }
  }, [unidad, completa, datos, seleccion, unidades])
  return <div className="hydro-workspace"><aside className="hydro-sidebar"><h1>{escala === 'cuenca' ? 'Cuencas' : 'Microcuencas'} · modelo</h1><p>Unidades HydroBASINS nivel {escala === 'cuenca' ? 6 : 12}. No equivalen a delimitaciones oficiales mexicanas.</p><label className="field">Buscar unidad<input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nombre o identificador" /></label><div className="hydro-unit-list">{visibles.map((t) => <button key={t.id} type="button" aria-pressed={unidad === t.id} onClick={() => seleccionarTerritorio(escala, t.id)}><strong>{t.nombre}</strong><span>{t.localidades.length} localidades del piloto</span></button>)}</div>{!visibles.length && <p>Sin coincidencias.</p>}{seleccion && base && <section className="selected-unit"><h2>{seleccion.nombre}</h2><p>{base.conDatos} de {base.totalLocalidades} localidades con datos de servicios.</p><strong>{num(base.agua.valor)} viviendas sin agua entubada · {pct(base.agua.proporcion)}</strong><button type="button" className="primary-action" onClick={() => abrirTerritorio(seleccion.id)}>Abrir línea base y ficha →</button></section>}<div className="workspace-actions"><button type="button" className="text-action" onClick={() => setCompleta((v) => !v)}>{completa ? 'Volver al área piloto' : 'Ver extensión completa'}</button><button type="button" className="text-action" onClick={() => ir('prioridades')}>Ver prioridades</button></div><p className="workspace-note">Línea discontinua: municipio. Los datos estadísticos cubren solo Valle de Bravo; no toda la unidad hidrográfica.</p></aside><div className="hydro-map"><div ref={caja} className="map-canvas" role="application" aria-label={`Mapa de ${escala}s modeladas`} />{fallo && <p className="map-error">El mapa gráfico no está disponible. Las unidades y sus fichas siguen accesibles en la lista.</p>}<div className="hydro-map-key">Límite verde: unidad modelada · puntos: localidades censales<br />Fuente y edición visibles en cada ficha. No es un diagnóstico.</div></div></div>
}

export default function Explorador() {
  const { datos, escala } = useEstado()
  return <div className="explorer-page"><ControlesTerritorio /><div className="explorer-body">{escala === 'localidad' ? <Mapa /> : datos.hidricas ? <MapaUnidades /> : <p className="p-6">Las unidades hidrográficas no están disponibles en este paquete. No se sustituyeron por polígonos inventados.</p>}</div></div>
}
