# Versión 0 en main y GitHub Pages

Revisión del 14 de noviembre de 2026. Esta versión conserva la línea base censal, las fuentes y la separación entre datos públicos, modelos y simulaciones de ejemplo. La revisión de software no sustituye la validación científica ni comunitaria.

## Publicar desde la configuración actual

1. Integrar la versión revisada a `main` y esperar que **Validar y publicar GitHub Pages** termine correctamente.
2. Descargar el artefacto `github-pages` de esa ejecución y extraer tanto su ZIP como `artifact.tar` a un directorio nuevo.
3. Con Git autenticado en una cuenta colaboradora y nombre/correo propios configurados, ejecutar `python scripts/publicar_gh_pages.py --artifact RUTA_DEL_SITIO_EXTRAIDO`.
4. El script comprueba el commit vigente de `main`, las huellas de HTML y service worker, y publica un commit sin force en `gh-pages`, desde un worktree aislado. Genera allí `.nojekyll`, pues el artefacto oficial omite archivos ocultos. Conserva el historial de la publicación anterior.
5. Esperar la ejecución de Pages y abrir <https://emihtt.github.io/plataforma-de-vulnerabilidad-hidrica/>. Comprobar `version.json`, panorama, mapa, proyecto y seguimiento, también en una ventana privada. La primera visita necesita internet.

Se conserva el origen `gh-pages` del dueño; cambiarlo requiere permisos de administración que la cuenta colaboradora no tiene. CI genera un artefacto identificado por commit y detecta el modo de Pages. En modo de rama la publicación se hace con la cuenta de la persona, porque un push con el token automático no dispara el build de Pages. No se guardan credenciales en scripts o secretos nuevos.

Si el dueño selecciona **Settings → Pages → Source: GitHub Actions**, el workflow existente activa `configure-pages` y `deploy-pages` después de validar `main`. No se modifican protecciones del entorno. Solo se publica el sitio compilado: no dependencias, datos crudos, documentos internos ni código fuente.

Referencia: [Vite en GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages) y [workflows oficiales de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Compilar y comprobar la misma candidata

```bash
# Node 24; activar previamente un entorno de Python 3.13
npm ci
npm test
python -m pip install -r pipeline/requirements.txt -r scripts/requirements-test.txt
python -m pytest pipeline/tests -q
npm run build:pages
python -m playwright install chromium
python scripts/qa_pages.py
```

En Linux, Playwright puede requerir `python -m playwright install --with-deps chromium`. El workflow incluye este paso. No se ejecuta el pipeline ni se descargan otra vez el censo o los ZIP continentales. La prueba con geometrías continentales originales se omite si no están disponibles; la prueba con geometría publicada y adscripciones siempre se ejecuta.

`qa_pages.py` levanta y cierra su propio servidor local, monta el sitio bajo `/plataforma-de-vulnerabilidad-hidrica/` y devuelve 404 para recursos inexistentes, sin ocultarlos con una página de sustitución. Reutiliza el recorrido de perfiles, proyectos y móvil. La evidencia sale fuera del repositorio por defecto; `QA_OUTPUT_DIR` permite cambiar el destino. CI la conserva como artefacto.

Para explorar manualmente esa compilación, servir la carpeta que la contiene con el nombre de repositorio. Para el paquete portátil local, usar `npm run build` (base relativa `./`) y los scripts existentes de preparación. Para un dominio propio o un nombre de repositorio diferente, ajustar `VITE_BASE_PATH` y adaptar la prueba de montaje; no reutilizar sin cambios la base de este sitio de proyecto.

## Correcciones de la revisión

- Base explícita para Pages, rutas con hash, fuentes locales, worker de MapLibre, manifest y licencia incluidos; archivo `.nojekyll`.
- Actualización PWA a petición de la persona. Un borrador con cambios impide la recarga por actualización; la recarga manual del navegador también avisa si hay cambios sin guardar.
- Copia de lluvia validada antes de usarse. Fechas de la ventana de lluvia en `America/Mexico_City`, independientes de la zona horaria de la computadora. Faltantes permanecen faltantes.
- Consulta meteorológica solo al abrir contexto hídrico; las vistas principales no dependen de una llamada externa al arrancar.
- La lluvia no usa una segunda caché HTTP del service worker: el respaldo local conserva su fecha original y no se presenta como una consulta recién realizada.
- Prioridades disponibles aunque las preferencias guardadas solo ponderen variables de otra escala; controles compartidos para mantener consistencia.
- Conflictos entre pestañas detectados antes de guardar proyectos, sin sobreescribir el contenido previo. Se validan territorio, identificadores y límite de registros en la cartera completa.
- Carga de datos con límite de espera, reintento comprensible y recuperación ante una vista que falle. No se borra almacenamiento para recuperarse.
- Leyenda hidrográfica separada de atribuciones en móvil; mensajes de consulta externa sin atribuir todo fallo a ausencia de internet.
- Documentación corregida sobre ejemplos, registros manuales, privacidad y estado de la publicación.
- Ajustes del dueño de `correcciones-reglas`: etiqueta de versión 0, indicadores de presa y población estimada en Panorama, guía interna fuera del repositorio y retiro de menciones a terceros ajenos a las fuentes.

## Comprobado y pendiente

Comprobado localmente: pruebas TypeScript y Python, compilación relativa y bajo la ruta de Pages, recorrido de las dos experiencias, mapas y fichas, móvil 390 × 844, importación/exportación, errores de almacenamiento, conflictos entre pestañas, caché dañada de lluvia, actualización PWA real y recarga sin internet. La evidencia especifica sus resultados; aprobar CI en Linux añade una comprobación reproducible antes de integrar.

La auditoría de dependencias no reportó avisos conocidos en producción (`npm audit --omit=dev`). La auditoría completa reportó 2 avisos bajos y 4 moderados en dependencias de construcción de Workbox; no hubo altos ni críticos. No se aplicó la propuesta automática de cambio mayor de PWA. Estos avisos necesitan seguimiento de sus versiones; no son una garantía de ausencia de vulnerabilidades.

La comprobación del sitio publicado se registra aparte de las pruebas locales y de CI. Permanecen pendientes Safari/iOS, ensayo en la computadora de la presentación y validación científica/comunitaria. El mapa nacional, la sincronización, las cuentas y la verificación de proyectos siguen siendo fases posteriores.

Los registros permanecen asociados al origen del navegador: una captura en `localhost` no aparece automáticamente en `github.io`; trasladarla con respaldo JSON. La vista comunitaria es una experiencia de consulta local, no un control de acceso para datos confidenciales. Los cambios entre secciones pueden descartar una edición no guardada; guardar antes de navegar. La protección añadida cubre recarga y actualización, no un sistema completo de borradores.

## Recuperación

Si falla la validación, no se ejecuta la publicación. Para regresar a una candidata anterior, restaurar un commit ya validado junto con su configuración compatible y ejecutar el workflow sobre `main`, sin borrar registros del navegador. Para volver al sitio publicado antes de esta primera integración, el dueño puede seleccionar de nuevo el origen de rama `gh-pages`, que esta propuesta conserva.

Una copia PWA anterior puede seguir abierta: cerrar las pestañas antiguas y volver a abrir el sitio, o aceptar el aviso de nueva versión. No borrar los datos del sitio como primer paso; antes exportar los proyectos.
