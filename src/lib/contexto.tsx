import { createContext, useContext } from 'react'
import type { Datos, Pesos } from './datos'
import type { Priorizada } from './indice'
import type { EstadoLluvia, LluviaGuardada, ResumenLluvia } from './lluvia'

export type Ruta = 'panorama' | 'mapa' | 'prioridades' | 'agua' | 'usos' | 'fuentes' | 'acerca'

export interface Estado {
  datos: Datos
  pesos: Pesos // normalizados: suman 1
  pesosBase: Pesos
  setPesos: (p: Pesos) => void
  ranking: Priorizada[]
  porClave: Map<string, Priorizada>
  ir: (ruta: Ruta) => void
  abrirFicha: (cvegeo: string | null) => void
  iniciarRecorrido: () => void
  lluvia: { guardada: LluviaGuardada | null; estado: EstadoLluvia; resumen: ResumenLluvia }
}

export const Contexto = createContext<Estado | null>(null)

export function useEstado(): Estado {
  const e = useContext(Contexto)
  if (!e) throw new Error('Falta el contexto de la aplicación')
  return e
}

export function leerHash(): { ruta: Ruta; loc: string | null } {
  const h = window.location.hash.replace(/^#\/?/, '')
  const [camino, consulta] = h.split('?')
  const rutas: Ruta[] = ['panorama', 'mapa', 'prioridades', 'agua', 'usos', 'fuentes', 'acerca']
  const ruta = (rutas as string[]).includes(camino) ? (camino as Ruta) : 'panorama'
  const loc = new URLSearchParams(consulta ?? '').get('loc')
  return { ruta, loc }
}
