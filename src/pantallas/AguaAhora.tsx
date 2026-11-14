import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { Aviso, Pie, Semaforo, Supuesto, Tarjeta } from '../componentes/ui'
import { useEstado } from '../lib/contexto'
import { MESES_CORTOS, dec, diaSemana, fechaCorta, fechaLarga, hoyISO, num } from '../lib/formato'
import { senal } from '../lib/lluvia'

const eje = { fontSize: 12, fill: '#6B6B6B' }

function aTiempo(iso: string): number {
  const [a, m, d] = iso.split('-').map(Number)
  return Date.UTC(a, m - 1, d)
}

export default function AguaAhora() {
  const { datos, lluvia } = useEstado()
  const { presa, smn, resumen, normales } = datos
  const u = resumen.parametros.semaforo
  const r = lluvia.resumen
  const ultimo = presa?.serie[presa.serie.length - 1]

  const seriePresa = useMemo(() => (presa ? presa.serie.map((p) => ({ t: aTiempo(p.fecha), servicio: p.origen === 'servicio' ? p.porcentaje : null, semilla: p.origen === 'semilla' ? p.porcentaje : null })) : []), [presa])
  const anios = useMemo(() => {
    if (!seriePresa.length) return []
    const a0 = new Date(seriePresa[0].t).getUTCFullYear()
    const a1 = new Date(seriePresa[seriePresa.length - 1].t).getUTCFullYear()
    return Array.from({ length: a1 - a0 + 1 }, (_, i) => Date.UTC(a0 + i, 0, 1)).filter((t) => t >= seriePresa[0].t)
  }, [seriePresa])

  const barras = useMemo(
    () => [
      ...r.ultimos30.map((d) => ({ dia: d.fecha.slice(8), mm: d.mm, tipo: 'observado' })),
      ...r.pronostico.map((d) => ({ dia: d.fecha.slice(8), mm: d.mm, tipo: 'pronostico' })),
    ],
    [r],
  )
  const hoy = hoyISO()
  const diasSMN = smn?.dias.filter((d) => d.fecha >= hoy) ?? []
  const consultado = lluvia.guardada ? new Date(lluvia.guardada.consultado) : null
  const regimen = resumen.lluvia?.mensual_mm_promedio_localidades.map((mm, i) => ({ mes: MESES_CORTOS[i], mm }))

  return (
    <div className="space-y-3 p-4">
      <h1>Contexto hídrico, con fecha y fuente.</h1>
      <p className="page-lead">Los registros históricos y las capturas manuales no son información en tiempo real. La lluvia reciente y el pronóstico requieren una consulta externa.</p>
      <Tarjeta titulo="Presa Valle de Bravo">
        {ultimo && presa ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="cifra text-[34px] font-extrabold leading-none text-verde-texto">{ultimo.porcentaje.toLocaleString('es-MX')} %</div>
                <div className="text-[15px] text-gris">de llenado · {fechaLarga(ultimo.fecha)}</div>
              </div>
              <Semaforo estado={senal(ultimo.porcentaje, u.presa_verde_desde, u.presa_amarillo_desde)} />
            </div>
            {ultimo.origen === 'semilla' && (
              <div className="mt-2">
                <Aviso>Último dato capturado a mano de una nota de prensa que cita a Conagua ({ultimo.fuente}).</Aviso>
              </div>
            )}
            <div className="mt-3 h-48" role="img" aria-label="Serie del porcentaje de llenado de la presa desde 2023">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={seriePresa} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#DADDE0" vertical={false} />
                  <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} ticks={anios} tickFormatter={(t: number) => String(new Date(t).getUTCFullYear())} tick={eje} tickLine={false} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={eje} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v} %`} width={54} />
                  <ReferenceLine y={u.presa_verde_desde} stroke="#9896A4" strokeDasharray="3 3" />
                  <ReferenceLine y={u.presa_amarillo_desde} stroke="#9896A4" strokeDasharray="3 3" />
                  <Line dataKey="servicio" stroke="#008B7B" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line dataKey="semilla" stroke="none" isAnimationActive={false} dot={{ r: 4, fill: '#fff', stroke: '#1A1A1A', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <Pie>
              Línea: servicio de datos de Conagua, un corte por semana hasta el {fechaCorta(presa.ultima_fecha_servicio)}. Círculos: cortes capturados a mano de
              notas que citan a Conagua; entre ellos no hay datos y no se interpola. Líneas punteadas: umbrales del semáforo ({u.presa_amarillo_desde} y{' '}
              {u.presa_verde_desde} %) <Supuesto />. Presa llena no significa agua en todas las casas.
            </Pie>
          </>
        ) : (
          <p className="m-0 text-gris">Sin dato de la presa.</p>
        )}
      </Tarjeta>

      <Tarjeta titulo="Lluvia: últimos 30 días y pronóstico">
        {lluvia.estado === 'guardado' && consultado && (
          <div className="mb-2">
            <Aviso>Sin conexión. Se muestra la última consulta guardada, del {fechaLarga(lluvia.guardada!.consultado.slice(0, 10))}.</Aviso>
          </div>
        )}
        {barras.length > 0 ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="cifra text-[28px] font-extrabold leading-none text-verde-texto">{r.acumulado30 !== null ? `${dec(r.acumulado30)} mm` : 'sin dato'}</div>
                <div className="text-[15px] text-gris">
                  en 30 días{r.hasta ? `, al ${fechaCorta(r.hasta)}` : ''}
                  {r.normal30 !== null && r.pctNormal !== null && (
                    <>
                      {' '}
                      · lo normal son {dec(r.normal30)} mm (<strong className="text-tinta">{num(r.pctNormal)} %</strong>)
                    </>
                  )}
                </div>
              </div>
              <Semaforo estado={senal(r.pctNormal, u.lluvia30_verde_desde, u.lluvia30_amarillo_desde)} />
            </div>
            <div className="mt-3 h-44" role="img" aria-label="Lluvia diaria de los últimos 30 días y pronóstico de 7 días">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barras} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#DADDE0" vertical={false} />
                  <XAxis dataKey="dia" tick={eje} tickLine={false} interval={4} />
                  <YAxis tick={eje} tickLine={false} axisLine={false} width={54} tickFormatter={(v: number) => `${v} mm`} />
                  <Bar dataKey="mm" isAnimationActive={false}>
                    {barras.map((b, i) => (
                      <Cell key={i} fill={b.tipo === 'observado' ? '#008B7B' : '#FFFFFF'} stroke={b.tipo === 'observado' ? '#008B7B' : '#1A1A1A'} strokeDasharray={b.tipo === 'observado' ? undefined : '3 2'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="m-0 mt-1 flex flex-wrap gap-x-4 text-[13px] text-gris">
              <span>
                <span className="mr-1 inline-block h-2.5 w-2.5 bg-p4 align-middle" /> Últimos 30 días
              </span>
              <span>
                <span className="mr-1 inline-block h-2.5 w-2.5 border border-dashed border-tinta bg-white align-middle" /> Pronóstico de 7 días
              </span>
            </p>
            {r.pronostico.length > 0 && (
              <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[12px]">
                {r.pronostico.map((d) => (
                  <div key={d.fecha} className="rounded-md bg-fondo px-0.5 py-1">
                    <div className="font-bold">
                      {diaSemana(d.fecha)} {Number(d.fecha.slice(8))}
                    </div>
                    <div className="cifra font-extrabold text-verde-texto">{dec(d.mm)}</div>
                    <div className="text-meta">mm</div>
                  </div>
                ))}
              </div>
            )}
            <Pie>
              Open-Meteo, punto de la cabecera municipal; consultado el {consultado ? fechaLarga(lluvia.guardada!.consultado.slice(0, 10)) : 'sin fecha'}. La referencia histórica es ERA5,
              periodo {normales?.periodo.join('–')}. Es información modelada, no una estación. Comparación exploratoria: la equivalencia con el producto reciente está pendiente de validar. No es una anomalía climática validada. Umbrales del semáforo: {u.lluvia30_amarillo_desde} y{' '}
              {u.lluvia30_verde_desde} % de lo normal <Supuesto />.
            </Pie>
          </>
        ) : (
          <p className="m-0 text-gris">{lluvia.estado === 'cargando' ? 'Consultando la lluvia reciente…' : 'Sin dato: no hay conexión y este dispositivo no tiene una consulta guardada.'}</p>
        )}
      </Tarjeta>

      {smn && diasSMN.length > 0 && (
        <Tarjeta titulo="Pronóstico oficial">
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${diasSMN.length}, minmax(0, 1fr))` }}>
            {diasSMN.map((d) => (
              <div key={d.fecha} className="rounded-lg bg-fondo p-2 text-center">
                <div className="text-[14px] font-bold">
                  {diaSemana(d.fecha)} {Number(d.fecha.slice(8))}
                </div>
                <div className="cifra text-[17px] font-extrabold text-verde-texto">{dec(d.lluvia_mm)} mm</div>
                <div className="cifra text-[13px] text-gris">
                  {num(d.tmin_c)}° a {num(d.tmax_c)}°
                </div>
                <div className="text-[12px] leading-tight text-meta">{d.cielo}</div>
              </div>
            ))}
          </div>
          <Pie>
            Servicio Meteorológico Nacional (Conagua), pronóstico para el municipio de {smn.municipio}. Emitido el {fechaLarga(smn.emision)}; descargado el{' '}
            {fechaLarga(smn.descarga)}.
          </Pie>
        </Tarjeta>
      )}

      {regimen && resumen.lluvia && (
        <Tarjeta titulo="Cómo llueve en el año">
          <div className="h-40" role="img" aria-label="Lluvia mensual promedio de las localidades del municipio">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regimen} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#DADDE0" vertical={false} />
                <XAxis dataKey="mes" tick={eje} tickLine={false} interval={0} />
                <YAxis tick={eje} tickLine={false} axisLine={false} width={54} tickFormatter={(v: number) => `${v} mm`} />
                <Bar dataKey="mm" fill="#4DBDAF" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Pie>
            Promedio mensual de las localidades del municipio, {resumen.lluvia.periodo.join('–')}: {num(resumen.lluvia.anual_mm_promedio_localidades)} mm al año. Daymet,
            malla de 1 km (ORNL DAAC, NASA). Cambian producto, periodo y área respecto a la referencia ERA5 de Open-Meteo (1991–2020, cabecera). No se atribuye la diferencia a una causa. Falta una comparación bajo condiciones equivalentes y contraste con estaciones.
          </Pie>
        </Tarjeta>
      )}

      <Pie>Datos generados el {fechaCorta(resumen.generado)}. La presa y el pronóstico oficial se actualizan cada vez que se corre el proceso de datos.</Pie>
    </div>
  )
}
