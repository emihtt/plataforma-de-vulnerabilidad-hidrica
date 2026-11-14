import { expect, it } from 'vitest'
import { leerLluviaGuardada, resumirLluvia, validarLluvia, type LluviaGuardada } from './lluvia'

const guardado = (): LluviaGuardada => ({ consultado: '2026-11-14T12:00:00Z', dias: Array.from({ length: 44 }, (_, i) => ({ fecha: new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10), mm: 1, prob: null, tmax: null, tmin: null })) })
it('acumula exactamente los 30 dias calendario anteriores a la consulta', () => {
  const r = resumirLluvia(guardado(), null)
  expect(r.acumulado30).toBe(30)
  expect(r.ultimos30[0].fecha).toBe('2026-10-15')
  expect(r.hasta).toBe('2026-11-13')
})

it('rechaza copias dañadas sin romper el resto de la aplicación', () => {
  for (const raw of ['{', '{}', '{"consultado":"no-es-fecha","dias":[]}', '{"consultado":"2026-11-14T12:00:00Z","dias":{}}']) expect(leerLluviaGuardada(raw)).toBeNull()
  expect(resumirLluvia({} as LluviaGuardada, null).acumulado30).toBeNull()
  const g = guardado()
  g.dias[0].mm = -1
  expect(validarLluvia(g)).toBe(false)
  g.dias[0].mm = 1
  g.dias.push(g.dias[0])
  expect(validarLluvia(g)).toBe(false)
})

it('usa el día de México aunque la computadora esté en otra zona horaria', () => {
  const g = guardado()
  g.consultado = '2026-11-15T02:00:00Z' // Aún es 14 de noviembre en Valle de Bravo.
  expect(resumirLluvia(g, null).hasta).toBe('2026-11-13')
})
it('no inventa ceros ni rellena huecos con datos anteriores', () => {
  const g = guardado()
  g.dias.find((d) => d.fecha === '2026-11-05')!.mm = null
  expect(resumirLluvia(g, null).acumulado30).toBeNull()
  g.dias = g.dias.filter((d) => d.fecha !== '2026-11-05')
  expect(resumirLluvia(g, null).acumulado30).toBeNull()
  expect(resumirLluvia(g, null).pctNormal).toBeNull()
})
