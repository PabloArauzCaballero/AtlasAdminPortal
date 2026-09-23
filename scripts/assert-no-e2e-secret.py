"""Abort artifact upload if a Playwright blob (including nested ZIPs) contains the QA password."""

import io
import os
import sys
import zipfile
from pathlib import Path


def contains_secret(archive: zipfile.ZipFile, secret: bytes) -> bool:
    for member in archive.infolist():
        if member.is_dir():
            continue
        content = archive.read(member)
        if secret in content:
            return True
        if member.filename.endswith(".zip"):
            with zipfile.ZipFile(io.BytesIO(content)) as nested:
                if contains_secret(nested, secret):
                    return True
    return False


def main() -> int:
    password = os.environ.get("TEST_PASSWORD", "")
    if not password:
        print("Falta TEST_PASSWORD; se rechaza la publicación del reporte.", file=sys.stderr)
        return 1
    report_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "blob-report")
    archives = list(report_dir.glob("*.zip"))
    if not archives:
        print("No hay reporte blob para verificar.", file=sys.stderr)
        return 1
    for path in archives:
        with zipfile.ZipFile(path) as archive:
            if contains_secret(archive, password.encode()):
                print(f"El reporte {path.name} contiene la clave QA; publicación bloqueada.", file=sys.stderr)
                return 1
    print("Reporte blob sin clave QA.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
