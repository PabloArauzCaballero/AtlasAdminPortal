"""Serve contract fixtures for the two external catalog blocks on an isolated CI runner."""

import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer


def manifest(code: str, name: str, service: str, route: str, schema: str, table: str) -> dict:
    return {
        "block": {
            "code": code,
            "name": name,
            "service": service,
            "version": "qa-contract-v1",
        },
        "endpoints": [
            {
                "code": f"{code}_QA_HEALTH",
                "module": "health",
                "method": "GET",
                "fullPath": route,
                "summary": f"Salud del bloque {name} en el contrato QA",
                "requiresAuth": False,
                "allowedRoles": [],
                "isReadonly": True,
                "isDestructive": False,
                "riskLevel": "LOW",
            }
        ],
        "dataEntities": [
            {
                "schemaName": schema,
                "tableName": table,
                "entityName": table,
                "module": "qa_catalog",
                "columnCount": 2,
                "primaryKeyColumns": ["id"],
                "containsPii": False,
                "containsFinancialData": code == "ERP_BACKEND",
                "containsRiskData": code == "DECISION_ENGINE",
                "isAuditCritical": True,
            }
        ],
    }


DECISION = manifest(
    "DECISION_ENGINE", "Decision Engine", "atlas-decision-engine-backend",
    "/v1/health", "public", "qa_decision_rules",
)
ERP = manifest(
    "ERP_BACKEND", "ERP Backend", "atlas-erp-backend",
    "/api/v1/health", "atlas_accounting", "qa_journal_entries",
)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.reply(200, {"status": "ok"})
        elif self.path == "/v1/platform/catalog-manifest":
            bearer = self.headers.get("authorization", "")
            self.reply(200 if bearer.startswith("Bearer ") else 401, DECISION if bearer.startswith("Bearer ") else {})
        elif self.path == "/api/v1/platform/catalog-manifest":
            key = os.environ.get("ERP_BACKEND_CATALOG_API_KEY", "")
            valid = bool(key) and self.headers.get("x-platform-catalog-key") == key
            self.reply(200 if valid else 401, ERP if valid else {})
        elif self.path in ("/v1/health", "/api/v1/health"):
            self.reply(200, {"status": "ok"})
        else:
            self.reply(404, {"error": "not found"})

    def reply(self, status: int, body: dict):
        encoded = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, _format, *_args):
        pass


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 8791), Handler).serve_forever()
