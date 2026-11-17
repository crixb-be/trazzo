"""Inventario y encabezados del corpus aportado; requiere Poppler.

No marca fichas como verificadas ni sustituye la revisión de tablas y figuras.
Los libros escaneados requieren OCR separado y revisión visual de las cotas.
Uso: python3 scripts/index-rne.py
"""

import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HEADING = re.compile(
    r"(Art[íi]culo\s+(?:\d|Único|Unico)|CAP[ÍI]TULO|Tabla N|Cuadro N)", re.I
)
BIDI_MARKS = "\u202a\u202b\u202c\u202d\u202e\u200e\u200f"


def extract_document(path):
    info = subprocess.check_output(["pdfinfo", str(path)], text=True)
    text = subprocess.check_output(
        ["pdftotext", "-layout", str(path), "-"], text=True
    )
    text = "".join(char for char in text if char not in BIDI_MARKS)
    record = {
        "file": str(path.relative_to(ROOT)),
        "bytes": path.stat().st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "chars": len(text),
        "pages": re.search(r"Pages:\s+(\d+)", info).group(1),
        "error": "",
    }
    return record, text


def index_headings(text):
    return [
        {"page": number, "heading": line.strip()[:220]}
        for number, page in enumerate(text.split("\f"), 1)
        for line in page.splitlines()
        if HEADING.search(line)
    ]


def main():
    inventory, index = [], []
    for category in ["rne", "biblioteca"]:
        for path in sorted((ROOT / "docs" / category).glob("*.pdf")):
            record, text = extract_document(path)
            inventory.append(record)
            if category == "rne":
                index.append({
                    "file": record["file"],
                    "sha256": record["sha256"],
                    "pages": record["pages"],
                    "sections": index_headings(text),
                })

    output = ROOT / "docs" / "contraste"
    output.mkdir(exist_ok=True)
    for name, data in [("inventario", inventory), ("indice-rne", index)]:
        (output / (name + ".json")).write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    print(f"Inventariados {len(inventory)} PDFs; indexados {len(index)} documentos RNE.")


if __name__ == "__main__":
    main()
