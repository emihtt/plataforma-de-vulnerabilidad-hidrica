import { useState } from 'react'
import type { Componente, Pesos } from './datos'
import { useEstado } from './contexto'
import { normalizarPesos } from './indice'

/** Conserva el movimiento del control y reconoce cambios de pesos desde otra escala. */
export function useControlesPesos() {
  const { pesosCrudos, pesosBase, pesos, variables, setPesos } = useEstado()
  const [entrada, setEntrada] = useState<{ origen: Pesos; puntos: Pesos } | null>(null)
  const aPuntos = () => {
    const p = normalizarPesos(pesosCrudos)
    for (const k of Object.keys(p) as Componente[]) p[k] = Math.round(p[k] * 100)
    if (!variables.some((k) => p[k] > 0)) for (const k of variables) p[k] = Math.round(pesos[k] * 100)
    return p
  }
  const puntos = entrada?.origen === pesosCrudos ? entrada.puntos : aPuntos()
  const mover = (clave: Componente, valor: number) => {
    const nuevos = { ...puntos, [clave]: valor }
    if (!variables.some((k) => nuevos[k] > 0)) return
    setEntrada({ origen: nuevos, puntos: nuevos })
    setPesos(nuevos)
  }
  const restablecer = () => { setEntrada(null); setPesos(pesosBase) }
  return { puntos, mover, restablecer }
}
