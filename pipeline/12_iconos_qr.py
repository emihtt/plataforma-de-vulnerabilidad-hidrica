"""Paso 12 (manual). Iconos de la aplicación y código QR de la dirección publicada.

    python pipeline/12_iconos_qr.py                       # solo iconos
    python pipeline/12_iconos_qr.py https://direccion/    # iconos y public/qr.png
"""
from __future__ import annotations

import sys

from PIL import Image, ImageDraw

from comun import RAIZ

PUBLIC = RAIZ / "public"


def icono(tam: int) -> Image.Image:
    escala = 4
    n = tam * escala
    img = Image.new("RGB", (n, n), "#1A1A1A")
    d = ImageDraw.Draw(img)
    cx, r = n / 2, n * 0.21
    cy = n * 0.60
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill="#00A693")
    d.polygon([(cx, n * 0.20), (cx - r * 0.93, cy - r * 0.38), (cx + r * 0.93, cy - r * 0.38)], fill="#00A693")
    return img.resize((tam, tam), Image.LANCZOS)


def main() -> None:
    for tam in (192, 512):
        icono(tam).save(PUBLIC / f"icono-{tam}.png")
    (PUBLIC / "icono.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#1A1A1A"/>'
        '<path d="M32 12s14 15 14 26a14 14 0 0 1-28 0c0-11 14-26 14-26z" fill="#00A693"/></svg>\n', encoding="utf-8")
    if len(sys.argv) > 1:
        import qrcode
        qr = qrcode.QRCode(border=2, box_size=10, error_correction=qrcode.constants.ERROR_CORRECT_M)
        qr.add_data(sys.argv[1])
        qr.make(fit=True)
        qr.make_image(fill_color="#1A1A1A", back_color="white").save(PUBLIC / "qr.png")
        print(f"QR de {sys.argv[1]} en public/qr.png")
    print("Iconos listos")


if __name__ == "__main__":
    main()
