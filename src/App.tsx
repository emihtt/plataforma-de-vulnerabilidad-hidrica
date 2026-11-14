import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { EtiquetaV0, Icono } from './componentes/ui'
import { Contexto, leerHash, hashTerritorio, type Estado, type Ruta } from './lib/contexto'
import { useDatos, type Pesos } from './lib/datos'
import { COMPONENTES, pesosActivos, priorizar } from './lib/indice'
import { resumirLluvia, useLluvia } from './lib/lluvia'
import { PERFILES, type Perfil } from './lib/proyectos'
import { COMPATIBLES, territorios } from './lib/territorios'
import { useProyectos } from './lib/useProyectos'
import Acerca from './pantallas/Acerca'
import Fuentes from './pantallas/Fuentes'
import Panorama from './pantallas/Panorama'
import Prioridades from './pantallas/Prioridades'
import Usos from './pantallas/Usos'
import Perfiles from './pantallas/Perfiles'

const Explorador = lazy(() => import('./pantallas/Explorador'))
const AguaAhora = lazy(() => import('./pantallas/AguaAhora'))
const Ficha = lazy(() => import('./componentes/Ficha'))
const TerritorioVista = lazy(() => import('./pantallas/TerritorioVista'))
const Proyectos = lazy(() => import('./pantallas/Proyectos'))
const Seguimiento = lazy(() => import('./pantallas/Seguimiento'))
const DESTINOS = [
  { ruta: 'panorama', nombre: 'Panorama', icono: 'panorama' },
  { ruta: 'mapa', nombre: 'Mapa', icono: 'mapa' },
  { ruta: 'prioridades', nombre: 'Prioridades', icono: 'prioridades' },
  { ruta: 'proyectos', nombre: 'Proyectos', icono: 'capas' },
  { ruta: 'seguimiento', nombre: 'Seguimiento', icono: 'agua' },
] as const
const SECUNDARIAS: { ruta: Ruta; nombre: string }[] = [
  { ruta: 'perfiles', nombre: 'Elegir experiencia' }, { ruta: 'usos', nombre: 'Usos y futuro' },
  { ruta: 'agua', nombre: 'Contexto hídrico' }, { ruta: 'fuentes', nombre: 'Fuentes y límites' }, { ruta: 'acerca', nombre: 'Acerca de' },
]
function Cargando({ texto = 'Cargando…' }: { texto?: string }) { return <p className="m-0 p-6 text-center text-gris">{texto}</p> }
const CLAVE_PERFIL = 'agua-territorio:perfil:v1'
const CLAVE_PESOS = 'agua-territorio:pesos:v1'
function pesosGuardados(): Pesos | null {
  try {
    const j = JSON.parse(localStorage.getItem(CLAVE_PESOS) ?? 'null')
    return j?.schemaVersion === 1 && COMPONENTES.every((c) => typeof j.pesos?.[c.clave] === 'number' && Number.isFinite(j.pesos[c.clave]) && j.pesos[c.clave] >= 0) && COMPONENTES.some((c) => j.pesos[c.clave] > 0) ? j.pesos as Pesos : null
  } catch { return null }
}
function perfilGuardado(): Perfil {
  try { const p = localStorage.getItem(CLAVE_PERFIL); return PERFILES.find((x) => x.id === p)?.id ?? 'comunidad' } catch { return 'comunidad' }
}

export default function App() {
  const { datos, error } = useDatos()
  const [lugar, setLugar] = useState(leerHash)
  const { ruta, loc, escala, variables } = lugar
  const [pesosUsuario, setPesosUsuario] = useState<Pesos | null>(pesosGuardados)
  const [perfil, setPerfilState] = useState<Perfil>(perfilGuardado)
  const [avisoPerfil, setAvisoPerfil] = useState('')
  const [menu, setMenu] = useState(false)
  const [conexion, setConexion] = useState(navigator.onLine)
  const [recorrido, setRecorrido] = useState<number | null>(null)
  const cartera = useProyectos(datos)
  useEffect(() => {
    const alCambiar = () => setLugar(leerHash())
    const linea = () => setConexion(navigator.onLine)
    window.addEventListener('hashchange', alCambiar); window.addEventListener('online', linea); window.addEventListener('offline', linea)
    return () => { window.removeEventListener('hashchange', alCambiar); window.removeEventListener('online', linea); window.removeEventListener('offline', linea) }
  }, [])
  const navegar = useCallback((hash: string) => { window.location.hash = hash; setLugar(leerHash()) }, [])
  const ir = useCallback((r: Ruta) => {
    setMenu(false); setRecorrido(null)
    const actual = leerHash()
    navegar(hashTerritorio(r, actual.escala, actual.unidad, actual.variables))
  }, [navegar])
  const iniciarRecorrido = () => {
    setPesosUsuario(null); setRecorrido(0); setMenu(false)
    navegar(hashTerritorio('perfiles', 'localidad', null, ['sin_agua_entubada']))
  }
  const mostrarPaso = (paso: number) => {
    setRecorrido(paso)
    const rutas: Ruta[] = ['perfiles', 'mapa', 'proyectos', 'seguimiento', 'usos']
    navegar(hashTerritorio(rutas[paso], paso >= 2 ? 'localidad' : escala, null, variables) + (paso === 2 || paso === 3 ? '&proyecto=demo-proyecto-localidad' : ''))
  }
  const abrirFicha = useCallback((clave: string | null) => {
    const a = leerHash(), destino = '#' + hashTerritorio(a.ruta, a.escala, a.unidad, a.variables, clave)
    if (a.loc && clave) window.location.replace(destino)
    else navegar(destino.slice(1))
  }, [navegar])
  const cerrarFicha = useCallback(() => abrirFicha(null), [abrirFicha])
  const pesosBase = datos?.resumen.parametros.indice_prioridad.pesos
  const pesos = useMemo(() => {
    if (!pesosBase) return null
    return pesosActivos(pesosUsuario ?? pesosBase, pesosBase, variables)
  }, [pesosUsuario, pesosBase, variables])
  const ranking = useMemo(() => datos && pesos ? priorizar(datos.localidades, pesos) : [], [datos, pesos])
  const porClave = useMemo(() => new Map(ranking.map((r) => [r.loc.cvegeo, r])), [ranking])
  const lluviaCruda = useLluvia(datos?.normales?.punto ?? datos?.resumen.municipio.cabecera, ruta === 'agua')
  const resumenLluvia = useMemo(() => resumirLluvia(lluviaCruda.datos, datos?.normales ?? null), [lluviaCruda.datos, datos])
  if (error) return <div className="recovery-panel" role="alert"><h1>No se pudieron cargar los datos del piloto.</h1><p>Comprueba la conexión o que el servidor de la demo esté abierto. Si es la primera visita, se necesita acceso al sitio para descargar los archivos.</p><button type="button" className="primary-action" onClick={() => window.location.reload()}>Volver a intentar</button></div>
  if (!datos || !pesos || !pesosBase) return <Cargando />
  const unidadInvalida = !!lugar.unidad && !territorios(datos, escala).some((t) => t.id === lugar.unidad)
  const unidad = unidadInvalida ? null : lugar.unidad
  const perfilInfo = PERFILES.find((p) => p.id === perfil)!
  const estado: Estado = {
    datos, pesos, pesosBase, pesosCrudos: pesosUsuario ?? pesosBase, ranking, porClave, ir, abrirFicha, iniciarRecorrido, perfil,
    setPerfil: (p) => { setPerfilState(p); try { localStorage.setItem(CLAVE_PERFIL, p); setAvisoPerfil('') } catch { setAvisoPerfil('La preferencia de perfil no pudo guardarse; seguirá activa durante esta sesión.') } },
    gestiona: perfilInfo.familia === 'gestion', escala, unidad, variables, cartera,
    setPesos: (p) => {
      if (COMPONENTES.some((c) => !Number.isFinite(p[c.clave]) || p[c.clave] < 0) || !variables.some((k) => p[k] > 0)) return
      setPesosUsuario(p)
      try { localStorage.setItem(CLAVE_PESOS, JSON.stringify({ schemaVersion: 1, pesos: p })); setAvisoPerfil('') } catch { setAvisoPerfil('Los pesos están activos en esta sesión, pero no se pudo guardar la preferencia.') }
    },
    alternarVariable: (c) => {
      const nuevas = variables.includes(c) ? variables.filter((k) => k !== c) : [...variables, c]
      if (!nuevas.length) return
      if (pesosUsuario && !nuevas.some((k) => pesosUsuario[k] > 0)) setPesosUsuario(null)
      navegar(hashTerritorio(ruta, escala, unidad, nuevas))
    },
    seleccionarTerritorio: (e, id = null) => {
      const compatibles = variables.filter((v) => COMPATIBLES[e].includes(v))
      navegar(hashTerritorio(ruta === 'territorio' ? 'mapa' : ruta, e, id, compatibles.length ? compatibles : ['sin_agua_entubada']))
    },
    abrirTerritorio: (id) => { setRecorrido(null); navegar(hashTerritorio('territorio', escala, id, variables)) },
    lluvia: { guardada: lluviaCruda.datos, estado: lluviaCruda.estado, resumen: resumenLluvia },
  }
  const seleccion = loc ? datos.localidades.find((l) => l.cvegeo === loc) : null
  return <Contexto.Provider value={estado}>
    <div className="app-shell">
      <a className="skip-link" href="#contenido" onClick={(e) => { e.preventDefault(); document.getElementById('contenido')?.focus() }}>Saltar al contenido</a>
      <header className="app-header"><div className="header-inner">
        <button type="button" onClick={() => ir('panorama')} className="brand"><svg viewBox="0 0 48 48" width="44" height="44" aria-hidden><path d="M17 4S6 17 6 25a11 11 0 0 0 22 0C28 17 17 4 17 4ZM25 38q8-9 19-2M6 44q18-8 38 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg><span><strong>Agua y territorio</strong><span>Valle de Bravo</span></span></button>
        <nav aria-label="Secciones principales" className="desktop-nav">{DESTINOS.map((d) => <button type="button" key={d.ruta} aria-current={ruta === d.ruta ? 'page' : undefined} onClick={() => ir(d.ruta)}>{d.nombre}</button>)}</nav>
        <button type="button" aria-label={menu ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="menu-toggle"><Icono nombre={menu ? 'cerrar' : 'menu'} /></button>
      </div>{menu && <nav aria-label="Más secciones" className="extra-nav">{SECUNDARIAS.map((s) => <button key={s.ruta} type="button" onClick={() => ir(s.ruta)}>{s.nombre}</button>)}</nav>}</header>
      <EtiquetaV0 />
      <div className="profile-strip"><span>Vista: <strong>{perfilInfo.nombre}</strong> <span className="profile-mode">· demostración local, sin cuentas</span></span><button type="button" onClick={() => ir('perfiles')}>Cambiar perfil</button></div>
      {!conexion && <p className="connection-notice" role="status">Sin internet · territorios, fichas y proyectos locales disponibles. Las consultas externas pueden fallar.</p>}
      {(lugar.aviso || unidadInvalida || avisoPerfil) && <p className="connection-notice" role="status">{avisoPerfil || 'El enlace contiene un filtro no disponible. Se usa una selección válida del piloto.'}</p>}
      {recorrido !== null && <aside className="tour-bar" aria-label="Recorrido guiado"><div><span className="tour-count">{recorrido + 1} / 5 · recorrido de 2–3 min</span><strong>{['Elige una experiencia para explorar.', 'Mira el territorio y agrega solo las variables que necesitas.', 'Distingue las intervenciones de sus aportes financieros.', 'Revisa cambios registrados, sin atribuir impacto.', 'Una versión demostrable y una visión por construir.'][recorrido]}</strong><p>{['Las cinco entradas se agrupan en gestión y consulta; no son cuentas ni permisos.', 'Prueba localidades, cuencas y microcuencas. Las unidades HydroBASINS están rotuladas como modeladas.', 'Este proyecto es ficticio: sus metas, dinero y avances son ilustrativos.', 'La serie del proyecto es de ejemplo. No modifica el Censo 2020 ni prueba causalidad.', 'La validación científica, comunitaria y la operación compartida son etapas posteriores.'][recorrido]}</p></div><div className="tour-actions">{recorrido > 0 && <button type="button" className="text-action" onClick={() => mostrarPaso(recorrido - 1)}>Anterior</button>}<button type="button" className="primary-action" onClick={() => recorrido === 4 ? ir('panorama') : mostrarPaso(recorrido + 1)}>{['Explorar territorio →', 'Ver proyecto de ejemplo →', 'Ver seguimiento →', 'Ver usos y futuro →', 'Terminar recorrido'][recorrido]}</button><button type="button" className="text-action" onClick={() => setRecorrido(null)}>Salir</button></div></aside>}
      <main id="contenido" tabIndex={-1} key={ruta} className={`app-main route-${ruta}`}><Suspense fallback={<Cargando />}>
        {ruta === 'panorama' && <Panorama />}{ruta === 'mapa' && <Explorador />}{ruta === 'prioridades' && <Prioridades />}
        {ruta === 'agua' && <AguaAhora />}{ruta === 'usos' && <Usos />}{ruta === 'fuentes' && <Fuentes />}{ruta === 'acerca' && <Acerca />}
        {ruta === 'perfiles' && <Perfiles />}{ruta === 'proyectos' && <Proyectos />}{ruta === 'seguimiento' && <Seguimiento />}{ruta === 'territorio' && <TerritorioVista />}
      </Suspense></main>
      <nav aria-label="Navegación móvil" className="mobile-nav grid shrink-0 grid-cols-5 border-t border-borde bg-white pb-[env(safe-area-inset-bottom)]">{DESTINOS.map((d) => <button type="button" key={d.ruta} onClick={() => ir(d.ruta)} aria-current={ruta === d.ruta ? 'page' : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 border-0 border-t-[3px] bg-transparent px-1 text-[11px] font-bold ${ruta === d.ruta ? 'border-verde text-verde-texto' : 'border-transparent text-gris'}`}><Icono nombre={d.icono} tam={22} />{d.nombre}</button>)}</nav>
      {seleccion && <Suspense fallback={null}><Ficha loc={seleccion} alCerrar={cerrarFicha} /></Suspense>}
    </div>
  </Contexto.Provider>
}
