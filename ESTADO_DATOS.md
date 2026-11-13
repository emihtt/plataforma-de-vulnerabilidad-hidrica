# Estado de los datos

Bitácora pública de las fuentes de la Plataforma de Agua · Laboratorio Valle de Bravo (versión 0). Dice qué fuente respondió, cuál se sustituyó por su respaldo y qué quedó sin dato.

## Prueba de fuentes

<!-- tabla:inicio -->
Prueba de fuentes del 2026-11-13 (una solicitud pequeña por fuente, límite de 20 segundos). Es solo una prueba rápida: lo que finalmente se usó de cada fuente está en la bitácora de abajo y en `public/data/fuentes.json`.

| Fuente | Dirección probada | Respuesta a la prueba | Fecha | Respaldo previsto si falla |
|---|---|---|---|---|
| Censo 2020, ITER Estado de México (INEGI) | <https://www.inegi.org.mx/contenidos/programas/ccpv/iter/zip/iter2020/iter_15csv20.zip> | Respondió (HTTP 200, text/html) | 2026-11-13 | Descarga manual desde SCITEL a data/crudo/ |
| Censo 2020, ITER nacional (INEGI) | <https://www.inegi.org.mx/contenidos/programas/ccpv/iter/zip/iter2020/iter_nalcsv20.zip> | Respondió (HTTP 200, text/html) | 2026-11-13 | Sin cifra nacional (pantalla la omite) |
| Diccionario de datos del ITER (INEGI) | <https://www.inegi.org.mx/app/scitel/doc/descriptor/fd_iter_cpv2020.csv> | Respondió (HTTP 200, text/html) | 2026-11-13 | Diccionario incluido en el zip del ITER |
| OpenStreetMap, API Overpass | <https://overpass-api.de/api/interpreter?data=%5Bout%3Ajson%5D%3Bnode%281%29%3Bout%3B> | No respondió (ReadTimeout: HTTPSConnectionPool(host='overpass-api.de', port=443): Read timed out. (read timeout=20)) | 2026-11-13 | Overpass kumi.systems |
| OpenStreetMap, Overpass (respaldo kumi.systems) | <https://overpass.kumi.systems/api/interpreter?data=%5Bout%3Ajson%5D%3Bnode%281%29%3Bout%3B> | No respondió (ReadTimeout: HTTPSConnectionPool(host='overpass.kumi.systems', port=443): Read timed out. (read timeout) | 2026-11-13 | Envolvente de localidades, 'contorno aproximado' |
| Índice de marginación por localidad 2020 (Conapo) | <https://www.gob.mx/conapo/documentos/indices-de-marginacion-2020-284372> | Respondió (HTTP 200, 0.0 MB, text/html) | 2026-11-13 | Índice de carencias propio con el ITER |
| Daymet, lluvia diaria por punto (ORNL DAAC) | <https://daymet.ornl.gov/single-pixel/api/data?lat=19.195&lon=-100.131&vars=prcp&start=2023-12-01&end=2023-12-31> | Respondió (HTTP 200, 0.0 MB, text/csv) | 2026-11-13 | Open-Meteo, archivo histórico |
| Open-Meteo, archivo histórico | <https://archive-api.open-meteo.com/v1/archive?latitude=19.195&longitude=-100.131&start_date=2023-12-01&end_date=2023-12-05&daily=precipitation_sum&timezone=America%2FMexico_City> | Respondió (HTTP 200, application/json) | 2026-11-13 | Sin normales de lluvia |
| Open-Meteo, pronóstico | <https://api.open-meteo.com/v1/forecast?latitude=19.195&longitude=-100.131&daily=precipitation_sum&past_days=1&forecast_days=1&timezone=America%2FMexico_City> | Respondió (HTTP 200, application/json) | 2026-11-13 | Pantalla muestra último dato guardado |
| Conagua, almacenamiento diario de presas (SINA) | <https://sinav30.conagua.gob.mx:8080/PresasPG/presas/reporte/2026-11-11> | Respondió (HTTP 200, application/json) | 2026-11-13 | Semilla capturada a mano |
| Conagua, Sistema de Información Hidrológica | <https://sih.conagua.gob.mx/> | Respondió (HTTP 200, text/html) | 2026-11-13 | Semilla capturada a mano |
| Servicio Meteorológico Nacional, pronóstico por municipio | <https://smn.conagua.gob.mx/tools/GUI/webservices/?method=1> | Respondió (HTTP 200, 0.3 MB, application/octet-stream) | 2026-11-13 | Solo pronóstico de Open-Meteo |
| OpenFreeMap, estilo de mapa base | <https://tiles.openfreemap.org/styles/positron> | Respondió (HTTP 200, application/json) | 2026-11-13 | Solo capas propias |
<!-- tabla:fin -->

## Bitácora

### Marginación (Conapo)
2026-11-13. Se descargó la base por localidad desde el enlace de la página oficial. Dirección comprobada: el grado 'Muy alto' tiene índice normalizado menor que 'Muy bajo'. No se usó el índice de carencias propio de respaldo.

### Contexto geográfico (OpenStreetMap)
2026-11-13. Overpass respondió a las consultas reales (la página de estado no contestó en la prueba inicial). Capas: {'limite': 1, 'agua': 22, 'rio': 36, 'area_protegida': 2, 'camino': 3}; archivo de 0.27 MB. Todas las localidades caen dentro del límite municipal.

### Lluvia por localidad (Daymet)
2026-11-13. 62 puntos descargados para 66 localidades, periodo 2004–2023. No se usó el respaldo de Open-Meteo.

### Presa Valle de Bravo (Conagua)
2026-11-13. El servicio de Conagua respondió, pero solo trae datos hasta 2025-04-21; para fechas recientes devuelve una lista vacía. Se usan 120 cortes semanales del servicio y 5 cortes de la semilla capturada a mano. El último dato (2026-11-05, 98.87 %) viene de la semilla: en pantalla dice «último dato capturado a mano». El Sistema de Información Hidrológica respondió a la prueba, pero no se exploró como vía alterna.

### ITER nacional (INEGI)
2026-11-13. Descargado. Viviendas sin agua entubada: 1,215,497; personas estimadas: 4,412,978; localidades con la mitad o más de sus viviendas sin agua entubada: 17,766. Diferencia con la cifra difundida: +1.3% en viviendas y -4.1% en personas (tolerancia 10 %).

### Pronóstico oficial (Servicio Meteorológico Nacional)
2026-11-13. Respondió. Emisión del 2026-11-13, 4 días para Valle de Bravo (clave de municipio 110). Campos leídos del archivo: tmax, tmin, prec, probprec, desciel.

### Diferencia entre mallas de lluvia
2026-11-13. Open-Meteo (reanálisis ERA5) da 1,670 mm al año en la cabecera (1991–2020); Daymet da en promedio 840 mm al año en las localidades (2004–2023). Son modelos distintos y difieren mucho. Por eso la captación de lluvia usa solo Daymet, y la comparación de lluvia reciente contra lo normal usa solo Open-Meteo: nunca se mezclan. Queda para el equipo experto decidir la fuente de lluvia y si se corrige con estaciones.
