import { createContext, useContext } from 'react'
import type { Datos, Pesos } from './datos'
import type { Priorizada } from './indice'
import type { EstadoLluvia, LluviaGuardada, ResumenLluvia } from './lluvia'
import type { Perfil } from './proyectos'
import { COMPATIBLES, ESCALAS, type Escala } from './territorios'
import type { Componente } from './datos'
import type { useProyectos } from './useProyectos'

export type Ruta = 'panorama' | 'mapa' | 'prioridades' | 'agua' | 'usos' | 'fuentes' | 'acerca' | 'perfiles' | 'proyectos' | 'seguimiento' | 'territorio' | 'guia'

export interface Estado {
  datos: Datos
  pesos: Pesos // normalizados: suman 1
  pesosBase: Pesos
  pesosCrudos: Pesos
  setPesos: (p: Pesos) => void
  ranking: Priorizada[]
  porClave: Map<string, Priorizada>
  ir: (ruta: Ruta) => void
  abrirFicha: (cvegeo: string | null) => void
  iniciarRecorrido: () => void
  perfil: Perfil
  setPerfil: (perfil: Perfil) => void
  gestiona: boolean
  escala: Escala
  unidad: string | null
  variables: Componente[]
  alternarVariable: (clave: Componente) => void
  seleccionarTerritorio: (escala: Escala, id?: string | null) => void
  abrirTerritorio: (id: string) => void
  cartera: ReturnType<typeof useProyectos>
  lluvia: { guardada: LluviaGuardada | null; estado: EstadoLluvia; resumen: ResumenLluvia }
}

export const Contexto = createContext<Estado | null>(null)

export function useEstado(): Estado {
  const e = useContext(Contexto)
  if (!e) throw new Error('Falta el contexto de la aplicación')
  return e
}

export function leerHash() {
  const h = window.location.hash.replace(/^#\/?/, '')
  const [camino, consulta] = h.split('?')
  const rutas: Ruta[] = ['panorama', 'mapa', 'prioridades', 'agua', 'usos', 'fuentes', 'acerca', 'perfiles', 'proyectos', 'seguimiento', 'territorio', 'guia']
  const ruta = (rutas as string[]).includes(camino) ? (camino as Ruta) : 'panorama'
  const q = new URLSearchParams(consulta ?? '')
  const escala = ESCALAS.includes(q.get('escala') as Escala) ? q.get('escala') as Escala : 'localidad'
  const claves = q.get('variables')?.split(',') ?? ['sin_agua_entubada']
  const variables = [...new Set(claves.filter((c): c is Componente => COMPATIBLES[escala].includes(c as Componente)))]
  const aviso = (q.has('escala') && !ESCALAS.includes(q.get('escala') as Escala)) || variables.length !== new Set(claves).size
  return { ruta, loc: q.get('loc'), escala, unidad: q.get('unidad'), variables: variables.length ? variables : ['sin_agua_entubada'] as Componente[], aviso }
}

export function hashTerritorio(ruta: Ruta, escala: Escala, unidad: string | null, variables: Componente[], loc?: string | null) {
  const q = new URLSearchParams({ escala, variables: variables.join(',') })
  if (unidad) q.set('unidad', unidad)
  if (loc) q.set('loc', loc)
  return `/${ruta}?${q}`
}
