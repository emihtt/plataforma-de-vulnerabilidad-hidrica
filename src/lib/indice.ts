// Misma fórmula que pipeline/formulas.py (indice_ponderado y clases_por_quintil),
// para que los controles de pesos recalculen en el navegador.
import type { Componente, Localidad, Pesos } from './datos'

export const COMPONENTES: { clave: Componente; nombre: string; detalle: string; aproximado?: boolean }[] = [
  { clave: 'sin_agua_entubada', nombre: 'Sin agua entubada', detalle: 'Viviendas sin agua entubada' },
  { clave: 'marginacion', nombre: 'Marginación', detalle: 'Índice de marginación de Conapo' },
  { clave: 'aislamiento', nombre: 'Aislamiento', detalle: 'Distancia en línea recta a la cabecera' },
  { clave: 'sin_almacenamiento', nombre: 'Almacenamiento por verificar', detalle: 'Cota superior sin tinaco ni cisterna; cruce desconocido', aproximado: true },
  { clave: 'sin_drenaje', nombre: 'Sin drenaje', detalle: 'Viviendas sin drenaje' },
  { clave: 'hogares_indigenas', nombre: 'Hogares indígenas', detalle: 'Población en hogares indígenas' },
]

export const CLASES = ['Muy alta', 'Alta', 'Media', 'Baja', 'Muy baja'] as const
export type Clase = (typeof CLASES)[number]

// del claro al oscuro: la prioridad más alta es la más oscura
export const COLOR_CLASE: Record<Clase, string> = {
  'Muy alta': '#0B4F47',
  Alta: '#008B7B',
  Media: '#4DBDAF',
  Baja: '#9FD9D0',
  'Muy baja': '#E3F4F1',
}
export const ESCALA = ['#E3F4F1', '#9FD9D0', '#4DBDAF', '#008B7B', '#0B4F47']

export function indicePonderado(rangos: Partial<Record<Componente, number | null>>, pesos: Pesos): number | null {
  let suma = 0
  let sumaPesos = 0
  for (const k of Object.keys(pesos) as Componente[]) {
    const r = rangos[k]
    if (r === null || r === undefined || !Number.isFinite(r) || !Number.isFinite(pesos[k]) || pesos[k] <= 0) continue
    suma += pesos[k] * r
    sumaPesos += pesos[k]
  }
  return sumaPesos > 0 ? suma / sumaPesos : null
}

export interface Priorizada {
  loc: Localidad
  indice: number
  clase: Clase
  lugar: number
}

export function priorizar(localidades: Localidad[], pesos: Pesos): Priorizada[] {
  const conIndice = localidades
    .map((loc, i) => ({ loc, i, indice: loc.enmascarada || !loc.iphc_componentes ? null : indicePonderado(loc.iphc_componentes, pesos) }))
    .filter((x): x is { loc: Localidad; i: number; indice: number } => x.indice !== null)
  conIndice.sort((a, b) => b.indice - a.indice || a.i - b.i)
  const tam = Math.ceil(conIndice.length / CLASES.length)
  return conIndice.map((x, pos) => ({
    loc: x.loc,
    indice: x.indice,
    clase: CLASES[Math.min(Math.floor(pos / tam), CLASES.length - 1)],
    lugar: pos + 1,
  }))
}

export function normalizarPesos(crudos: Pesos): Pesos {
  const salida = { ...crudos }
  const claves = Object.keys(crudos) as Componente[]
  const maximo = Math.max(0, ...claves.map((k) => Number.isFinite(crudos[k]) ? crudos[k] : 0))
  for (const k of claves) salida[k] = maximo > 0 && Number.isFinite(crudos[k]) && crudos[k] > 0 ? crudos[k] / maximo : 0
  const total = Object.values(salida).reduce((a, b) => a + b, 0)
  for (const k of claves) salida[k] = total > 0 ? salida[k] / total : 0
  return salida
}

/** Una preferencia de otra escala no puede dejar sin peso todas las variables visibles. */
export function pesosActivos(crudos: Pesos, base: Pesos, variables: Componente[]): Pesos {
  const p = { ...crudos }
  for (const k of Object.keys(p) as Componente[]) if (!variables.includes(k)) p[k] = 0
  if (!variables.some((k) => Number.isFinite(p[k]) && p[k] > 0)) {
    for (const k of variables) p[k] = base[k] > 0 ? base[k] : 1
  }
  return normalizarPesos(p)
}

export function pesosIguales(a: Pesos, b: Pesos): boolean {
  return (Object.keys(a) as Componente[]).every((k) => Math.abs(a[k] - b[k]) < 1e-6)
}
