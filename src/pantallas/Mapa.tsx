import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import urlTrabajador from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Icono, Supuesto } from '../componentes/ui'
import { useEstado } from '../lib/contexto'
import { rutaDatos, type Localidad } from '../lib/datos'
import { CLASES, ESCALA } from '../lib/indice'

// MapLibre 6 carga su proceso de fondo desde un archivo aparte; se le indica el que empaqueta Vite.
maplibregl.setWorkerUrl(urlTrabajador)

type Capa = 'prioridad' | 'agua' | 'captacion' | 'indigena'

interface DefCapa {
  nombre: string
  titulo: string
  clases: string[] // del valor más bajo al más alto (color claro a oscuro)
  supuesto?: boolean
  fuente: string
}

const CAPAS: Record<Capa, DefCapa> = {
  prioridad: {
    nombre: 'Prioridad',
    titulo: 'Clase de prioridad (índice preliminar)',
    clases: [...CLASES].reverse(),
    supuesto: true,
    fuente: 'Índice propio con Censo 2020 y Conapo',
  },
  agua: {
    nombre: 'Carencia de agua',
    titulo: 'Viviendas sin agua entubada',
    clases: ['0 %', 'Hasta 5 %', '5 a 15 %', '15 a 30 %', 'Más de 30 %'],
    fuente: 'INEGI, Censo 2020',
  },
  captacion: {
    nombre: 'Captación de lluvia',
    titulo: 'Demanda básica que cubriría la lluvia de un techo',
    clases: ['Menos de 40 %', '40 a 50 %', '50 a 60 %', '60 a 70 %', '70 % o más'],
    supuesto: true,
    fuente: 'Cálculo propio con lluvia de Daymet',
  },
  indigena: {
    nombre: 'Hogares indígenas',
    titulo: 'Población en hogares indígenas',
    clases: ['Menos de 5 %', '5 a 15 %', '15 a 30 %', '30 a 50 %', 'Más de 50 %'],
    fuente: 'INEGI, Censo 2020',
  },
}

function tramo(valor: number | null | undefined, cortes: number[]): number | null {
  if (valor === null || valor === undefined) return null
  let i = 0
  while (i < cortes.length && valor > cortes[i]) i++
  return i
}

function claseDe(loc: Localidad, capa: Capa, clasePrioridad: string | undefined): number | null {
  if (loc.enmascarada) return null
  switch (capa) {
    case 'prioridad':
      return clasePrioridad ? CLASES.length - 1 - CLASES.indexOf(clasePrioridad as (typeof CLASES)[number]) : null
    case 'agua':
      return loc.pct_sin_agua === 0 ? 0 : tramo(loc.pct_sin_agua, [0, 0.05, 0.15, 0.3])
    case 'captacion': {
      const c = loc.scall?.cobertura_potencial
      return c === undefined ? null : c >= 0.7 ? 4 : c >= 0.6 ? 3 : c >= 0.5 ? 2 : c >= 0.4 ? 1 : 0
    }
    case 'indigena':
      return tramo(loc.pct_hog_indigena, [0.05, 0.15, 0.3, 0.5])
  }
}

const ESTILO_PROPIO: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#F2F3F4' } }],
}

const ESTILO_BASE = 'https://tiles.openfreemap.org/styles/positron'
const CAPAS_PROPIAS_DE_RESPALDO = ['ctx-camino-brecha', 'ctx-camino']

export default function Mapa() {
  const { datos, porClave, abrirFicha } = useEstado()
  const caja = useRef<HTMLDivElement>(null)
  const mapa = useRef<maplibregl.Map | null>(null)
  const [listo, setListo] = useState(false)
  const [capa, setCapa] = useState<Capa>('prioridad')
  const [leyenda, setLeyenda] = useState(true)
  const [conBase, setConBase] = useState(false)

  const geojson = useMemo(() => {
    const maximo = Math.max(...datos.localidades.map((l) => l.pers_sin_agua_est ?? 0))
    return {
      type: 'FeatureCollection' as const,
      features: datos.localidades.map((l) => {
        const clase = claseDe(l, capa, porClave.get(l.cvegeo)?.clase)
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [l.lon, l.lat] },
          properties: {
            cvegeo: l.cvegeo,
            enmascarada: l.enmascarada,
            color: clase === null ? '#FFFFFF' : ESCALA[clase],
            sin_clase: clase === null,
            // radio proporcional a la raíz de las personas estimadas sin agua entubada
            radio: l.enmascarada ? 5 : 4.5 + 14 * Math.sqrt((l.pers_sin_agua_est ?? 0) / maximo),
            orden: l.pers_sin_agua_est ?? 0,
          },
        }
      }),
    }
  }, [datos.localidades, capa, porClave])

  // Crear el mapa una sola vez
  useEffect(() => {
    if (!caja.current) return
    const lons = datos.localidades.map((l) => l.lon)
    const lats = datos.localidades.map((l) => l.lat)
    const m = new maplibregl.Map({
      container: caja.current,
      style: ESTILO_PROPIO,
      bounds: [Math.min(...lons) - 0.01, Math.min(...lats) - 0.01, Math.max(...lons) + 0.01, Math.max(...lats) + 0.01],
      fitBoundsOptions: { padding: { top: 16, left: 16, right: 16, bottom: 150 } },
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      maxZoom: 16,
      minZoom: 8,
    })
    mapa.current = m
    m.touchZoomRotate.disableRotation()
    m.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: '© colaboradores de OpenStreetMap' }), 'top-left')
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    m.on('load', () => {
      m.addSource('contexto', { type: 'geojson', data: rutaDatos('contexto.geojson') })
      m.addSource('localidades', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      const de = (c: string): maplibregl.ExpressionSpecification => ['==', ['get', 'capa'], c]
      m.addLayer({ id: 'ctx-protegida', type: 'fill', source: 'contexto', filter: de('area_protegida'), paint: { 'fill-color': '#4DBDAF', 'fill-opacity': 0.06 } })
      m.addLayer({ id: 'ctx-agua', type: 'fill', source: 'contexto', filter: de('agua'), paint: { 'fill-color': '#B9D7E8' } })
      m.addLayer({ id: 'ctx-rio', type: 'line', source: 'contexto', filter: de('rio'), paint: { 'line-color': '#8FBBD6', 'line-width': 1.2 } })
      m.addLayer({
        id: 'ctx-camino-brecha',
        type: 'line',
        source: 'contexto',
        minzoom: 11.5,
        filter: ['all', de('camino'), ['==', ['get', 'clase'], 'brecha']],
        paint: { 'line-color': '#C9CCD1', 'line-width': 0.8, 'line-dasharray': [2, 2] },
      })
      m.addLayer({
        id: 'ctx-camino',
        type: 'line',
        source: 'contexto',
        filter: ['all', de('camino'), ['!=', ['get', 'clase'], 'brecha']],
        paint: { 'line-color': '#FFFFFF', 'line-width': ['match', ['get', 'clase'], 'principal', 2.4, 1.3] },
      })
      m.addLayer({ id: 'ctx-limite', type: 'line', source: 'contexto', filter: de('limite'), paint: { 'line-color': '#1A1A1A', 'line-width': 1.6, 'line-dasharray': [3, 2] } })
      m.addLayer({
        id: 'loc-circulo',
        type: 'circle',
        source: 'localidades',
        layout: { 'circle-sort-key': ['-', 0, ['get', 'orden']] },
        paint: {
          'circle-radius': ['get', 'radio'],
          'circle-color': ['get', 'color'],
          'circle-opacity': ['case', ['get', 'sin_clase'], 0, 0.92],
          'circle-stroke-color': ['case', ['get', 'sin_clase'], '#6B6B6B', '#1A1A1A'],
          'circle-stroke-width': ['case', ['get', 'sin_clase'], 2, 1],
        },
      })
      m.on('click', 'loc-circulo', (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0]
        if (f) abrirFicha(String(f.properties.cvegeo))
      })
      m.on('mouseenter', 'loc-circulo', () => (m.getCanvas().style.cursor = 'pointer'))
      m.on('mouseleave', 'loc-circulo', () => (m.getCanvas().style.cursor = ''))
      setListo(true)

      // Con conexión se suma un mapa base público debajo de las capas propias.
      fetch(ESTILO_BASE)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('sin mapa base'))))
        .then((estilo: maplibregl.StyleSpecification) => {
          if (!mapa.current) return
          if (estilo.glyphs) m.setGlyphs(estilo.glyphs)
          if (estilo.sprite) m.setSprite(estilo.sprite as string)
          for (const [id, fuente] of Object.entries(estilo.sources)) if (!m.getSource(id)) m.addSource(id, fuente)
          for (const c of estilo.layers) if (!m.getLayer(c.id)) m.addLayer(c, 'ctx-protegida')
          if (m.getLayer('fondo')) m.removeLayer('fondo')
          for (const id of CAPAS_PROPIAS_DE_RESPALDO) m.setLayoutProperty(id, 'visibility', 'none')
          setConBase(true)
        })
        .catch(() => undefined) // sin conexión: se queda solo con las capas propias
    })

    const cab = datos.localidades.find((l) => l.es_cabecera)
    if (cab) {
      const el = document.createElement('div')
      el.className = 'etiqueta-mapa'
      el.textContent = 'Cabecera'
      new maplibregl.Marker({ element: el, anchor: 'top', offset: [0, 24] }).setLngLat([cab.lon, cab.lat]).addTo(m)
    }
    const observador = new ResizeObserver(() => m.resize())
    observador.observe(caja.current)
    return () => {
      observador.disconnect()
      m.remove()
      mapa.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!listo || !mapa.current) return
    const fuente = mapa.current.getSource('localidades') as maplibregl.GeoJSONSource | undefined
    fuente?.setData(geojson)
  }, [geojson, listo])

  const def = CAPAS[capa]
  const sinDato = datos.localidades.filter((l) => l.enmascarada).length

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-borde bg-white px-3 py-2" role="group" aria-label="Capa del mapa">
        {(Object.keys(CAPAS) as Capa[]).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={capa === c}
            onClick={() => setCapa(c)}
            className={`min-h-10 shrink-0 rounded-full border px-3 text-[14px] font-bold ${
              capa === c ? 'border-tinta bg-tinta text-white' : 'border-borde bg-white text-tinta'
            }`}
          >
            {CAPAS[c].nombre}
          </button>
        ))}
      </div>
      <div className="relative min-h-0 flex-1">
        <div ref={caja} style={{ position: 'absolute', inset: 0 }} aria-label="Mapa de las localidades de Valle de Bravo" role="application" />
        <div className="absolute right-2 bottom-2 left-2 rounded-xl border border-borde bg-white/95 text-[13px] shadow-sm sm:left-auto sm:w-80">
          <button
            type="button"
            onClick={() => setLeyenda((v) => !v)}
            aria-expanded={leyenda}
            className="flex min-h-10 w-full items-center justify-between gap-2 border-0 bg-transparent px-3 text-left font-extrabold"
          >
            <span className="flex items-center gap-1.5">
              <Icono nombre="capas" tam={16} /> {def.titulo}
            </span>
            <span className="text-gris">{leyenda ? 'Ocultar' : 'Ver'}</span>
          </button>
          {leyenda && (
            <div className="px-3 pb-2.5">
              <div className="flex">
                {def.clases.map((c, i) => (
                  <div key={c} className="flex-1 text-center">
                    <div className="h-3 border border-tinta/40" style={{ background: ESCALA[i] }} />
                    <div className="mt-0.5 px-0.5 leading-tight text-gris">{c}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-gris">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-gris bg-white" /> Sin datos de servicios ({sinDato})
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full border border-tinta bg-p3" />
                  <span className="inline-block h-4 w-4 rounded-full border border-tinta bg-p3" /> Tamaño: personas sin agua entubada (estimación)
                </span>
              </div>
              <div className="mt-1.5 text-meta">
                {def.supuesto && (
                  <>
                    <Supuesto>Versión 0 · supuesto por validar</Supuesto>{' '}
                  </>
                )}
                {def.fuente}. Toca una localidad para ver su ficha.{!conBase && ' Mapa base no disponible: se muestran solo las capas propias.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
