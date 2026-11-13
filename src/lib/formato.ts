const entero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0, useGrouping: 'always' })
const unDecimal = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1, useGrouping: 'always' })

export const SIN_DATO = 'sin dato'

export function num(x: number | null | undefined): string {
  return x === null || x === undefined || Number.isNaN(x) ? SIN_DATO : entero.format(x)
}

export function dec(x: number | null | undefined): string {
  return x === null || x === undefined || Number.isNaN(x) ? SIN_DATO : unDecimal.format(x)
}

/** Proporción (0 a 1) como porcentaje sin decimales innecesarios. */
export function pct(x: number | null | undefined): string {
  if (x === null || x === undefined || Number.isNaN(x)) return SIN_DATO
  const v = x * 100
  if (v > 0 && v < 1) return 'menos de 1 %'
  return `${entero.format(v)} %`
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

function partes(iso: string): [number, number, number] {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  return [a, m, d]
}

/** '2026-11-05' -> '5 de noviembre de 2026' */
export function fechaLarga(iso: string | null | undefined): string {
  if (!iso) return SIN_DATO
  const [a, m, d] = partes(iso)
  return `${d} de ${MESES[m - 1]} de ${a}`
}

/** '2026-11-05' -> '5 nov 2026' */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return SIN_DATO
  const [a, m, d] = partes(iso)
  return `${d} ${MESES_CORTOS[m - 1]} ${a}`
}

export function diaSemana(iso: string): string {
  const [a, m, d] = partes(iso)
  return DIAS[new Date(a, m - 1, d).getDay()]
}

export function hoyISO(): string {
  const h = new Date()
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`
}

export function plural(n: number, uno: string, varios: string): string {
  return n === 1 ? uno : varios
}
