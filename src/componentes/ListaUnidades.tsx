import { useEstado } from '../lib/contexto'
import { priorizarTerritorios, territorios } from '../lib/territorios'
import { num } from '../lib/formato'

export default function ListaUnidades() {
  const { datos, escala, pesos, abrirTerritorio } = useEstado()
  const ranking = priorizarTerritorios(territorios(datos, escala), pesos)
  return <section className="unit-ranking"><h2>Prioridad relativa · {ranking.length} unidades con datos</h2><p>Comparación dentro de esta escala y solo con localidades del piloto. Con menos de cinco unidades no se asignan clases de prioridad.</p><ol>{ranking.map((r) => <li key={r.territorio.id}><button type="button" onClick={() => abrirTerritorio(r.territorio.id)}><span className="rank-position">{r.lugar}</span><span><strong>{r.territorio.nombre}</strong><small>{r.base.conDatos} de {r.base.totalLocalidades} localidades con servicios publicados · {num(r.base.agua.valor)} viviendas sin agua entubada</small></span><span>{ranking.length === 1 ? 'Sin comparación' : r.indice.toFixed(2)}<small>{r.clase ?? ''}</small></span></button></li>)}</ol>{!ranking.length && <p>Esta escala no tiene unidades con datos censales agregables.</p>}</section>
}
