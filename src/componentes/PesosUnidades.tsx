import { useEstado } from '../lib/contexto'
import { COMPONENTES } from '../lib/indice'
import { useControlesPesos } from '../lib/useControlesPesos'

export default function PesosUnidades() {
  const { variables, pesos } = useEstado()
  const { puntos, mover, restablecer } = useControlesPesos()
  return <details className="unit-weights"><summary>Ajustar pesos de las variables activas · supuestos por validar</summary><div>{COMPONENTES.filter((c) => variables.includes(c.clave)).map((c) => <label key={c.clave}><span>{c.nombre}<strong>{Math.round(pesos[c.clave] * 100)} %</strong></span>{variables.length > 1 && <input type="range" min={0} max={100} step={5} aria-label={`Peso de ${c.nombre}`} value={puntos[c.clave]} onChange={(e) => mover(c.clave, Number(e.target.value))} />}</label>)}</div><button type="button" className="text-action" onClick={restablecer}>Restablecer pesos</button><p>Solo participan las variables compatibles activas. Los pesos se guardan en este navegador y no validan la metodología.</p></details>
}
