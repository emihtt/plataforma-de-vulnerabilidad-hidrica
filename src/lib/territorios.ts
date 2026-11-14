import type { Componente, Datos, Localidad, Pesos } from './datos'
import type { Polygon, MultiPolygon } from 'geojson'
import { limitesAlmacenamiento } from './almacenamiento'
import { CLASES, indicePonderado } from './indice'

export type Escala = 'localidad' | 'cuenca' | 'microcuenca'
export const ESCALAS: Escala[] = ['localidad', 'cuenca', 'microcuenca']
export const NOMBRE_ESCALA = { localidad: 'Localidades', cuenca: 'Cuencas', microcuenca: 'Microcuencas' }
export interface UnidadFeature {
  type: 'Feature'
  geometry: Polygon | MultiPolygon
  properties: { id: string; escala: Escala; nombre: string; fuente_id: string; nivel: number; tipo: 'modelo'; localidades: string[] }
}
export interface Hidricas {
  type: 'FeatureCollection'
  features: UnidadFeature[]
  adscripciones: Record<string, Record<'cuenca' | 'microcuenca', { unidad: string | null; estado: string }>>
  fuentes: { id: string; nombre: string; url: string; documentacion: string; licencia: string; atribucion: string; tipo: string; crs: string; nivel: number }[]
  generado: string
  cobertura_estadistica: string
  limites: string
}
export interface Territorio {
  id: string; nombre: string; escala: Escala; localidades: Localidad[]; feature?: UnidadFeature
}
export const COMPATIBLES: Record<Escala, Componente[]> = {
  localidad: ['sin_agua_entubada', 'marginacion', 'aislamiento', 'sin_almacenamiento', 'sin_drenaje', 'hogares_indigenas'],
  cuenca: ['sin_agua_entubada', 'sin_almacenamiento', 'sin_drenaje'],
  microcuenca: ['sin_agua_entubada', 'sin_almacenamiento', 'sin_drenaje'],
}
export function territorios(datos: Datos, escala: Escala): Territorio[] {
  if (escala === 'localidad') return datos.localidades.map((l) => ({ id: l.cvegeo, nombre: l.nombre, escala, localidades: [l] }))
  const porClave = new Map(datos.localidades.map((l) => [l.cvegeo, l]))
  return (datos.hidricas?.features ?? []).filter((f) => f.properties.escala === escala).map((f) => ({
    id: f.properties.id, nombre: f.properties.nombre, escala, feature: f,
    localidades: f.properties.localidades.flatMap((c) => porClave.has(c) ? [porClave.get(c)!] : []),
  }))
}
export function lineaBase(t: Territorio) {
  const validas = t.localidades.filter((l) => !l.enmascarada && (l.viv_caract ?? 0) > 0)
  const tasa = (clave: 'viv_sin_agua' | 'viv_sin_drenaje') => {
    const filas = validas.filter((l) => typeof l[clave] === 'number' && Number.isFinite(l[clave]) && l[clave]! >= 0 && l[clave]! <= l.viv_caract!)
    const n = filas.reduce((s, l) => s + l.viv_caract!, 0)
    const valor = filas.reduce((s, l) => s + l[clave]!, 0)
    return { n, valor: n ? valor : null, proporcion: n ? valor / n : null, localidades: filas.length }
  }
  const almacenamiento = validas.flatMap((l) => {
    const b = limitesAlmacenamiento(l.viv_caract, l.viv_tinaco, l.viv_cisterna)
    return b ? [{ n: l.viv_caract!, ...b }] : []
  })
  const n = almacenamiento.reduce((s, l) => s + l.n, 0)
  return {
    poblacion: t.localidades.reduce((s, l) => s + l.pob_total, 0),
    totalLocalidades: t.localidades.length, conDatos: validas.length,
    agua: tasa('viv_sin_agua'), drenaje: tasa('viv_sin_drenaje'),
    almacenamiento: n ? { minimo: almacenamiento.reduce((s, l) => s + l.n * l.minimo, 0) / n, maximo: almacenamiento.reduce((s, l) => s + l.n * l.maximo, 0) / n, n, localidades: almacenamiento.length } : null,
  }
}
export function rangos(valores: (number | null)[]) {
  const presentes = valores.filter((v): v is number => v !== null && Number.isFinite(v))
  return valores.map((v) => v === null || !Number.isFinite(v) || !presentes.length ? null : (presentes.filter((x) => x < v).length + .5 * presentes.filter((x) => x === v).length) / presentes.length)
}
export function priorizarTerritorios(unidades: Territorio[], pesos: Pesos) {
  const bases = unidades.map(lineaBase)
  const valores = {
    sin_agua_entubada: rangos(bases.map((b) => b.agua.proporcion)),
    sin_drenaje: rangos(bases.map((b) => b.drenaje.proporcion)),
    sin_almacenamiento: rangos(bases.map((b) => b.almacenamiento?.maximo ?? null)),
  }
  const result = unidades.map((t, i) => ({ territorio: t, base: bases[i], indice: indicePonderado(Object.fromEntries(Object.entries(valores).map(([k, v]) => [k, v[i]])), pesos) }))
    .filter((r): r is typeof r & { indice: number } => r.indice !== null).sort((a, b) => b.indice - a.indice || a.territorio.id.localeCompare(b.territorio.id))
  return result.map((r, i) => ({ ...r, lugar: i + 1, clase: result.length >= 5 ? CLASES[Math.min(4, Math.floor(i / Math.ceil(result.length / 5)))] : null }))
}
