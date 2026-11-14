import { useEstado } from '../lib/contexto'
import { COMPONENTES, normalizarPesos } from '../lib/indice'
import { useState } from 'react'
import type { Pesos } from '../lib/datos'

export default function PesosUnidades() {
  const { variables, pesos, pesosCrudos, pesosBase, setPesos } = useEstado()
  const aPuntos = (p: Pesos) => Object.fromEntries(Object.entries(normalizarPesos(p)).map(([k, v]) => [k, Math.round(v * 100)])) as Pesos
  const [puntos, setPuntos] = useState(() => aPuntos(pesosCrudos))
  return <details className="unit-weights"><summary>Ajustar pesos de las variables activas · supuestos por validar</summary><div>{COMPONENTES.filter((c) => variables.includes(c.clave)).map((c) => <label key={c.clave}><span>{c.nombre}<strong>{Math.round(pesos[c.clave] * 100)} %</strong></span>{variables.length > 1 && <input type="range" min={0} max={100} step={5} aria-label={`Peso de ${c.nombre}`} value={puntos[c.clave]} onChange={(e) => { const nuevos = { ...puntos, [c.clave]: Number(e.target.value) }; if (variables.some((k) => nuevos[k] > 0)) { setPuntos(nuevos); setPesos(nuevos) } }} />}</label>)}</div><button type="button" className="text-action" onClick={() => { setPuntos(aPuntos(pesosBase)); setPesos(pesosBase) }}>Restablecer pesos</button><p>Solo participan las variables compatibles activas. Los pesos se guardan en este navegador y no validan la metodología.</p></details>
}
