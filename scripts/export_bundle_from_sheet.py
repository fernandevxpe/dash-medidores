#!/usr/bin/env python3
"""
Lê uma planilha no Google Sheets e grava web/public/data/dashboard-bundle.json.

Requisitos:
  pip install -r requirements-sheets.txt

Variáveis de ambiente:
  GOOGLE_SHEETS_SPREADSHEET_ID  — ID da URL (entre /d/ e /edit)
  GOOGLE_APPLICATION_CREDENTIALS — caminho do JSON da conta de serviço (Google Cloud)
Opcional:
  GOOGLE_SHEETS_WORKSHEET_NAME — se vazio, tenta «dados brutos dashboard» → «Página1» → primeira aba
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

try:
    import gspread
    from google.oauth2.service_account import Credentials
except ImportError:
    raise SystemExit("Instale: pip install -r scripts/requirements-sheets.txt")

from dashboard_bundle_builder import (  # noqa: E402
    OUT_DEFAULT,
    SHEET_TRIES_LOCAL,
    build_bundle,
    eventos_from_grid,
    write_bundle,
)

SCOPES = (
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
)


def main() -> None:
    sheet_id = os.environ.get("GOOGLE_SHEETS_SPREADSHEET_ID", "").strip()
    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
    ws_name_env = os.environ.get("GOOGLE_SHEETS_WORKSHEET_NAME", "").strip()

    if not sheet_id:
        raise SystemExit("Defina GOOGLE_SHEETS_SPREADSHEET_ID")
    if not cred_path:
        raise SystemExit("Defina GOOGLE_APPLICATION_CREDENTIALS (caminho do .json da conta de serviço)")
    if not Path(cred_path).is_file():
        raise SystemExit(f"Arquivo de credenciais não encontrado: {cred_path}")

    creds = Credentials.from_service_account_file(cred_path, scopes=SCOPES)
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(sheet_id)

    ws = None
    sheet_used = ""
    if ws_name_env:
        try:
            ws = sh.worksheet(ws_name_env)
            sheet_used = ws_name_env
        except gspread.WorksheetNotFound:
            raise SystemExit(
                f"Aba '{ws_name_env}' não encontrada. Abas: {[w.title for w in sh.worksheets()]}",
            )
    else:
        for name in SHEET_TRIES_LOCAL:
            try:
                ws = sh.worksheet(name)
                sheet_used = name
                break
            except gspread.WorksheetNotFound:
                continue
        if ws is None:
            ws = sh.get_worksheet(0)
            sheet_used = ws.title

    values = ws.get_all_values()
    if len(values) < 2:
        raise SystemExit("Planilha sem linhas de dados (só cabeçalho ou vazia).")

    eventos = eventos_from_grid([list(r) for r in values])
    label = f"Google Sheets ({sheet_id[:8]}…)"
    bundle = build_bundle(eventos, label)
    out = write_bundle(bundle, OUT_DEFAULT)
    n_med = len(bundle["frota"]["idsMedidoresObservados"])
    print(f"OK -> {out} ({len(eventos)} eventos, {n_med} medidores) · aba «{sheet_used}»")


if __name__ == "__main__":
    main()
