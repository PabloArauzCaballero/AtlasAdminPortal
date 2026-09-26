"""Sustituye las claves QA del runner por `***` dentro de los reportes blob de Playwright.

Playwright registra los ARGUMENTOS de cada acción en el título de su paso: el `fill(TEST_PASSWORD)`
del setup queda en `report.jsonl` de todos los fragmentos, con o sin fallos. Sin este paso el
guardián `assert-no-e2e-secret.py` bloquearía siempre la publicación. Las claves son aleatorias
(hex, más el prefijo `Qa9!` de la contraseña), así que sustituirlas por texto plano no rompe el JSON.

Este script NO decide si publicar: después de depurar, el guardián vuelve a buscar las claves y es
él quien aborta si queda alguna.
"""

import io
import os
import sys
import zipfile
from pathlib import Path

NAMES = (
    "TEST_PASSWORD",
    "JWT_ACCESS_TOKEN_SECRET",
    "NOTIFICATION_TOKEN_ENCRYPTION_KEY",
    "ERP_BACKEND_CATALOG_API_KEY",
)
MASK = b"***"


def redact_bytes(data: bytes, secrets: list[bytes]) -> tuple[bytes, int]:
    hits = 0
    for secret in secrets:
        count = data.count(secret)
        if count:
            hits += count
            data = data.replace(secret, MASK)
    return data, hits


def redact_zip(raw: bytes, secrets: list[bytes]) -> tuple[bytes, int]:
    """Devuelve el zip depurado (recursivo en zips anidados) y cuántas claves sustituyó."""
    total = 0
    out = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(raw)) as source, zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as target:
        for member in source.infolist():
            if member.is_dir():
                target.writestr(member, b"")
                continue
            content = source.read(member)
            if member.filename.endswith(".zip"):
                content, hits = redact_zip(content, secrets)
            else:
                content, hits = redact_bytes(content, secrets)
            total += hits
            target.writestr(member.filename, content)
    return out.getvalue(), total


def main() -> int:
    secrets = [os.environ.get(name, "").encode() for name in NAMES]
    if not all(secrets):
        print("Falta alguna clave QA; no se puede depurar el reporte.", file=sys.stderr)
        return 1
    report_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "blob-report")
    archives = sorted(report_dir.glob("*.zip"))
    if not archives:
        print("No hay reporte blob que depurar.", file=sys.stderr)
        return 1
    for path in archives:
        cleaned, hits = redact_zip(path.read_bytes(), secrets)
        path.write_bytes(cleaned)
        print(f"{path.name}: {hits} clave(s) QA sustituidas por ***")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
