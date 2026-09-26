"""Abort artifact upload if a Playwright blob (including nested ZIPs) contains QA keys."""

import io
import os
import sys
import zipfile
from pathlib import Path


def find_secret(
    archive: zipfile.ZipFile, secrets: dict[str, bytes], prefix: str = ""
) -> str | None:
    """Dónde está la clave: `<nombre de la variable> en <ruta dentro del zip>`. Nunca el valor."""
    for member in archive.infolist():
        if member.is_dir():
            continue
        content = archive.read(member)
        for name, secret in secrets.items():
            if secret in content:
                return f"{name} en {prefix}{member.filename}"
        if member.filename.endswith(".zip"):
            with zipfile.ZipFile(io.BytesIO(content)) as nested:
                found = find_secret(nested, secrets, f"{prefix}{member.filename}!")
                if found:
                    return found
    return None


def main() -> int:
    names = (
        "TEST_PASSWORD",
        "JWT_ACCESS_TOKEN_SECRET",
        "NOTIFICATION_TOKEN_ENCRYPTION_KEY",
        "ERP_BACKEND_CATALOG_API_KEY",
    )
    secrets = {name: os.environ.get(name, "").encode() for name in names}
    if not all(secrets.values()):
        print("Falta alguna clave QA; se rechaza la publicación del reporte.", file=sys.stderr)
        return 1
    report_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "blob-report")
    archives = list(report_dir.glob("*.zip"))
    if not archives:
        print("No hay reporte blob para verificar.", file=sys.stderr)
        return 1
    for path in archives:
        with zipfile.ZipFile(path) as archive:
            found = find_secret(archive, secrets)
            if found:
                print(
                    f"El reporte {path.name} contiene una clave QA ({found}); publicación bloqueada.",
                    file=sys.stderr,
                )
                return 1
    print("Reporte blob sin clave QA.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
