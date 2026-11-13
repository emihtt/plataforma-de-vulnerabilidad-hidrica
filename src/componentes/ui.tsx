import type { ReactNode } from 'react'
import type { Senal } from '../lib/lluvia'

export const ETIQUETA_V0 = 'Versión 0 · índices preliminares en validación'

export function EtiquetaV0() {
  return (
    <p className="m-0 border-b border-borde bg-white px-4 py-1 text-[13px] font-semibold text-gris">
      <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-morado align-middle" aria-hidden />
      {ETIQUETA_V0}
    </p>
  )
}

export function Tarjeta({ titulo, children, className = '' }: { titulo?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-borde bg-white p-4 ${className}`}>
      {titulo && <h2 className="m-0 mb-2 text-[17px] font-extrabold leading-tight">{titulo}</h2>}
      {children}
    </section>
  )
}

export function Cifra({ valor, rotulo, nota }: { valor: ReactNode; rotulo: ReactNode; nota?: ReactNode }) {
  return (
    <div className="rounded-xl border border-borde bg-white p-3">
      <div className="cifra text-[26px] font-extrabold leading-none text-verde-texto">{valor}</div>
      <div className="mt-1 text-[15px] leading-snug">{rotulo}</div>
      {nota && <div className="mt-1 text-[13px] leading-snug text-meta">{nota}</div>}
    </div>
  )
}

/** Marca visible de todo valor que no viene de una fuente. */
export function Supuesto({ children = 'supuesto por validar' }: { children?: ReactNode }) {
  return (
    <span className="inline-block rounded border border-morado px-1.5 py-px align-middle text-[12px] font-bold leading-tight text-[#4b3ba8]">
      {children}
    </span>
  )
}

export function Estimacion({ children = 'estimación' }: { children?: ReactNode }) {
  return (
    <span className="inline-block rounded border border-borde bg-fondo px-1.5 py-px align-middle text-[12px] font-bold leading-tight text-gris">
      {children}
    </span>
  )
}

export function Pie({ children }: { children: ReactNode }) {
  return <p className="m-0 mt-2 text-[13px] leading-snug text-meta">{children}</p>
}

export function Dato({ rotulo, children }: { rotulo: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-borde py-1.5 last:border-b-0">
      <span className="text-[15px] text-gris">{rotulo}</span>
      <span className="cifra shrink-0 whitespace-nowrap text-right text-[16px] font-bold">{children}</span>
    </div>
  )
}

const SENALES: Record<Senal, { texto: string; color: string; fondo: string; icono: ReactNode }> = {
  verde: {
    texto: 'En verde',
    color: '#00665b',
    fondo: '#E3F4F1',
    icono: <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />,
  },
  atencion: {
    texto: 'Atención',
    color: '#7a5200',
    fondo: '#FFF3D6',
    icono: (
      <>
        <path d="M12 3l10 18H2z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M12 10v5M12 17.6v.4" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </>
    ),
  },
  alerta: {
    texto: 'Alerta',
    color: '#8f1d1d',
    fondo: '#FBE4E1',
    icono: (
      <>
        <path d="M8 2h8l6 6v8l-6 6H8l-6-6V8z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M12 7v6M12 16.6v.4" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </>
    ),
  },
}

/** Semáforo con icono y texto además del color. */
export function Semaforo({ estado }: { estado: Senal | null }) {
  if (!estado) {
    return <span className="inline-flex items-center rounded-full border border-borde px-2.5 py-1 text-[14px] font-bold text-gris">Sin dato</span>
  }
  const s = SENALES[estado]
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[14px] font-extrabold" style={{ color: s.color, background: s.fondo }}>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        {s.icono}
      </svg>
      {s.texto}
    </span>
  )
}

export function Boton({ children, onClick, secundario = false, className = '' }: { children: ReactNode; onClick?: () => void; secundario?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-12 rounded-xl px-4 text-[16px] font-extrabold ${
        secundario ? 'border border-borde bg-white text-tinta' : 'border border-verde-texto bg-verde-texto text-white'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function Aviso({ children }: { children: ReactNode }) {
  return <p className="m-0 rounded-lg border border-borde bg-fondo px-3 py-2 text-[14px] leading-snug text-gris">{children}</p>
}

type NombreIcono = 'panorama' | 'mapa' | 'prioridades' | 'agua' | 'menu' | 'cerrar' | 'flecha' | 'capas'

export function Icono({ nombre, tam = 24 }: { nombre: NombreIcono; tam?: number }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const trazos: Record<NombreIcono, ReactNode> = {
    panorama: <path {...p} d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" />,
    mapa: <path {...p} d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zm0 0v14m6-12v14" />,
    prioridades: <path {...p} d="M4 6h10M4 12h16M4 18h7M18 4v4M15 6h6" />,
    agua: <path {...p} d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.500 6-11 6-11z" />,
    menu: <path {...p} d="M4 7h16M4 12h16M4 17h16" />,
    cerrar: <path {...p} d="M6 6l12 12M18 6L6 18" />,
    flecha: <path {...p} d="M9 6l6 6-6 6" />,
    capas: <path {...p} d="M12 3l9 5-9 5-9-5 9-5zm-9 9l9 5 9-5M3 16l9 5 9-5" />,
  }
  return (
    <svg viewBox="0 0 24 24" width={tam} height={tam} aria-hidden>
      {trazos[nombre]}
    </svg>
  )
}
