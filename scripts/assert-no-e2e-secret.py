"""Abort artifact upload if a Playwright blob (including nested ZIPs) contains QA keys."""

import io
import os
import sys
import zipfile
from pathlib import Path


def contains_secret(archive: zipfile.ZipFile, secrets: tuple[bytes, ...]) -> bool:
    for member in archive.infolist():
        if member.is_dir():
            continue
        content = archive.read(member)
        if any(secret in content for secret in secrets):
            return True
        if member.filename.endswith(".zip"):
            with zipfile.ZipFile(io.BytesIO(content)) as nested:
                if contains_secret(nested, secrets):
                    return True
    return False


def main() -> int:
    names = (
        "TEST_PASSWORD",
        "JWT_ACCESS_TOKEN_SECRET",
        "NOTIFICATION_TOKEN_ENCRYPTION_KEY",
        "ERP_BACKEND_CATALOG_API_KEY",
    )
    secrets = tuple(os.environ.get(name, "").encode() for name in names)
    if not all(secrets):
        print("Falta alguna clave QA; se rechaza la publicación del reporte.", file=sys.stderr)
        return 1
    report_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "blob-report")
    archives = list(report_dir.glob("*.zip"))
    if not archives:
        print("No hay reporte blob para verificar.", file=sys.stderr)
        return 1
    for path in archives:
        with zipfile.ZipFile(path) as archive:
            if contains_secret(archive, secrets):
                print(f"El reporte {path.name} contiene una clave QA; publicación bloqueada.", file=sys.stderr)
                return 1
    print("Reporte blob sin clave QA.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
