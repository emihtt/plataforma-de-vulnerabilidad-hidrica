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
  { ruta: 'agua', nombre: 'Agua ahora', icono: 'agua' },
]

const SECUNDARIAS: { ruta: Ruta; nombre: string }[] = [
  { ruta: 'usos', nombre: 'Usos y escala' },
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
    window.location.hash = `/${r}`
  }, [])

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
    lluvia: { guardada: lluviaCruda.datos, estado: lluviaCruda.estado, resumen: resumenLluvia },
  }
  const seleccion = loc ? (datos.localidades.find((l) => l.cvegeo === loc) ?? null) : null

  return (
    <Contexto.Provider value={estado}>
      <div className="mx-auto flex h-full max-w-[560px] flex-col bg-fondo shadow-[0_0_0_1px_var(--color-borde)]">
        <header className="shrink-0 bg-tinta text-white">
          <div className="flex items-center justify-between gap-2 px-4 py-2.5">
            <button type="button" onClick={() => ir('panorama')} className="border-0 bg-transparent p-0 text-left text-white">
              <span className="block text-[18px] font-extrabold leading-tight">Laboratorio Valle de Bravo</span>
              <span className="block text-[13px] leading-tight text-[#c9cbd0]">Plataforma de Agua · Regenera Consultora</span>
            </button>
            <button
              type="button"
              aria-label={menu ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menu}
              onClick={() => setMenu((m) => !m)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#4a4a4a] bg-transparent text-white"
            >
              <Icono nombre={menu ? 'cerrar' : 'menu'} />
            </button>
          </div>
          {menu && (
            <nav aria-label="Más secciones" className="border-t border-[#3a3a3a] px-2 pb-2">
              {SECUNDARIAS.map((s) => (
                <button
                  key={s.ruta}
                  type="button"
                  onClick={() => ir(s.ruta)}
                  className="flex min-h-12 w-full items-center justify-between rounded-lg border-0 bg-transparent px-2 text-left text-[16px] font-bold text-white"
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
          <p className="m-0 bg-[#FFF3D6] px-4 py-1 text-[13px] font-bold text-[#7a5200]">Sin conexión: se muestran los datos guardados en este dispositivo.</p>
        )}

        <main className="relative min-h-0 flex-1 overflow-y-auto">
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

        <nav aria-label="Secciones principales" className="grid shrink-0 grid-cols-4 border-t border-borde bg-white pb-[env(safe-area-inset-bottom)]">
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
            <Ficha loc={seleccion} alCerrar={() => abrirFicha(null)} />
          </Suspense>
        )}
      </div>
    </Contexto.Provider>
  )
}
