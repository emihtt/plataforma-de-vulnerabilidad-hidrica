import { useEstado } from '../lib/contexto'
import { COMPONENTES } from '../lib/indice'
import { COMPATIBLES, ESCALAS, NOMBRE_ESCALA } from '../lib/territorios'

export default function ControlesTerritorio({ variables = true }: { variables?: boolean }) {
  const e = useEstado()
  return <div className="territory-controls">
    <div className="scale-switch" role="group" aria-label="Escala territorial">{ESCALAS.map((s) => <button type="button" key={s} aria-pressed={e.escala === s} onClick={() => e.seleccionarTerritorio(s)}>{NOMBRE_ESCALA[s]}{s !== 'localidad' && <small>Modelo HydroBASINS</small>}</button>)}</div>
    {variables && <details className="variable-picker"><summary>Variables activas: {e.variables.length} · agregar o retirar</summary><div>{COMPONENTES.map((c) => {
      const compatible = COMPATIBLES[e.escala].includes(c.clave), activa = e.variables.includes(c.clave)
      return <label key={c.clave}><input type="checkbox" checked={activa} disabled={!compatible || activa && e.variables.length === 1} onChange={() => e.alternarVariable(c.clave)} /><span><strong>{c.nombre}</strong><small>{compatible ? c.detalle : 'Agregación pendiente de método validado para esta escala'}</small></span></label>
    })}</div><p>Solo las variables activas participan en la prioridad. Se mantiene al menos una; sus pesos se normalizan a 100 %.</p></details>}
  </div>
}
