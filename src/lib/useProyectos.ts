import { useEffect, useRef, useState } from 'react'
import type { Datos } from './datos'
import { CLAVE_PROYECTOS, crearEjemplos, importarProyectos, type Proyecto } from './proyectos'

export function useProyectos(datos: Datos | null) {
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)
  const inicializado = useRef(false)
  const ilegible = useRef(false)
  const ultimaLectura = useRef<string | null>(null)
  useEffect(() => {
    if (!datos || inicializado.current) return
    inicializado.current = true
    try {
      const raw = localStorage.getItem(CLAVE_PROYECTOS)
      ultimaLectura.current = raw
      if (raw !== null) {
        setProyectos(importarProyectos(raw, [], datos))
      } else {
        const ejemplos = crearEjemplos(datos)
        setProyectos(ejemplos)
        const inicial = JSON.stringify({ schemaVersion: 1, proyectos: ejemplos })
        localStorage.setItem(CLAVE_PROYECTOS, inicial)
        ultimaLectura.current = inicial
      }
    } catch (e) {
      ilegible.current = true
      setError(`No se pudo leer o inicializar el almacenamiento. Se conserva cualquier contenido previo. ${String(e)}`)
      setProyectos(crearEjemplos(datos))
    }
    setListo(true)
  }, [datos])
  const guardarTodos = (lista: Proyecto[]) => {
    if (ilegible.current) { setError('Almacenamiento no disponible o ilegible. No se guardó ni sobrescribió ningún dato. Exporta un respaldo y revisa este navegador.'); return false }
    try {
      if (!datos) throw new Error('Los territorios aún no están disponibles.')
      if (localStorage.getItem(CLAVE_PROYECTOS) !== ultimaLectura.current) throw new Error('Los proyectos cambiaron en otra pestaña. No se sobrescribieron. Exporta tu respaldo y recarga antes de seguir editando.')
      const raw = JSON.stringify({ schemaVersion: 1, proyectos: lista })
      importarProyectos(raw, [], datos)
      localStorage.setItem(CLAVE_PROYECTOS, raw)
      ultimaLectura.current = raw
      setProyectos(lista); setError(''); return true
    } catch (e) { setError(`No se guardaron los cambios: ${String(e)}`); return false }
  }
  const guardar = (p: Proyecto) => guardarTodos(proyectos.some((x) => x.id === p.id) ? proyectos.map((x) => x.id === p.id ? p : x) : [...proyectos, p])
  const importar = (raw: string) => {
    try {
      if (!datos) throw new Error('Los territorios aún no están disponibles.')
      const nuevos = importarProyectos(raw, proyectos, datos)
      return guardarTodos([...proyectos, ...nuevos])
    } catch (e) { setError(String(e)); return false }
  }
  const restablecerEjemplos = () => datos && guardarTodos([...proyectos.filter((p) => !p.ejemplo), ...crearEjemplos(datos)])
  return { proyectos, error, listo, guardar, importar, restablecerEjemplos }
}
