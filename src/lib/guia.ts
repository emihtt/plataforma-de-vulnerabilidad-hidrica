// La guía «Qué hacer si ves…» se escribe en public/data/guia_canalizacion.md (contrato de archivos).
// Se importa como texto al compilar: queda dentro del paquete de la aplicación y funciona sin conexión.
import fuente from '../../public/data/guia_canalizacion.md?raw'
import { MESES } from './formato'

export const APARTADOS = [
  { clave: 'observar', titulo: 'Qué observar' },
  { clave: 'autoridad', titulo: 'A quién le toca' },
  { clave: 'canal', titulo: 'Canal oficial' },
  { clave: 'evidencia', titulo: 'Evidencia útil' },
  { clave: 'cautela', titulo: 'Qué no es denunciable o pide cautela' },
] as const
export type ClaveApartado = (typeof APARTADOS)[number]['clave']

/** Identificadores estables, en el orden de las situaciones del archivo. */
export const IDS_SITUACIONES = ['tala', 'descarga', 'obra', 'retencion', 'tiradero', 'servicio'] as const

export interface SituacionGuia {
  id: string
  numero: number
  titulo: string
  apartados: Record<ClaveApartado, string[]>
}

export interface CanalRevisado {
  canal: string
  enlace: string | null
  estado: string
}

export interface ContenidoGuia {
  titulo: string
  aviso: string
  avisoDetalle: string
  /** AAAA-MM-DD */
  fechaCorte: string
  notaCorte: string
  antes: string[]
  situaciones: SituacionGuia[]
  encabezadoEstado: string
  canales: CanalRevisado[]
}

function apartadosVacios(): Record<ClaveApartado, string[]> {
  return { observar: [], autoridad: [], canal: [], evidencia: [], cautela: [] }
}

/** Convierte el Markdown de la guía en datos. Falla con un mensaje claro si el archivo no sigue el formato acordado. */
export function leerGuia(md: string): ContenidoGuia {
  let titulo = ''
  let aviso = ''
  let avisoDetalle = ''
  let fechaCorte = ''
  let notaCorte = ''
  let encabezadoEstado = ''
  const antes: string[] = []
  const situaciones: SituacionGuia[] = []
  const canales: CanalRevisado[] = []
  let seccion: 'inicio' | 'antes' | 'situacion' | 'canales' = 'inicio'
  let actual: SituacionGuia | null = null
  let apartado: ClaveApartado | null = null

  for (const cruda of md.split(/\r?\n/)) {
    const linea = cruda.trim()
    if (!linea || linea === '---') continue
    let m: RegExpExecArray | null
    if ((m = /^# (.+)$/.exec(linea))) { titulo = m[1]; continue }
    if ((m = /^> \*\*Fecha de corte:\*\*\s*(\d{1,2}) de (\p{L}+) de (\d{4})\.\s*(.*)$/u.exec(linea))) {
      const mes = MESES.indexOf(m[2].toLowerCase()) + 1
      if (!mes) throw new Error(`Mes no reconocido en la fecha de corte: ${m[2]}`)
      fechaCorte = `${m[3]}-${String(mes).padStart(2, '0')}-${m[1].padStart(2, '0')}`
      notaCorte = m[4]
      continue
    }
    if ((m = /^> \*\*(.+?)\*\*\s*(.*)$/.exec(linea))) { aviso = m[1]; avisoDetalle = m[2]; continue }
    if (linea === '## Antes de empezar') { seccion = 'antes'; continue }
    if (linea === '## Canales revisados') { seccion = 'canales'; actual = null; continue }
    if ((m = /^## (\d+)\. (.+)$/.exec(linea))) {
      const id = IDS_SITUACIONES[situaciones.length]
      if (!id) throw new Error(`La guía tiene más situaciones de las acordadas: ${m[2]}`)
      actual = { id, numero: Number(m[1]), titulo: m[2], apartados: apartadosVacios() }
      situaciones.push(actual)
      seccion = 'situacion'
      apartado = null
      continue
    }
    if (seccion === 'situacion' && (m = /^\*\*(.+)\*\*$/.exec(linea))) {
      const encontrado = APARTADOS.find((a) => a.titulo === m![1])
      if (!encontrado) throw new Error(`Apartado desconocido en «${actual?.titulo}»: ${m[1]}`)
      apartado = encontrado.clave
      continue
    }
    if ((m = /^- (.+)$/.exec(linea))) {
      if (seccion === 'antes') antes.push(m[1])
      else if (seccion === 'situacion' && actual && apartado) actual.apartados[apartado].push(m[1])
      else throw new Error(`Viñeta fuera de un apartado: ${linea}`)
      continue
    }
    if (seccion === 'canales' && linea.startsWith('|')) {
      const celdas = linea.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      if (celdas.every((c) => /^-+$/.test(c))) continue
      if (!encabezadoEstado) { encabezadoEstado = celdas[2] ?? ''; continue }
      canales.push({ canal: celdas[0], enlace: /^https:\/\//.test(celdas[1]) ? celdas[1] : null, estado: celdas[2] ?? '' })
      continue
    }
    throw new Error(`Línea no reconocida en la guía: ${linea}`)
  }

  if (!titulo || !aviso || !fechaCorte) throw new Error('La guía debe tener título, aviso y fecha de corte.')
  if (situaciones.length !== IDS_SITUACIONES.length) throw new Error(`La guía debe tener ${IDS_SITUACIONES.length} situaciones; tiene ${situaciones.length}.`)
  for (const s of situaciones) {
    for (const a of APARTADOS) {
      if (!s.apartados[a.clave].length) throw new Error(`Falta «${a.titulo}» en «${s.titulo}».`)
    }
  }
  return { titulo, aviso, avisoDetalle, fechaCorte, notaCorte, antes, situaciones, encabezadoEstado, canales }
}

export type Fragmento =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'negrita'; texto: string }
  | { tipo: 'enlace' | 'correo' | 'telefono'; texto: string; href: string }

// Negritas, enlaces <https://…> o sueltos, correos y teléfonos de 10 dígitos («800 776 3372») o el 911.
const EN_LINEA = /\*\*(.+?)\*\*|<(https:\/\/[^\s>]+)>|(https:\/\/[^\s<>|]*[^\s<>|.,;:)])|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)|\b(\d{3} \d{3} \d{4}|911)\b/g

/** Divide una línea de la guía en fragmentos con enlaces que se pueden tocar. */
export function fragmentos(texto: string): Fragmento[] {
  const salida: Fragmento[] = []
  let desde = 0
  for (const m of texto.matchAll(EN_LINEA)) {
    if (m.index > desde) salida.push({ tipo: 'texto', texto: texto.slice(desde, m.index) })
    const [, negrita, auto, suelto, correo, telefono] = m
    if (negrita) salida.push({ tipo: 'negrita', texto: negrita })
    else if (auto || suelto) salida.push({ tipo: 'enlace', texto: auto ?? suelto, href: auto ?? suelto })
    else if (correo) salida.push({ tipo: 'correo', texto: correo, href: `mailto:${correo}` })
    else if (telefono) salida.push({ tipo: 'telefono', texto: telefono, href: telefono === '911' ? 'tel:911' : `tel:+52${telefono.replace(/\s/g, '')}` })
    desde = m.index + m[0].length
  }
  if (desde < texto.length) salida.push({ tipo: 'texto', texto: texto.slice(desde) })
  return salida
}

export const fuenteGuia = fuente
export const guia: ContenidoGuia = leerGuia(fuente)
