import type { Datos } from './datos'
import { territorios, type Escala } from './territorios'

export const PERFILES = [
  { id: 'organizacion', familia: 'gestion', nombre: 'Organizaciones que instalan soluciones', texto: 'Explora necesidades, registra componentes y sigue la implementación.' },
  { id: 'financiador', familia: 'gestion', nombre: 'Fundaciones, empresas e inversionistas', texto: 'Revisa fichas, aportes y metas por intervención con límites explícitos.' },
  { id: 'gobierno', familia: 'gestion', nombre: 'Gobiernos y organismos operadores', texto: 'Consulta la línea base y organiza proyectos y seguimiento territorial.' },
  { id: 'comunidad', familia: 'consulta', nombre: 'Comités de agua y organizaciones locales', texto: 'Conoce tu territorio y consulta proyectos que podrían interesarte.' },
  { id: 'cuenca', familia: 'consulta', nombre: 'Personas que cuidan la cuenca', texto: 'Explora unidades hidrográficas, proyectos e indicadores registrados.' },
] as const
export type Perfil = typeof PERFILES[number]['id']
export const ESTADOS_PROYECTO = ['Planeado', 'En ejecución', 'Concluido', 'Cancelado'] as const
export const ESTADOS_APORTE = ['Por gestionar', 'Solicitado', 'Confirmado', 'Recibido'] as const
export interface Intervencion { id: string; tipo: string; descripcion: string; personas: number | null; viviendas: number | null }
export interface Aporte { id: string; aportante: string; montoMXN: number | null; estado: typeof ESTADOS_APORTE[number]; componentes: string[] }
export interface Indicador { id: string; nombre: string; unidad: string; universo: string; metodo: string; fuente: string; componenteId: string | null; meta: number | null; mediciones: { fecha: string; valor: number | null; nota: string }[] }
export interface Proyecto {
  id: string; nombre: string; responsable: string; descripcion: string; escala: Escala; territorioId: string
  fechaInicio: string; fechaFin: string; estado: typeof ESTADOS_PROYECTO[number]
  visible: boolean; ejemplo: boolean; archivado: boolean
  componentes: Intervencion[]; aportes: Aporte[]; indicadores: Indicador[]
}
export interface ArchivoProyectos { schemaVersion: 1; proyectos: Proyecto[] }
export const CLAVE_PROYECTOS = 'agua-territorio:proyectos:v1'
export const nuevoId = () => crypto.randomUUID()
export function nuevoProyecto(escala: Escala, territorioId: string): Proyecto {
  return { id: nuevoId(), nombre: '', responsable: '', descripcion: '', escala, territorioId, fechaInicio: '', fechaFin: '', estado: 'Planeado', visible: false, ejemplo: false, archivado: false, componentes: [], aportes: [], indicadores: [] }
}
const fechaValida = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s
const texto = (v: unknown, obligatorio = false): v is string => typeof v === 'string' && v.length <= 10000 && (!obligatorio || v.trim().length > 0)
const numero = (v: unknown, entero = false) => v === null || typeof v === 'number' && Number.isFinite(v) && v >= 0 && (!entero || Number.isSafeInteger(v))
const objeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const idsUnicos = (a: { id: string }[]) => new Set(a.map((x) => x.id)).size === a.length
export function validarProyecto(v: unknown): asserts v is Proyecto {
  const fallo = (s: string): never => { throw new Error(s) }
  if (!objeto(v) || !texto(v.id, true) || !texto(v.nombre, true) || !texto(v.responsable, true) || !texto(v.descripcion) || !['localidad', 'cuenca', 'microcuenca'].includes(v.escala as string) || !texto(v.territorioId, true)) fallo('Completa nombre, responsable y territorio del proyecto.')
  const p = v as unknown as Proyecto
  if (!ESTADOS_PROYECTO.includes(p.estado) || [p.visible, p.ejemplo, p.archivado].some((x) => typeof x !== 'boolean') || !texto(p.fechaInicio) || !texto(p.fechaFin) || [p.fechaInicio, p.fechaFin].some((x) => x !== '' && !fechaValida(x)) || p.fechaInicio && p.fechaFin && p.fechaFin < p.fechaInicio) fallo('Revisa estado y fechas del proyecto.')
  if (![p.componentes, p.aportes, p.indicadores].every((a) => Array.isArray(a) && a.length <= 500)) fallo('El formato de componentes, aportes o indicadores no es válido.')
  for (const c of p.componentes) if (!objeto(c) || !texto(c.id, true) || !texto(c.tipo, true) || !texto(c.descripcion) || !numero(c.personas, true) || !numero(c.viviendas, true)) fallo('Cada componente requiere un tipo y metas enteras no negativas, o sin dato.')
  const componentes = new Set(p.componentes.map((c) => c.id))
  for (const a of p.aportes) if (!objeto(a) || !texto(a.id, true) || !texto(a.aportante, true) || !numero(a.montoMXN) || !ESTADOS_APORTE.includes(a.estado) || !Array.isArray(a.componentes) || new Set(a.componentes).size !== a.componentes.length || a.componentes.some((id) => !componentes.has(id))) fallo('Revisa aportante, monto, estado y componentes asociados.')
  for (const i of p.indicadores) {
    if (!objeto(i) || ![i.id, i.nombre, i.unidad, i.universo, i.metodo, i.fuente].every((x) => texto(x, true)) || !numero(i.meta) || i.componenteId !== null && !componentes.has(i.componenteId) || !Array.isArray(i.mediciones) || i.mediciones.length > 2000) fallo('El indicador necesita definición, unidad, universo, método y fuente.')
    for (const m of i.mediciones) if (!objeto(m) || typeof m.fecha !== 'string' || !fechaValida(m.fecha) || !numero(m.valor) || !texto(m.nota)) fallo('Cada medición requiere fecha válida y valor no negativo, o sin dato.')
    if (new Set(i.mediciones.map((m) => m.fecha)).size !== i.mediciones.length) fallo('No repitas la fecha dentro del mismo indicador.')
  }
  if (![p.componentes, p.aportes, p.indicadores].every(idsUnicos)) fallo('Hay identificadores repetidos dentro del proyecto.')
}
export function importarProyectos(raw: string, existentes: Proyecto[], datos: Datos): Proyecto[] {
  const j: unknown = JSON.parse(raw)
  if (!objeto(j) || j.schemaVersion !== 1 || !Array.isArray(j.proyectos) || j.proyectos.length > 500) throw new Error('Archivo de proyectos incompatible: se requiere schemaVersion 1.')
  const ids = new Set(existentes.map((p) => p.id))
  const result: Proyecto[] = []
  for (const p of j.proyectos) {
    validarProyecto(p)
    if (ids.has(p.id)) throw new Error(`El proyecto ${p.nombre} ya existe. No se sobrescribió ningún registro.`)
    if (!territorios(datos, p.escala).some((t) => t.id === p.territorioId)) throw new Error(`Territorio desconocido en ${p.nombre}.`)
    ids.add(p.id); result.push(p)
  }
  return result
}
export function cambioIndicador(i: Indicador) {
  const validas = i.mediciones.filter((m): m is typeof m & { valor: number } => m.valor !== null).sort((a, b) => a.fecha.localeCompare(b.fecha))
  if (validas.length < 2) return null
  const primera = validas[0], ultima = validas[validas.length - 1]
  return { primera, ultima, absoluto: ultima.valor - primera.valor, relativo: primera.valor !== 0 ? (ultima.valor - primera.valor) / primera.valor * 100 : null }
}
export function crearEjemplos(datos: Datos): Proyecto[] {
  return (['localidad', 'microcuenca', 'cuenca'] as Escala[]).flatMap((escala, n) => {
    const unidad = escala === 'localidad' ? '151100037' : datos.hidricas?.adscripciones['151100037']?.[escala].unidad ?? territorios(datos, escala)[0]?.id
    if (!unidad) return []
    const cid = `demo-componente-${n}`, id = `demo-proyecto-${escala}`
    return [{ id, nombre: ['Agua en casa · ejemplo', 'Cuidado del territorio · ejemplo', 'Colaboración regional · ejemplo'][n], responsable: 'Entidad demostrativa · no es una organización real', descripcion: 'Simulación para probar el flujo. No representa intervenciones, fondos ni resultados reales.', escala, territorioId: unidad,
      fechaInicio: '2026-10-01', fechaFin: '2027-03-31', estado: 'En ejecución', visible: true, ejemplo: true, archivado: false,
      componentes: [{ id: cid, tipo: n === 1 ? 'Restauración' : 'Captación de lluvia', descripcion: 'Componente ilustrativo; no es una recomendación técnica.', personas: 80, viviendas: 20 }, ...(n === 0 ? [{ id: 'demo-almacenamiento', tipo: 'Almacenamiento', descripcion: 'Puede compartir población objetivo con el primer componente.', personas: 80, viviendas: 20 }] : [])],
      aportes: [{ id: `demo-aporte-${n}`, aportante: 'Aportante ilustrativo A', montoMXN: 100000, estado: 'Solicitado', componentes: [cid] }, { id: `demo-aporte-b-${n}`, aportante: 'Aportante ilustrativo B', montoMXN: null, estado: 'Por gestionar', componentes: [cid] }],
      indicadores: [{ id: `demo-indicador-${n}`, nombre: 'Unidades de intervención instaladas', unidad: 'unidades', universo: 'El mismo componente del proyecto ilustrativo', metodo: 'Conteo acumulado demostrativo con la misma definición en ambas fechas', fuente: 'Datos simulados preparados para la demo', componenteId: cid, meta: 20, mediciones: [{ fecha: '2026-10-01', valor: 0, nota: 'Línea base simulada' }, { fecha: '2026-11-01', valor: 8, nota: 'Avance simulado; no acredita impacto' }] }],
    } satisfies Proyecto]
  })
}
export function proyectoEnSeleccion(p: Proyecto, datos: Datos, escala: Escala, unidad: string | null) {
  if (!unidad) return true
  if (p.escala === escala && p.territorioId === unidad) return true
  const seleccion = territorios(datos, escala).find((t) => t.id === unidad)
  const territorioProyecto = territorios(datos, p.escala).find((t) => t.id === p.territorioId)
  const claves = new Set(seleccion?.localidades.map((l) => l.cvegeo) ?? [])
  return territorioProyecto?.localidades.some((l) => claves.has(l.cvegeo)) ?? false
}
export function descargarArchivo(nombre: string, contenido: string, tipo = 'application/json') {
  const href = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const a = document.createElement('a'); a.href = href; a.download = nombre; a.click()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}
