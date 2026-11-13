"""Paso 99. Copia a resumen.json los parámetros vigentes (supuestos) y la fecha de generación."""
from __future__ import annotations

from comun import PUBLICO, actualizar_resumen, hoy, leer_json, parametros

DESCRIPCIONES = {
    "indice_prioridad": "Pesos del índice de prioridad y número de clases",
    "robustez": "Simulación de pesos para medir qué tan estable es la prioridad",
    "captacion_lluvia": "Área de techo, coeficiente de escurrimiento, primer lavado, dotación por persona y tanques",
    "aptitud_intervenciones": "Umbrales de las reglas de intervenciones candidatas",
    "semaforo": "Umbrales del semáforo de presa y de lluvia de 30 días",
    "costos": "Costos unitarios (no hay ninguno por defecto)",
}


def main() -> None:
    par = parametros()
    supuestos = {}
    for clave, bloque in par.items():
        if isinstance(bloque, dict) and bloque.get("estado") == "supuesto":
            supuestos[clave] = {"descripcion": DESCRIPCIONES.get(clave, clave), "razon": (bloque.get("razon") or "").strip() or None,
                                "valores": {k: v for k, v in bloque.items() if k not in ("estado", "razon")}}
    actualizar_resumen(supuestos=supuestos, parametros=par, generado=hoy())
    r = leer_json(PUBLICO / "resumen.json")
    print(f"Resumen: {len(supuestos)} bloques de supuestos; claves {sorted(r)}")


if __name__ == "__main__":
    main()
