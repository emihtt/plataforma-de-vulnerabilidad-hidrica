import { useState } from 'react'
import { useEstado } from '../lib/contexto'
import { descargarArchivo, nuevoProyecto, proyectoEnSeleccion, type Proyecto } from '../lib/proyectos'
import { territorios } from '../lib/territorios'
import ControlesTerritorio from '../componentes/ControlesTerritorio'
import ProyectoDetalle, { OrigenProyecto } from '../componentes/ProyectoDetalle'
import ProyectoEditor from '../componentes/ProyectoEditor'

export function abrirProyecto(ruta: 'proyectos' | 'seguimiento', id: string) {
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  q.set('proyecto', id); window.location.hash = `/${ruta}?${q}`; window.dispatchEvent(new HashChangeEvent('hashchange'))
}
export default function Proyectos() {
  const { cartera, datos, gestiona, escala, unidad, seleccionarTerritorio, ir } = useEstado()
  const [busca, setBusca] = useState(''), [draft, setDraft] = useState<Proyecto | null>(null), [mensaje, setMensaje] = useState(''), [archivados, setArchivados] = useState(false)
  const registros = cartera.proyectos.filter((p) => gestiona ? archivados || !p.archivado : p.visible && !p.archivado)
  const lista = registros.filter((p) => proyectoEnSeleccion(p, datos, escala, unidad) && `${p.nombre} ${p.responsable}`.toLowerCase().includes(busca.toLowerCase()))
  const id = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('proyecto')
  const actual = registros.find((p) => p.id === id)
  const guardar = (p: Proyecto) => {
    if (!cartera.guardar(p)) return false
    setDraft(null); setMensaje('Proyecto guardado en este navegador.'); abrirProyecto('proyectos', p.id); return true
  }
  return <div className="workspace-page projects-page">
    <h1>{gestiona ? 'Del territorio a un proyecto.' : 'Proyectos para conocer y conversar.'}</h1><p className="page-lead">{gestiona ? 'Organiza intervenciones, aportes y metas sin confundirlos con resultados obtenidos.' : 'Consulta iniciativas visibles por territorio. Su presencia aquí no garantiza que puedas recibir un apoyo.'}</p>
    <div className="local-storage-notice"><strong>Demostración local</strong><span>Los registros se guardan solo en este navegador. Los ejemplos son simulaciones; los nuevos registros no están verificados. Exporta un respaldo para llevarlos a otra computadora.</span></div>
    <div className="workspace-actions no-print">{gestiona && <button type="button" className="primary-action" onClick={() => { setDraft(nuevoProyecto(escala, unidad ?? territorios(datos, escala)[0]?.id ?? '')); setMensaje('') }}>Registrar proyecto</button>}<button type="button" className="secondary-action" onClick={() => descargarArchivo('proyectos-valle-de-bravo.json', JSON.stringify({ schemaVersion: 1, proyectos: gestiona ? cartera.proyectos : registros }, null, 2))}>Exportar proyectos JSON</button>{gestiona && <label className="secondary-action file-action">Importar JSON<input type="file" accept=".json,application/json" onChange={async (e) => { const input = e.currentTarget; const f = input.files?.[0]; if (!f) return; if (f.size > 5_000_000) { setMensaje('El archivo supera el máximo de 5 MB. No se importó.'); return } if (cartera.importar(await f.text())) setMensaje('Importación completada sin sobrescribir registros previos.'); input.value = '' }} /></label>}{gestiona && <button type="button" className="text-action" onClick={() => { if (cartera.restablecerEjemplos()) setMensaje('Ejemplos restablecidos; se conservaron tus registros locales.') }}>Restablecer ejemplos</button>}</div>
    {cartera.error && <p role="alert" className="form-error">{cartera.error}</p>}{mensaje && <p role="status" className="saved-status">{mensaje}</p>}
    {!cartera.listo ? <p>Cargando proyectos locales…</p> : draft ? <ProyectoEditor key={draft.id} inicial={draft} alGuardar={guardar} alCancelar={() => setDraft(null)} /> : actual ? <><div className="workspace-actions no-print"><button type="button" className="text-action" onClick={() => { const q = new URLSearchParams(window.location.hash.split('?')[1] ?? ''); q.delete('proyecto'); window.location.hash = `/proyectos?${q}` }}>← Volver al catálogo</button>{gestiona && <button type="button" className="secondary-action" onClick={() => { setDraft(actual); setMensaje('') }}>Editar proyecto</button>}<button type="button" className="primary-action" onClick={() => abrirProyecto('seguimiento', actual.id)}>Ver seguimiento →</button>{gestiona && <button type="button" className="text-action" onClick={() => { if (cartera.guardar({ ...actual, archivado: !actual.archivado })) { ir('proyectos'); setMensaje(actual.archivado ? 'Proyecto reactivado.' : 'Proyecto archivado. Sigue incluido en tu respaldo JSON de gestión.') } }}>{actual.archivado ? 'Reactivar proyecto' : 'Archivar proyecto'}</button>}</div><ProyectoDetalle proyecto={actual} /></> : <>
      {id && <p role="status" className="workspace-note">Ese proyecto no está disponible en esta vista. Puedes consultar los registros visibles del catálogo.</p>}
      <div className="project-filters"><ControlesTerritorio variables={false} /><label className="field">Filtrar por unidad<select value={unidad ?? ''} onChange={(e) => seleccionarTerritorio(escala, e.target.value || null)}><option value="">Todas · sin restricción territorial</option>{territorios(datos, escala).map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></label><label className="field">Buscar proyecto<input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nombre o responsable" /></label></div>
      {gestiona && <label className="check-field"><input type="checkbox" checked={archivados} onChange={(e) => setArchivados(e.target.checked)} />Incluir proyectos archivados</label>}<p className="catalog-count">{lista.length} proyectos {unidad ? 'asociados a localidades de la unidad seleccionada' : 'en el catálogo del piloto, de las tres escalas'} · {gestiona ? 'vista de gestión' : 'consulta comunitaria'}</p>
      <div className="project-catalog">{lista.map((p) => <article className="project-card" key={p.id}><OrigenProyecto proyecto={p} /><div className="card-meta"><span>{p.estado}</span><span>{p.escala}{p.escala !== 'localidad' && ' modelada'}</span></div><h2>{p.nombre}</h2><p>{p.descripcion}</p><p className="card-counts">{p.componentes.length} componentes · {p.aportes.length} aportes · {p.indicadores.length} indicadores</p><button type="button" className="text-action" onClick={() => { setMensaje(''); abrirProyecto('proyectos', p.id) }}>Abrir proyecto →</button></article>)}</div>{!lista.length && <div className="empty-state"><h2>No hay proyectos en esta selección.</h2><p>Prueba otro territorio o busca por otro nombre. No se infiere que no existan iniciativas fuera de este registro local.</p></div>}
    </>}
  </div>
}
