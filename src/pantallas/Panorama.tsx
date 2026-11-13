import { Boton, Cifra, Estimacion, Pie, Semaforo, Supuesto, Tarjeta } from '../componentes/ui'
import { useEstado } from '../lib/contexto'
import { fechaCorta, fechaLarga, num, plural } from '../lib/formato'
import { senal } from '../lib/lluvia'

export default function Panorama() {
  const { datos, ir, lluvia } = useEstado()
  const c = datos.resumen.censo
  const presa = datos.presa
  const ultimo = presa?.serie[presa.serie.length - 1]
  const u = datos.resumen.parametros.semaforo
  const r = lluvia.resumen

  return (
    <div className="space-y-3 p-4">
      <Tarjeta>
        <p className="m-0 text-[20px] font-bold leading-snug">
          {ultimo ? (
            <>
              La presa está al <strong className="cifra font-extrabold text-verde-texto">{ultimo.porcentaje.toLocaleString('es-MX')} %</strong> (
              {fechaLarga(ultimo.fecha)}).{' '}
            </>
          ) : (
            <>Nivel de la presa: sin dato. </>
          )}
          En el municipio, <strong className="cifra font-extrabold text-verde-texto">{num(c.pers_sin_agua_est)} personas</strong> en{' '}
          <strong className="cifra font-extrabold text-verde-texto">{num(c.localidades_con_viv_sin_agua)} localidades</strong> viven en viviendas sin agua
          entubada (Censo 2020).
        </p>
        <Pie>
          Personas: <Estimacion /> viviendas sin agua entubada por el promedio de ocupantes de cada localidad.
          {ultimo?.origen === 'semilla' && ' Presa: último dato capturado a mano de una nota que cita a Conagua.'}
        </Pie>
      </Tarjeta>

      <div className="grid grid-cols-2 gap-3">
        <Cifra valor={num(c.pob_total)} rotulo="habitantes en el municipio" nota="Censo 2020" />
        <Cifra valor={num(c.localidades_con_datos)} rotulo="localidades con datos de servicios" nota={`de ${num(c.localidades_total)} en el censo`} />
        <Cifra valor={num(c.pers_sin_agua_est)} rotulo="personas en viviendas sin agua entubada" nota={`Estimación · ${num(c.viv_sin_agua)} viviendas`} />
        <Cifra valor={num(c.pob_hog_indigena_municipio)} rotulo="personas en hogares indígenas" nota="Censo 2020" />
      </div>

      <Tarjeta titulo="Lo que no se sabe">
        <p className="m-0">
          No hay datos de servicios para <strong className="cifra">{num(c.localidades_enmascaradas)}</strong>{' '}
          {plural(c.localidades_enmascaradas, 'localidad', 'localidades')} de una o dos viviendas, donde viven{' '}
          <strong className="cifra">{num(c.pob_localidades_enmascaradas)}</strong> personas.
        </p>
        <Pie>El censo no publica esos datos para proteger la confidencialidad. En el mapa aparecen como anillo gris.</Pie>
      </Tarjeta>

      <Tarjeta
        titulo={
          <>
            Semáforo hídrico <Supuesto>umbrales por validar</Supuesto>
          </>
        }
      >
        <div className="flex items-center justify-between gap-3 border-b border-borde py-2">
          <div>
            <div className="font-bold">Presa Valle de Bravo</div>
            <div className="text-[14px] text-gris">
              {ultimo ? `${ultimo.porcentaje.toLocaleString('es-MX')} % de llenado · ${fechaCorta(ultimo.fecha)}` : 'Sin dato'}
            </div>
          </div>
          <Semaforo estado={senal(ultimo?.porcentaje, u.presa_verde_desde, u.presa_amarillo_desde)} />
        </div>
        <div className="flex items-center justify-between gap-3 py-2">
          <div>
            <div className="font-bold">Lluvia de los últimos 30 días</div>
            <div className="text-[14px] text-gris">
              {r.pctNormal !== null && r.hasta
                ? `${num(r.pctNormal)} % de lo normal · al ${fechaCorta(r.hasta)}`
                : lluvia.estado === 'cargando'
                  ? 'Consultando…'
                  : 'Sin dato: no hubo conexión para consultarla'}
            </div>
          </div>
          <Semaforo estado={senal(r.pctNormal, u.lluvia30_verde_desde, u.lluvia30_amarillo_desde)} />
        </div>
        <Pie>
          Verde: presa en {u.presa_verde_desde} % o más y lluvia en {u.lluvia30_verde_desde} % o más de lo normal. Alerta: menos de {u.presa_amarillo_desde} %.
          Presa llena no significa agua en todas las casas.
        </Pie>
      </Tarjeta>

      <Boton onClick={() => ir('mapa')} className="w-full">
        Ver el mapa
      </Boton>

      <Pie>
        Fuentes: INEGI, Censo de Población y Vivienda 2020; Conagua (presa); Open-Meteo (lluvia). Datos generados el {fechaCorta(datos.resumen.generado)}.
      </Pie>
    </div>
  )
}
