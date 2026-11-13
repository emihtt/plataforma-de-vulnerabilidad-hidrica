import { Pie, Tarjeta } from '../componentes/ui'
import { useEstado } from '../lib/contexto'
import { num } from '../lib/formato'

const USOS: { titulo: string; texto: string }[] = [
  {
    titulo: 'Para organizaciones que instalan soluciones de agua',
    texto: 'Saber en qué localidades trabajar primero, con qué tecnología y con qué línea base. Cada ficha sirve como insumo de una propuesta de financiamiento.',
  },
  {
    titulo: 'Para gobiernos municipales y organismos operadores',
    texto:
      'Ver las carencias localidad por localidad y dirigir la inversión social a donde hace más falta. La Ley General de Aguas pide dar seguimiento y evaluar la política de agua: esto es con qué hacerlo.',
  },
  {
    titulo: 'Para fundaciones, empresas con metas de agua e inversionistas de impacto',
    texto: 'Elegir sitios con criterios públicos y comparables, y medir después cuántas personas cambiaron su acceso al agua.',
  },
  {
    titulo: 'Para comités de agua y organizaciones locales',
    texto: 'Tener en la mano los datos de su comunidad para gestionar recursos y exigir derechos.',
  },
  {
    titulo: 'Para quienes cuidan la cuenca',
    texto: 'Reunir en un solo lugar las personas, el agua y el territorio, para que conservar el bosque y garantizar agua a las comunidades se planeen juntos.',
  },
  {
    titulo: 'Lo que sigue',
    texto: 'Calidad del agua, salud de la cuenca con imágenes de satélite, fuentes locales y seguimiento de resultados de cada intervención.',
  },
]

export default function Usos() {
  const { datos } = useEstado()
  const n = datos.nacional
  return (
    <div className="space-y-3 p-4">
      <h1 className="m-0 text-[22px] font-extrabold">Usos y escala</h1>
      {n && (
        <Tarjeta titulo="Población potencial">
          <p className="m-0 text-[17px] leading-snug">
            En México, <strong className="cifra text-verde-texto">{num(n.viviendas_sin_agua)} viviendas</strong>, donde viven alrededor de{' '}
            <strong className="cifra text-verde-texto">{num(n.personas_est)} personas</strong>, no tienen agua entubada (Censo 2020).{' '}
            <strong className="cifra text-verde-texto">{num(n.localidades_mitad_o_mas)}</strong> localidades tienen la mitad o más de sus viviendas en esa situación.
            El método que se prueba en Valle de Bravo se puede repetir en cualquiera de ellas con los mismos datos públicos.
          </p>
          <table className="mt-3 w-full border-collapse text-[14px]">
            <thead>
              <tr className="text-left text-gris">
                <th className="py-1 pr-2 font-bold">Tamaño de localidad</th>
                <th className="py-1 text-right font-bold">Viviendas sin agua entubada</th>
              </tr>
            </thead>
            <tbody>
              {n.por_tamano.map((t) => (
                <tr key={t.tamano} className="border-t border-borde">
                  <td className="py-1.5 pr-2">{t.tamano}</td>
                  <td className="cifra py-1.5 text-right font-bold">{num(t.viviendas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pie>
            INEGI, Censo de Población y Vivienda 2020, principales resultados por localidad. Personas: estimación (viviendas sin agua entubada por el promedio de
            ocupantes de cada entidad).
          </Pie>
        </Tarjeta>
      )}
      {USOS.map((u) => (
        <Tarjeta key={u.titulo} titulo={u.titulo}>
          <p className="m-0">{u.texto}</p>
        </Tarjeta>
      ))}
    </div>
  )
}
