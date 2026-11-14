import { useEstado } from '../lib/contexto'
import { territorios } from '../lib/territorios'
import { num } from '../lib/formato'
import { type Proyecto } from '../lib/proyectos'

export function OrigenProyecto({ proyecto: p }: { proyecto: Proyecto }) {
  return <p className={`project-origin ${p.ejemplo ? 'fiction' : ''}`}>{p.ejemplo ? 'Simulación · ejemplo que no representa proyectos, dinero ni resultados reales' : 'Registro local sin verificar · información capturada en este navegador'}</p>
}
export default function ProyectoDetalle({ proyecto: p }: { proyecto: Proyecto }) {
  const { datos } = useEstado()
  const t = territorios(datos, p.escala).find((t) => t.id === p.territorioId)
  const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 })
  return <article className="project-detail printable-project"><OrigenProyecto proyecto={p} /><div className="project-detail-heading"><div><p className="sheet-meta">{p.estado} · {p.visible ? 'Visible en consulta comunitaria' : 'Borrador de gestión'}</p><h2>{p.nombre}</h2></div><button type="button" className="secondary-action no-print" onClick={() => window.print()}>Imprimir ficha</button></div><p>{p.descripcion}</p><dl className="project-facts"><div><dt>Responsable</dt><dd>{p.responsable}</dd></div><div><dt>Territorio</dt><dd>{t?.nombre ?? 'Territorio no disponible'} · {p.escala}{p.escala !== 'localidad' ? ' modelada' : ''}</dd></div><div><dt>Periodo registrado</dt><dd>{p.fechaInicio || 'Inicio pendiente'} → {p.fechaFin || 'Fin pendiente'}</dd></div></dl>
    <h3>Componentes de intervención y población objetivo</h3><p className="workspace-note">Son metas por componente. Pueden incluir a las mismas personas o viviendas: no equivalen a beneficiarios únicos ni a resultados obtenidos.</p><div className="table-scroll"><table><thead><tr><th>Componente</th><th>Personas objetivo</th><th>Viviendas objetivo</th></tr></thead><tbody>{p.componentes.map((c) => <tr key={c.id}><td><strong>{c.tipo}</strong><small>{c.descripcion}</small></td><td>{num(c.personas)}</td><td>{num(c.viviendas)}</td></tr>)}</tbody></table></div>{!p.componentes.length && <p>Sin componentes registrados.</p>}
    <h3>Aportes financieros · separados de las intervenciones</h3>{p.aportes.map((a) => <section className="funding-row" key={a.id}><div><strong>{a.aportante}</strong><span>{a.estado}</span></div><p>{a.montoMXN === null ? 'Monto pendiente' : `${pesos.format(a.montoMXN)} · ${p.ejemplo ? 'ilustrativo' : 'registrado sin verificar'}`}</p><p>Componentes asociados: {a.componentes.length ? a.componentes.map((id) => p.componentes.find((c) => c.id === id)?.tipo).join(', ') : 'ninguno todavía'}.</p><small>La población objetivo se consulta en cada componente; no se vuelve a sumar por cada financiador. “Solicitado” o “por gestionar” no significa financiamiento obtenido.</small></section>)}{!p.aportes.length && <p>Sin aportes registrados.</p>}
    <h3>Fuentes y límites de la ficha</h3><p className="workspace-note">La línea base territorial es del Censo 2020 y no acredita necesidades actuales. Los registros del proyecto son {p.ejemplo ? 'simulados' : 'manuales y sin verificar'}. Se requieren participación comunitaria, validación técnica y comprobación de recursos antes de decisiones reales. Esta ficha no prueba impacto ni garantiza acceso a un apoyo.</p>
  </article>
}
