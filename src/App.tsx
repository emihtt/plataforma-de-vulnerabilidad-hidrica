import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { EtiquetaV0, Icono } from './componentes/ui'
import { Contexto, leerHash, type Estado, type Ruta } from './lib/contexto'
import { useDatos, type Pesos } from './lib/datos'
import { normalizarPesos, priorizar } from './lib/indice'
import { resumirLluvia, useLluvia } from './lib/lluvia'
import Acerca from './pantallas/Acerca'
import Fuentes from './pantallas/Fuentes'
import Panorama from './pantallas/Panorama'
import Prioridades from './pantallas/Prioridades'
import Usos from './pantallas/Usos'

// El mapa y las gráficas pesan: se cargan cuando se necesitan.
const Mapa = lazy(() => import('./pantallas/Mapa'))
const AguaAhora = lazy(() => import('./pantallas/AguaAhora'))
const Ficha = lazy(() => import('./componentes/Ficha'))

const DESTINOS: { ruta: Ruta; nombre: string; icono: 'panorama' | 'mapa' | 'prioridades' | 'agua' }[] = [
  { ruta: 'panorama', nombre: 'Panorama', icono: 'panorama' },
  { ruta: 'mapa', nombre: 'Mapa', icono: 'mapa' },
  { ruta: 'prioridades', nombre: 'Prioridades', icono: 'prioridades' },
  { ruta: 'agua', nombre: 'Contexto hídrico', icono: 'agua' },
]

const SECUNDARIAS: { ruta: Ruta; nombre: string }[] = [
  { ruta: 'usos', nombre: 'Usos y futuro' },
  { ruta: 'fuentes', nombre: 'Fuentes y límites' },
  { ruta: 'acerca', nombre: 'Acerca de' },
]

function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return <p className="m-0 p-6 text-center text-gris">{texto}</p>
}

export default function App() {
  const { datos, error } = useDatos()
  const [{ ruta, loc }, setLugar] = useState(leerHash)
  const [pesosUsuario, setPesosUsuario] = useState<Pesos | null>(null)
  const [menu, setMenu] = useState(false)
  const [conexion, setConexion] = useState(navigator.onLine)
  const [recorrido, setRecorrido] = useState<number | null>(null)

  useEffect(() => {
    const alCambiar = () => setLugar(leerHash())
    const linea = () => setConexion(navigator.onLine)
    window.addEventListener('hashchange', alCambiar)
    window.addEventListener('online', linea)
    window.addEventListener('offline', linea)
    return () => {
      window.removeEventListener('hashchange', alCambiar)
      window.removeEventListener('online', linea)
      window.removeEventListener('offline', linea)
    }
  }, [])

  const ir = useCallback((r: Ruta) => {
    setMenu(false)
    setRecorrido(null)
    window.location.hash = `/${r}`
  }, [])

  const iniciarRecorrido = () => {
    setPesosUsuario(null)
    setRecorrido(0)
    setMenu(false)
    window.location.hash = '/panorama'
  }
  const mostrarPaso = (paso: number) => {
    setRecorrido(paso)
    window.location.hash = ['/panorama', '/mapa', '/mapa?loc=151100037', '/usos'][paso]
  }

  const abrirFicha = useCallback((cvegeo: string | null) => {
    const actual = leerHash()
    if (cvegeo) {
      const destino = `#/${actual.ruta}?loc=${cvegeo}`
      // si ya hay una ficha abierta se reemplaza, para que "atrás" cierre la ficha de una vez
      if (actual.loc) window.location.replace(destino)
      else window.location.hash = destino.slice(1)
    } else if (actual.loc) {
      window.location.hash = `/${actual.ruta}`
    }
  }, [])

  const pesosBase = datos?.resumen.parametros.indice_prioridad.pesos
  const pesos = useMemo(() => (pesosBase ? normalizarPesos(pesosUsuario ?? pesosBase) : null), [pesosUsuario, pesosBase])
  const ranking = useMemo(() => (datos && pesos ? priorizar(datos.localidades, pesos) : []), [datos, pesos])
  const porClave = useMemo(() => new Map(ranking.map((r) => [r.loc.cvegeo, r])), [ranking])
  const lluviaCruda = useLluvia(datos?.normales?.punto ?? datos?.resumen.municipio.cabecera)
  const resumenLluvia = useMemo(() => resumirLluvia(lluviaCruda.datos, datos?.normales ?? null), [lluviaCruda.datos, datos])

  if (error) return <Cargando texto="No se pudieron cargar los datos. Revisa tu conexión y vuelve a abrir la página." />
  if (!datos || !pesos || !pesosBase) return <Cargando />

  const estado: Estado = {
    datos,
    pesos,
    pesosBase,
    setPesos: setPesosUsuario,
    ranking,
    porClave,
    ir,
    abrirFicha,
    iniciarRecorrido,
    lluvia: { guardada: lluviaCruda.datos, estado: lluviaCruda.estado, resumen: resumenLluvia },
  }
  const seleccion = loc ? (datos.localidades.find((l) => l.cvegeo === loc) ?? null) : null

  return (
    <Contexto.Provider value={estado}>
      <div className="app-shell">
        <a className="skip-link" href="#contenido" onClick={(e) => { e.preventDefault(); document.getElementById('contenido')?.focus() }}>Saltar al contenido</a>
        <header className="app-header">
          <div className="header-inner">
            <button type="button" onClick={() => ir('panorama')} className="brand">
              <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden><path d="M17 4S6 17 6 25a11 11 0 0 0 22 0C28 17 17 4 17 4ZM25 38q8-9 19-2M6 44q18-8 38 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              <span><strong>Agua y territorio</strong><span>Valle de Bravo</span></span>
            </button>
            <nav aria-label="Secciones principales" className="desktop-nav">
              {DESTINOS.map((d) => <button type="button" key={d.ruta} aria-current={ruta === d.ruta ? 'page' : undefined} onClick={() => ir(d.ruta)}>{d.nombre}</button>)}
            </nav>
            <nav className="header-links" aria-label="Documentación">
              <button type="button" onClick={() => ir('fuentes')} aria-current={ruta === 'fuentes' ? 'page' : undefined}>Fuentes</button>
              <button type="button" onClick={() => ir('usos')} aria-current={ruta === 'usos' ? 'page' : undefined}>Usos y futuro</button>
            </nav>
            <button
              type="button"
              aria-label={menu ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menu}
              onClick={() => setMenu((m) => !m)}
              className="menu-toggle"
            >
              <Icono nombre={menu ? 'cerrar' : 'menu'} />
            </button>
          </div>
          {menu && (
            <nav aria-label="Más secciones" className="extra-nav">
              {SECUNDARIAS.map((s) => (
                <button
                  key={s.ruta}
                  type="button"
                  onClick={() => ir(s.ruta)}
                  className="flex min-h-12 w-full items-center justify-between rounded-lg border-0 bg-transparent px-2 text-left text-[16px] font-bold"
                >
                  {s.nombre}
                  <Icono nombre="flecha" tam={18} />
                </button>
              ))}
            </nav>
          )}
        </header>
        <EtiquetaV0 />
        {!conexion && (
          <p className="connection-notice" role="status">Sin internet · mapa local y datos incluidos disponibles. Las consultas recientes y los enlaces externos pueden fallar.</p>
        )}

        {recorrido !== null && (
          <aside className="tour-bar" aria-label="Recorrido guiado">
            <div><span className="tour-count">{recorrido + 1} / 4 · recorrido de 2–3 min</span><strong>{['El problema: el acceso al agua se vive en las comunidades.', 'El territorio: explora el mapa y abre un caso concreto.', 'San Gabriel Ixtla: 73 de 436 viviendas sin agua entubada en 2020.', 'La conversación: posibles usos y una visión por construir.'][recorrido]}</strong><p>{['El Censo 2020 es una línea base; no describe el servicio de hoy.', 'El color representa prioridad relativa. El tamaño estima personas en viviendas sin agua entubada.', 'La ficha distingue datos censales de simulaciones. Ni la prioridad ni la captación son un diagnóstico.', 'El observatorio nacional es una aspiración. La siguiente etapa requiere validación y colaboración.'][recorrido]}</p></div>
            <div className="tour-actions">
              {recorrido > 0 && <button type="button" className="text-action" onClick={() => mostrarPaso(recorrido - 1)}>Anterior</button>}
              <button type="button" className="primary-action" onClick={() => recorrido === 3 ? ir('panorama') : mostrarPaso(recorrido + 1)}>{['Ir al mapa →', 'Abrir el caso →', 'Ver usos y futuro →', 'Terminar recorrido'][recorrido]}</button>
              <button type="button" className="text-action" onClick={() => setRecorrido(null)} aria-label="Salir del recorrido">Salir</button>
            </div>
          </aside>
        )}

        <main id="contenido" tabIndex={-1} key={ruta} className={`app-main route-${ruta}`}>
          <Suspense fallback={<Cargando />}>
            {ruta === 'panorama' && <Panorama />}
            {ruta === 'mapa' && <Mapa />}
            {ruta === 'prioridades' && <Prioridades />}
            {ruta === 'agua' && <AguaAhora />}
            {ruta === 'usos' && <Usos />}
            {ruta === 'fuentes' && <Fuentes />}
            {ruta === 'acerca' && <Acerca />}
          </Suspense>
        </main>

        <nav aria-label="Navegación móvil" className="mobile-nav grid shrink-0 grid-cols-4 border-t border-borde bg-white pb-[env(safe-area-inset-bottom)]">
          {DESTINOS.map((d) => {
            const activo = ruta === d.ruta
            return (
              <button
                key={d.ruta}
                type="button"
                onClick={() => ir(d.ruta)}
                aria-current={activo ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 border-0 border-t-[3px] bg-transparent px-1 text-[13px] font-bold ${
                  activo ? 'border-verde text-verde-texto' : 'border-transparent text-gris'
                }`}
              >
                <Icono nombre={d.icono} tam={22} />
                {d.nombre}
              </button>
            )
          })}
        </nav>

        {seleccion && (
          <Suspense fallback={null}>
            <Ficha loc={seleccion} alCerrar={() => abrirFicha(null)} alContinuar={recorrido === 2 ? () => mostrarPaso(3) : undefined} />
          </Suspense>
        )}
      </div>
    </Contexto.Provider>
  )
}
