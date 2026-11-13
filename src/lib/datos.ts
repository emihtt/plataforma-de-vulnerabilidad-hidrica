// Tipos y carga de los archivos que genera el pipeline en public/data/.
import { useEffect, useState } from 'react'

export type Componente =
  | 'sin_agua_entubada'
  | 'marginacion'
  | 'aislamiento'
  | 'sin_almacenamiento'
  | 'sin_drenaje'
  | 'hogares_indigenas'

export type Pesos = Record<Componente, number>

export interface Tanque {
  confiabilidad_volumen: number
  confiabilidad_dias: number
  meses_autonomia: number
  racha_seca_max_dias: number
}

export interface Scall {
  personas_por_vivienda: number
  demanda_l_dia: number
  litros_captables_anio: number
  cobertura_potencial: number
  captable_mensual_l: number[]
  tanques: Record<string, Tanque>
}

export interface Localidad {
  cvegeo: string
  nombre: string
  enmascarada: boolean
  es_cabecera: boolean
  pob_total: number
  viv_total: number | null
  viv_hab: number | null
  altitud_m: number | null
  dist_cabecera_km: number
  dif_altitud_m: number | null
  lon: number
  lat: number
  // lo que sigue no existe en localidades enmascaradas
  viv_caract?: number
  prom_ocup?: number
  viv_sin_agua?: number
  pct_sin_agua?: number
  pers_sin_agua_est?: number
  viv_sin_drenaje?: number
  pct_sin_drenaje?: number
  viv_tinaco?: number
  viv_cisterna?: number
  pct_tinaco?: number
  pct_cisterna?: number
  pct_sin_almacenamiento_max?: number
  pob_hog_indigena?: number
  pct_hog_indigena?: number
  hablantes_li?: number
  marg_grado?: string | null
  marg_valor?: number | null
  marg_fuente?: string | null
  lluvia_anual_mm?: number
  lluvia_mensual_mm?: number[]
  meses_secos?: number
  lluvia_fuente?: string
  scall?: Scall
  iphc?: number
  iphc_clase?: string
  iphc_lugar?: number
  iphc_componentes?: Record<Componente, number | null>
  iphc_robustez?: number
  intervenciones?: { tipo: string; razon: string }[]
}

export interface Supuesto {
  descripcion: string
  razon: string | null
  valores: Record<string, unknown>
}

export interface Resumen {
  generado: string
  municipio: { nombre: string; clave: string; cabecera: { cvegeo: string; lat: number; lon: number; altitud_m: number } }
  censo: {
    fuente: string
    pob_total: number
    viv_caract: number
    localidades_total: number
    localidades_con_datos: number
    localidades_enmascaradas: number
    pob_localidades_enmascaradas: number
    viv_sin_agua: number
    viv_sin_agua_municipio: number
    pers_sin_agua_est: number
    localidades_con_viv_sin_agua: number
    viv_sin_drenaje: number
    pob_hog_indigena: number
    pob_hog_indigena_municipio: number
  }
  indice?: { nombre: string; pesos: Pesos; localidades: number; grupo_superior: number; simulaciones: number }
  lluvia?: { periodo: number[]; anual_mm_promedio_localidades: number; mensual_mm_promedio_localidades: number[]; fuente: string }
  supuestos: Record<string, Supuesto>
  parametros: {
    captacion_lluvia: {
      area_techo_m2: number
      coef_escurrimiento: number
      primer_lavado_mm: number
      dotacion_l_persona_dia: number
      tanque_referencia_litros: number
      anios_serie: number[]
      umbral_mes_seco_mm: number
    }
    semaforo: { presa_verde_desde: number; presa_amarillo_desde: number; lluvia30_verde_desde: number; lluvia30_amarillo_desde: number }
    indice_prioridad: { pesos: Pesos }
  }
}

export interface PuntoPresa {
  fecha: string
  porcentaje: number
  almacenamiento_mm3: number | null
  origen: 'servicio' | 'semilla'
  fuente?: string
  url?: string
  nota?: string | null
}

export interface Presa {
  capacidad_mm3: number | null
  origen: 'servicio' | 'semilla'
  ultima_actualizacion: string
  ultima_fecha_servicio: string | null
  serie: PuntoPresa[]
}

export interface Normales {
  punto: { lat: number; lon: number; nombre: string }
  periodo: number[]
  fuente: string
  normal_30d_mm: Record<string, number>
  normal_90d_mm: Record<string, number>
  mensual_mm: number[]
}

export interface Fuente {
  nombre: string
  institucion: string
  url?: string
  fecha_dato?: string | null
  fecha_descarga?: string
  licencia?: string
  estado: 'ok' | 'respaldo' | 'sin_dato'
  nota?: string
  usada_en?: string
}

export interface Nacional {
  viviendas_sin_agua: number
  personas_est: number
  localidades_mitad_o_mas: number
  por_tamano: { tamano: string; localidades: number | null; viviendas: number; personas_est: number }[]
  por_entidad: { entidad: string; viviendas: number; personas_est: number }[]
}

export interface PronosticoSMN {
  municipio: string
  emision: string
  descarga: string
  fuente: string
  dias: { fecha: string; tmax_c: number | null; tmin_c: number | null; lluvia_mm: number | null; prob_lluvia_pct: number | null; cielo: string | null }[]
}

export interface Datos {
  localidades: Localidad[]
  resumen: Resumen
  presa: Presa | null
  normales: Normales | null
  fuentes: { generado: string; fuentes: Record<string, Fuente> } | null
  nacional: Nacional | null
  smn: PronosticoSMN | null
}

export const rutaDatos = (archivo: string) => `${import.meta.env.BASE_URL}data/${archivo}`

async function traer<T>(archivo: string, opcional = false): Promise<T | null> {
  try {
    const r = await fetch(rutaDatos(archivo))
    if (!r.ok) throw new Error(`${archivo}: ${r.status}`)
    const tipo = r.headers.get('content-type') ?? ''
    if (opcional && tipo.includes('text/html')) return null // el servidor devolvió la página en lugar del archivo
    return (await r.json()) as T
  } catch (e) {
    if (opcional) return null
    throw e
  }
}

interface GeoLocalidades {
  features: { geometry: { coordinates: [number, number] }; properties: Omit<Localidad, 'lon' | 'lat'> }[]
}

export async function cargarDatos(): Promise<Datos> {
  const [geo, resumen, presa, normales, fuentes, nacional, smn] = await Promise.all([
    traer<GeoLocalidades>('localidades.geojson'),
    traer<Resumen>('resumen.json'),
    traer<Presa>('presa.json', true),
    traer<Normales>('normales_lluvia.json', true),
    traer<Datos['fuentes']>('fuentes.json', true),
    traer<Nacional>('nacional.json', true),
    traer<PronosticoSMN>('pronostico_smn.json', true),
  ])
  const localidades = geo!.features.map((f) => ({
    ...f.properties,
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  })) as Localidad[]
  return { localidades, resumen: resumen!, presa, normales, fuentes, nacional, smn }
}

export function useDatos() {
  const [datos, setDatos] = useState<Datos | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    cargarDatos().then(setDatos, (e) => setError(String(e)))
  }, [])
  return { datos, error }
}
