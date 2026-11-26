import { expect, it } from 'vitest'
import { guia } from './guia'

it('cubre las seis situaciones acordadas con identificadores únicos', () => {
  expect(guia.situaciones.map(({ id }) => id)).toEqual(['tala', 'descarga', 'obra', 'retencion', 'tiradero', 'servicio'])
  for (const s of guia.situaciones) {
    expect([s.titulo, s.observar, s.evidencia, s.limite].every((texto) => texto.trim())).toBe(true)
  }
})

it('no da por oficiales contenidos sin fecha de corte y verifica la estructura al validarlos', () => {
  if (!guia.fechaCorte) {
    expect(guia.situaciones.every((s) => !s.autoridad && !s.canal)).toBe(true)
    return
  }
  expect(guia.fechaCorte).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  for (const s of guia.situaciones) {
    expect(s.autoridad?.trim()).toBeTruthy()
    expect(s.canal?.nombre.trim()).toBeTruthy()
    expect(s.canal?.url).toMatch(/^https:\/\//)
  }
})
