interface Canal {
  nombre: string
  url: string
}

export interface SituacionGuia {
  id: string
  titulo: string
  observar: string
  evidencia: string
  limite: string
  autoridad?: string
  canal?: Canal
}

interface ContenidoGuia {
  fechaBorrador: string
  fechaCorte: string | null
  situaciones: SituacionGuia[]
}

// Solo incorporar canales oficiales y una fecha de corte cuando Ana valide el contenido.
export const guia: ContenidoGuia = {
  fechaBorrador: '2026-11-25',
  fechaCorte: null,
  situaciones: [
    {
      id: 'tala', titulo: 'Tala o desmonte',
      observar: 'Dónde se retiraron árboles o vegetación y si el trabajo continúa.',
      evidencia: 'Fecha, ubicación aproximada y una vista general tomada desde un sitio seguro.',
      limite: 'Ver vegetación cortada no basta para determinar si existe autorización.',
    },
    {
      id: 'descarga', titulo: 'Descarga de aguas residuales',
      observar: 'Por dónde sale el líquido, hacia dónde corre y si lo has visto en más de una ocasión.',
      evidencia: 'Fecha, hora y lugar. Anota lo que notaste, sin acercarte ni tomar muestras.',
      limite: 'El color, la espuma o el olor, por sí solos, no identifican la sustancia ni su origen.',
    },
    {
      id: 'obra', titulo: 'Obra o relleno en un cauce',
      observar: 'Si hay tierra, escombro u obras dentro o junto al paso del agua.',
      evidencia: 'Una referencia del lugar y, si es seguro, una foto que muestre la obra y el cauce.',
      limite: 'La cercanía a un arroyo no basta para determinar si una obra incumple una regla.',
    },
    {
      id: 'retencion', titulo: 'Represa u olla que retiene un arroyo',
      observar: 'Si la estructura se ve conectada al cauce y si hay cambios visibles en el flujo.',
      evidencia: 'Ubicación aproximada y fechas en que viste la estructura o el cambio de flujo.',
      limite: 'Una imagen no demuestra de dónde viene el agua, quién la usa ni si cuenta con permiso.',
    },
    {
      id: 'tiradero', titulo: 'Tiradero en una barranca',
      observar: 'Qué residuos se ven desde lejos y si están junto al paso del agua.',
      evidencia: 'Lugar, fecha y una vista general. No toques ni muevas residuos.',
      limite: 'Ver residuos no identifica por sí solo a quien los dejó ni su procedencia.',
    },
    {
      id: 'servicio', titulo: 'Fuga o falta de servicio de agua',
      observar: 'Dónde se ve la fuga o desde cuándo falta el servicio y qué zona está afectada.',
      evidencia: 'Calle o referencia, horarios y folio, si ya existe. No publiques datos de vecinos.',
      limite: 'La falta de agua no demuestra contaminación ni identifica la causa del corte.',
    },
  ],
}
