import { Pie, Supuesto, Tarjeta } from '../componentes/ui'
import { useEstado } from '../lib/contexto'
import { fechaCorta } from '../lib/formato'

const ESTADOS = {
  ok: { texto: 'Fuente principal', clase: 'bg-p1 text-[#00665b]' },
  respaldo: { texto: 'Se usó el respaldo', clase: 'bg-[#FFF3D6] text-[#7a5200]' },
  sin_dato: { texto: 'Sin dato', clase: 'bg-fondo text-gris' },
} as const

const NOMBRES: Record<string, string> = {
  sin_agua_entubada: 'Sin agua entubada',
  marginacion: 'Marginación',
  aislamiento: 'Aislamiento',
  sin_almacenamiento: 'Sin almacenamiento',
  sin_drenaje: 'Sin drenaje',
  hogares_indigenas: 'Hogares indígenas',
  area_techo_m2: 'Área de techo (m²)',
  coef_escurrimiento: 'Parte de la lluvia que se aprovecha',
  primer_lavado_mm: 'Primer lavado que se descarta (mm por día con lluvia)',
  dotacion_l_persona_dia: 'Litros por persona al día',
  tanques_litros: 'Tanques evaluados (litros)',
  tanque_referencia_litros: 'Tanque de referencia (litros)',
  anios_serie: 'Años de la serie de lluvia',
  umbral_mes_seco_mm: 'Mes seco: menos de (mm)',
  scall_cobertura_minima: 'Captación domiciliaria: cobertura mínima de la demanda',
  almacenamiento_carencia_minima: 'Verificar almacenamiento: umbral sobre la cota superior (no mínimo observado)',
  saneamiento_carencia_minima: 'Saneamiento: viviendas sin drenaje, desde',
  red_distancia_maxima_km: 'Extensión de red: distancia máxima (km)',
  red_cobertura_vecina_minima: 'Extensión de red: cobertura mínima de la localidad vecina',
  red_poblacion_vecina_minima: 'Extensión de red: población mínima de la localidad vecina',
  presa_verde_desde: 'Presa en verde desde (% de llenado)',
  presa_amarillo_desde: 'Presa en atención desde (% de llenado)',
  lluvia30_verde_desde: 'Lluvia en verde desde (% de lo normal)',
  lluvia30_amarillo_desde: 'Lluvia en atención desde (% de lo normal)',
  simulaciones: 'Combinaciones de pesos simuladas',
  concentracion_dirichlet: 'Concentración de la simulación',
  semilla: 'Semilla de la simulación',
  clases: 'Número de clases',
  costo_unitario_scall_mxn: 'Costo por sistema de captación (pesos)',
  normalizacion: 'Normalización',
  nombre: 'Nombre',
}

function valor(v: unknown): string {
  if (v === null || v === undefined) return 'sin valor por defecto'
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'number' ? x.toLocaleString('es-MX') : String(x))).join(', ')
  if (typeof v === 'number') return v.toLocaleString('es-MX')
  if (v === 'rango_percentil') return 'rango percentil'
  return String(v)
}

export default function Fuentes() {
  const { datos } = useEstado()
  const fuentes = datos.fuentes ? Object.entries(datos.fuentes.fuentes) : []
  return (
    <div className="space-y-3 p-4">
      <h1 className="m-0 text-[22px] font-extrabold">Fuentes y límites</h1>

      <Tarjeta titulo="Límites">
        <p className="m-0">Esta es una versión 0 con datos públicos y supuestos de trabajo. La revisión científica y la validación con las comunidades están pendientes.</p>
        <ul className="my-2 space-y-1.5 pl-5">
          <li>Las cifras de vivienda y población son del Censo 2020. No dicen cómo está hoy cada comunidad.</li>
          <li>"Agua entubada" no significa agua todos los días ni agua potable.</li>
          <li>La lluvia viene de modelos en malla, no de una estación en cada comunidad.</li>
          <li>
            El censo no publica servicios en localidades de una o dos viviendas. Esas comunidades no aparecen en la lista de prioridades, y suelen ser las más
            requieren información acordada con la comunidad.
          </li>
          <li>El índice ordena localidades, no mide vulnerabilidad absoluta. Sus cinco clases se forman por posición. La estabilidad ante cambios de pesos no es una probabilidad de vulnerabilidad.</li>
          <li>La captación es una simulación histórica, no acredita potabilidad ni abasto garantizado. La distancia en línea recta no demuestra factibilidad de una red.</li>
          <li>Las intervenciones que se sugieren son candidatas a evaluar en campo con la comunidad; no son recomendaciones técnicas.</li>
        </ul>
        <p className="m-0">
          Si encuentras un error, escríbenos: <a className="font-bold text-verde-texto" href="mailto:contacto@regeneraconsultora.com.mx">contacto@regeneraconsultora.com.mx</a>
        </p>
      </Tarjeta>

      <Tarjeta titulo="Almacenamiento: lo que sí permite decir el censo">
        <p className="m-0">Sin el cruce entre viviendas con tinaco (T) y cisterna (C), la proporción sin ninguno solo puede acotarse dentro del mismo universo de viviendas (N).</p>
        <p className="my-3 rounded-lg bg-fondo p-3 font-mono text-[14px]">máx(0, 1 − (T + C) / N) ≤ proporción sin ambos ≤ 1 − máx(T, C) / N</p>
        <p className="m-0">El índice conserva la cota superior como variable exploratoria para no cambiar silenciosamente la metodología de esta demo. Las fichas muestran ambos extremos. Un máximo alto activa una pregunta de verificación, no una carencia mínima demostrada.</p>
      </Tarjeta>

      <Tarjeta titulo="Lluvia: comparación pendiente de homogeneizar">
        <p className="m-0">La referencia ERA5 de Open-Meteo usa 1991–2020 en un punto de la cabecera. La captación usa Daymet 2004–2023 en las localidades. Cambian producto, periodo y área: sus totales no permiten atribuir la diferencia a una causa ni medir un cambio climático.</p>
        <Pie>La razón entre lluvia reciente y normal es exploratoria; también requiere comprobar productos y condiciones equivalentes. Antes de decisiones: comparar periodos y áreas iguales, revisar unidades y contrastar con estaciones. No se ha hecho esa validación en esta candidata.</Pie>
      </Tarjeta>

      <Tarjeta titulo="Fuentes de datos">
        <h3 className="font-extrabold">Unidades hidrográficas de esta demo</h3><p>HydroBASINS v1c estándar, niveles 6 y 12: unidades de un modelo global, no límites oficiales mexicanos de cuenca o microcuenca. La estadística agregada cubre solo localidades de Valle de Bravo.</p><p className="my-2">Lehner, B. y Grill, G. (2013). HydroBASINS / HydroSHEDS, WWF. Adscripción por el punto censal con geometría original; simplificación de 25 m únicamente para dibujar. No se distribuyen personas por área.</p><p className="mb-4"><a className="text-verde-texto underline" href="https://www.hydrosheds.org/products/hydrobasins" target="_blank" rel="noreferrer">Fuente y documentación del modelo</a> · <a className="text-verde-texto underline" href={`${import.meta.env.BASE_URL}licencias/HydroSHEDS_TechDoc_v1_4.pdf`} target="_blank" rel="noreferrer">Condiciones de uso y licencia incluida</a></p><p className="mb-4">Proyectos, metas, aportes y series precargadas: ejemplos ficticios, sin dinero ni resultados reales. Los nuevos registros son capturas locales sin verificar; no se mezclan con las fuentes censales.</p>
        <p className="m-0 mb-2 text-[14px] text-gris">Las instituciones aparecen como fuente de los datos. Ninguna participa en este proyecto ni lo avala.</p>
        <ul className="m-0 list-none space-y-3 p-0">
          {fuentes.map(([clave, f]) => (
            <li key={clave} className="border-t border-borde pt-3 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{f.institucion}</strong>
                <span className={`rounded-full px-2 py-0.5 text-[12px] font-extrabold ${ESTADOS[f.estado].clase}`}>{ESTADOS[f.estado].texto}</span>
              </div>
              <div className="text-[15px]">{f.nombre}</div>
              <dl className="m-0 mt-1 grid grid-cols-[auto_1fr] gap-x-2 text-[13px] text-gris">
                {f.usada_en && (
                  <>
                    <dt className="font-bold">Se usa en</dt>
                    <dd className="m-0">{f.usada_en}</dd>
                  </>
                )}
                <dt className="font-bold">Fecha del dato</dt>
                <dd className="m-0">{f.fecha_dato ?? 'sin dato'}</dd>
                <dt className="font-bold">Descarga</dt>
                <dd className="m-0">{f.fecha_descarga ? fechaCorta(f.fecha_descarga) : 'sin dato'}</dd>
                {f.licencia && (
                  <>
                    <dt className="font-bold">Licencia</dt>
                    <dd className="m-0">{f.licencia}</dd>
                  </>
                )}
              </dl>
              {f.nota && <p className="m-0 mt-1 text-[13px] text-meta">{f.nota}</p>}
              {f.url && (
                <a className="break-all text-[13px] font-bold text-verde-texto" href={f.url} target="_blank" rel="noreferrer">
                  {f.url}
                </a>
              )}
            </li>
          ))}
          <li className="border-t border-borde pt-3">
            <strong>OpenFreeMap y OpenMapTiles</strong>
            <div className="text-[15px]">Mapa base que se suma cuando hay conexión</div>
            <p className="m-0 mt-1 text-[13px] text-meta">Datos © colaboradores de OpenStreetMap. Sin conexión, el mapa usa solo las capas propias.</p>
          </li>
        </ul>
      </Tarjeta>

      <Tarjeta
        titulo={
          <>
            Supuestos de trabajo <Supuesto>por validar</Supuesto>
          </>
        }
      >
        <p className="m-0 mb-2 text-[14px] text-gris">Estos valores no vienen de una fuente: son puntos de partida que revisará un equipo especialista.</p>
        {Object.entries(datos.resumen.supuestos).map(([clave, s]) => (
          <div key={clave} className="border-t border-borde py-2 first:border-t-0">
            <div className="font-bold">{s.descripcion}</div>
            {s.razon && <div className="text-[13px] text-meta">{s.razon}</div>}
            <dl className="m-0 mt-1 text-[14px]">
              {Object.entries(s.valores).flatMap(([k, v]) =>
                v !== null && typeof v === 'object' && !Array.isArray(v)
                  ? Object.entries(v as Record<string, unknown>).map(([k2, v2]) => [`Peso: ${NOMBRES[k2] ?? k2}`, v2] as const)
                  : [[NOMBRES[k] ?? k, v] as const],
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-gris">{k}</dt>
                  <dd className="cifra m-0 text-right font-bold">{valor(v)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </Tarjeta>

      <Pie>Datos generados el {fechaCorta(datos.resumen.generado)}.</Pie>
    </div>
  )
}
