import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { useEstado } from '../lib/contexto'
import type { Localidad } from '../lib/datos'
import { MESES_CORTOS, dec, num, pct } from '../lib/formato'
import { COLOR_CLASE, COMPONENTES } from '../lib/indice'
import { Aviso, Dato, ETIQUETA_V0, Estimacion, Icono, Pie, Supuesto } from './ui'

const DIAS_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

function Bloque({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-borde py-3">
      <h3 className="m-0 mb-1.5 text-[16px] font-extrabold">{titulo}</h3>
      {children}
    </section>
  )
}

export default function Ficha({ loc, alCerrar }: { loc: Localidad; alCerrar: () => void }) {
  const { datos, porClave, pesos, pesosBase } = useEstado()
  const [arrastre, setArrastre] = useState(0)
  const inicio = useRef<number | null>(null)
  const cuerpo = useRef<HTMLDivElement>(null)
  const par = datos.resumen.parametros.captacion_lluvia
  const pr = porClave.get(loc.cvegeo)
  const pesosCambiados = (Object.keys(pesos) as (keyof typeof pesos)[]).some((k) => Math.abs(pesos[k] - pesosBase[k]) > 1e-6)

  useEffect(() => {
    cuerpo.current?.scrollTo(0, 0)
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [loc.cvegeo, alCerrar])

  // Cerrar con gesto: arrastrar el encabezado hacia abajo
  const gestos = {
    onPointerDown: (e: React.PointerEvent) => {
      inicio.current = e.clientY
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (inicio.current !== null) setArrastre(Math.max(0, e.clientY - inicio.current))
    },
    onPointerUp: () => {
      if (arrastre > 90) alCerrar()
      inicio.current = null
      setArrastre(0)
    },
    onPointerCancel: () => {
      inicio.current = null
      setArrastre(0)
    },
  }

  const sc = loc.scall
  const tanque = sc?.tanques[String(par.tanque_referencia_litros)]
  const serie = sc
    ? sc.captable_mensual_l.map((l, i) => ({ mes: MESES_CORTOS[i], captable: Math.round(l), demanda: Math.round(sc.demanda_l_dia * DIAS_MES[i]) }))
    : []

  return (
    <div className="fixed inset-0 z-30 mx-auto flex max-w-[560px] flex-col justify-end" role="dialog" aria-modal="true" aria-label={`Ficha de ${loc.nombre}`}>
      <button type="button" aria-label="Cerrar ficha" onClick={alCerrar} className="min-h-0 flex-1 border-0 bg-black/35" />
      <div
        className="flex max-h-[86%] flex-col rounded-t-2xl bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.2)]"
        style={{ transform: `translateY(${arrastre}px)`, transition: arrastre ? 'none' : 'transform 0.15s' }}
      >
        <div {...gestos} className="shrink-0 cursor-grab touch-none px-4 pt-2 pb-2">
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-borde" aria-hidden />
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-[21px] font-extrabold leading-tight">{loc.nombre}</h2>
              <p className="m-0 text-[14px] text-gris">
                {loc.es_cabecera ? 'Cabecera municipal' : `A ${dec(loc.dist_cabecera_km)} km de la cabecera, en línea recta`} · {num(loc.altitud_m)} m de altitud
              </p>
            </div>
            <button
              type="button"
              onClick={alCerrar}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Cerrar"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-borde bg-white"
            >
              <Icono nombre="cerrar" tam={20} />
            </button>
          </div>
        </div>

        <div ref={cuerpo} className="min-h-0 overflow-y-auto px-4 pb-6">
          <p className="m-0 mb-2 text-[13px] font-semibold text-gris">{ETIQUETA_V0}</p>
          <div className="grid grid-cols-2 gap-2 pb-3">
            <div className="rounded-lg bg-fondo p-2.5">
              <div className="cifra text-[22px] font-extrabold leading-none">{num(loc.pob_total)}</div>
              <div className="text-[14px] text-gris">habitantes (2020)</div>
            </div>
            <div className="rounded-lg bg-fondo p-2.5">
              <div className="cifra text-[22px] font-extrabold leading-none">{num(loc.viv_hab)}</div>
              <div className="text-[14px] text-gris">viviendas habitadas</div>
            </div>
          </div>

          {loc.enmascarada ? (
            <>
              <Aviso>
                El censo no publica servicios en localidades de una o dos viviendas para proteger la confidencialidad. Aquí hace falta información levantada con la
                comunidad.
              </Aviso>
              <Pie>Fuente: INEGI, Censo de Población y Vivienda 2020. Esta localidad no entra en la lista de prioridades.</Pie>
            </>
          ) : (
            <>
              <Bloque titulo="Agua y saneamiento">
                <Dato rotulo="Viviendas sin agua entubada">
                  {num(loc.viv_sin_agua)} de {num(loc.viv_caract)} ({pct(loc.pct_sin_agua)})
                </Dato>
                <Dato
                  rotulo={
                    <>
                      Personas en esas viviendas <Estimacion />
                    </>
                  }
                >
                  {num(loc.pers_sin_agua_est)}
                </Dato>
                <Dato rotulo="Viviendas con tinaco">{pct(loc.pct_tinaco)}</Dato>
                <Dato rotulo="Viviendas con cisterna o aljibe">{pct(loc.pct_cisterna)}</Dato>
                <Dato rotulo="Viviendas sin drenaje">
                  {num(loc.viv_sin_drenaje)} ({pct(loc.pct_sin_drenaje)})
                </Dato>
                <Pie>INEGI, Censo 2020. Agua entubada no significa agua todos los días ni agua potable.</Pie>
              </Bloque>

              <Bloque titulo="Vulnerabilidad">
                <Dato rotulo="Grado de marginación">{loc.marg_grado ?? 'sin dato'}</Dato>
                <Dato rotulo="Población en hogares indígenas">
                  {num(loc.pob_hog_indigena)} ({pct(loc.pct_hog_indigena)})
                </Dato>
                <Dato rotulo="Hablantes de lengua indígena (3 años y más)">{num(loc.hablantes_li)}</Dato>
                <Pie>Conapo, índice de marginación por localidad 2020; INEGI, Censo 2020.</Pie>
              </Bloque>

              {pr && loc.iphc_componentes && (
                <Bloque
                  titulo={
                    <>
                      Prioridad <Supuesto>índice preliminar</Supuesto>
                    </>
                  }
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="rounded-full border border-tinta/30 px-2.5 py-1 text-[14px] font-extrabold"
                      style={{ background: COLOR_CLASE[pr.clase], color: pr.clase === 'Muy alta' || pr.clase === 'Alta' ? '#fff' : '#1A1A1A' }}
                    >
                      {pr.clase}
                    </span>
                    <span className="cifra text-[15px]">
                      Lugar <strong>{pr.lugar}</strong> de {porClave.size} · índice <strong>{pr.indice.toFixed(2)}</strong>
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {COMPONENTES.map((c) => {
                      const v = loc.iphc_componentes![c.clave]
                      return (
                        <div key={c.clave}>
                          <div className="flex justify-between text-[14px]">
                            <span>
                              {c.nombre} <span className="text-meta">· peso {Math.round(pesos[c.clave] * 100)} %</span>
                            </span>
                            <span className="cifra font-bold">{v === null ? 'sin dato' : Math.round(v * 100)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-fondo">
                            <div className="h-2 rounded-full bg-p4" style={{ width: `${(v ?? 0) * 100}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <Pie>
                    Cada barra es la posición de la localidad entre las {porClave.size} con datos (0 = la de menor carencia, 100 = la de mayor).
                    {pesosCambiados
                      ? ' Estás viendo el orden con los pesos que moviste en Prioridades.'
                      : loc.iphc_robustez !== undefined &&
                        ` Queda en prioridad muy alta en ${Math.round(loc.iphc_robustez * 100)} de cada 100 combinaciones de pesos.`}{' '}
                    No es una medición oficial.
                  </Pie>
                </Bloque>
              )}

              {sc && (
                <Bloque
                  titulo={
                    <>
                      Captación de lluvia <Supuesto />
                    </>
                  }
                >
                  <Dato rotulo={`Lluvia promedio al año (${par.anios_serie[0]}–${par.anios_serie[1]})`}>{num(loc.lluvia_anual_mm)} mm</Dato>
                  <Dato rotulo={`Meses secos seguidos (menos de ${par.umbral_mes_seco_mm} mm)`}>{num(loc.meses_secos)}</Dato>
                  <Dato rotulo="Demanda básica que cubriría la lluvia de un techo, en el año">{pct(sc.cobertura_potencial)}</Dato>
                  {tanque && <Dato rotulo={`Meses al año con la demanda cubierta, con tanque de ${num(par.tanque_referencia_litros)} L`}>{dec(tanque.meses_autonomia)}</Dato>}
                  <div className="mt-3 h-44" role="img" aria-label="Gráfica mensual de litros de lluvia captables en un techo frente a la demanda de una vivienda">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={serie} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                        <CartesianGrid stroke="#DADDE0" vertical={false} />
                        <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#6B6B6B' }} interval={0} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: '#6B6B6B' }} tickFormatter={(v: number) => `${Math.round(v / 1000)} mil`} width={52} tickLine={false} axisLine={false} />
                        <Bar dataKey="captable" fill="#4DBDAF" isAnimationActive={false} />
                        <Line dataKey="demanda" stroke="#1A1A1A" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="m-0 mt-1 flex flex-wrap gap-x-4 text-[13px] text-gris">
                    <span>
                      <span className="mr-1 inline-block h-2.5 w-2.5 bg-p3 align-middle" /> Litros captables al mes
                    </span>
                    <span>
                      <span className="mr-1 inline-block w-5 border-t-2 border-dashed border-tinta align-middle" /> Demanda de una vivienda
                    </span>
                  </p>
                  <Pie>
                    Supuestos por validar: techo de {par.area_techo_m2} m², {par.dotacion_l_persona_dia} litros por persona al día, {dec(sc.personas_por_vivienda)}{' '}
                    personas por vivienda (promedio de la localidad), se aprovecha {Math.round(par.coef_escurrimiento * 100)} % de la lluvia. La captación cubre
                    sobre todo los meses de lluvia; en los meses secos hace falta almacenamiento grande u otra fuente. Lluvia: {loc.lluvia_fuente}, un modelo en
                    malla, no una estación en la comunidad.
                  </Pie>
                </Bloque>
              )}

              <Bloque titulo="Conviene evaluar">
                {loc.intervenciones && loc.intervenciones.length > 0 ? (
                  <ul className="m-0 list-none space-y-2 p-0">
                    {loc.intervenciones.map((i) => (
                      <li key={i.tipo} className="rounded-lg bg-fondo p-2.5">
                        <div className="font-bold">Candidata a: {i.tipo.charAt(0).toLowerCase() + i.tipo.slice(1)}</div>
                        <div className="text-[14px] text-gris">{i.razon}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-gris">Con las reglas de esta versión no sale ninguna intervención candidata.</p>
                )}
                <Pie>
                  <Supuesto>umbrales por validar</Supuesto> Son candidatas a evaluar en campo con la comunidad; no son recomendaciones técnicas.
                </Pie>
              </Bloque>

              <Pie>Las cifras de vivienda y población son del Censo 2020: no dicen cómo está hoy la comunidad. Datos generados el {datos.resumen.generado}.</Pie>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
