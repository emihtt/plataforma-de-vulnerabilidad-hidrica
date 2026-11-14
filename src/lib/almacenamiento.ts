/** Límites de la proporción sin ninguno de dos equipamientos, sin conocer su cruce. */
export function limitesAlmacenamiento(n: number | null | undefined, tinacos: number | null | undefined, cisternas: number | null | undefined) {
  if (n == null || tinacos == null || cisternas == null || ![n, tinacos, cisternas].every(Number.isFinite) || n <= 0 || tinacos < 0 || cisternas < 0 || tinacos > n || cisternas > n) return null
  return { minimo: Math.max(0, 1 - (tinacos + cisternas) / n), maximo: 1 - Math.max(tinacos, cisternas) / n }
}
