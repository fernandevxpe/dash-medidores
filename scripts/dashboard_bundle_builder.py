"""Monta o JSON do dashboard a partir de linhas da aba de eventos (Excel ou Google Sheet)."""
from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parent.parent
OUT_DEFAULT = ROOT / "web" / "public" / "data" / "dashboard-bundle.json"
SHEET_NAME_DEFAULT = "dados brutos dashboard"
FALLBACK_SHEET_TITLES = ("Página1", "Pagina1")

"""Ordem de tentativa ao abrir .xlsx sem nome fixo (export local)."""
SHEET_TRIES_LOCAL: tuple[str, ...] = (SHEET_NAME_DEFAULT, *FALLBACK_SHEET_TITLES)


def normalize_data_celula(v: object) -> str | None:
    """Aceita datetime (openpyxl), string ISO, dd/mm/aaaa ou texto da planilha online."""
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.replace(microsecond=0).isoformat()
    s = str(v).strip()
    if not s:
        return None
    if re.match(r"^\d{4}-\d{2}-\d{2}", s):
        if "T" in s:
            return s[:19] if len(s) >= 19 else s
        return s[:10] + "T00:00:00"
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})", s)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return f"{y:04d}-{mo:02d}-{d:02d}T00:00:00"
    return s


def id_celula_para_string(mid: object) -> str:
    if mid is None:
        return ""
    if isinstance(mid, float) and mid.is_integer():
        return str(int(mid))
    if isinstance(mid, int):
        return str(mid)
    return str(mid).strip()


def classificar_tipo_equipamento(id_str: str) -> str:
    if not id_str:
        return "desconhecido"
    s = id_str.strip()
    sl = s.lower()
    if sl.startswith("xp"):
        return "medidor"
    if re.fullmatch(r"\d+$", s):
        return "analisador"
    if re.match(r"^analisador[_\s]?\d+$", sl):
        return "analisador"
    return "desconhecido"


def normalizar_status_exec(raw: object) -> str | None:
    if raw is None:
        return None
    s = str(raw).strip().upper()
    if "DESINST" in s or s == "DESINSTALAÇÃO":
        return "desinstalacao"
    if "MANUT" in s:
        return "manutencao"
    if "INSTALA" in s:
        return "instalacao"
    return None


def codigo_analisador(localizacao: str | None) -> str | None:
    if not localizacao:
        return None
    s = str(localizacao).strip().upper()
    m = re.match(r"^CDM\s*(\d+)$", s) or re.match(r"^CDM(\d+)$", s)
    if m:
        return str(int(m.group(1))).zfill(2)
    return s


def evento_from_row_values(
    st_raw: Any,
    loc: Any,
    mid: Any,
    inst: Any,
    cliente: Any,
    data: Any,
) -> dict[str, Any] | None:
    status = normalizar_status_exec(st_raw)
    id_norm = id_celula_para_string(mid)
    data_s = normalize_data_celula(data)
    if not id_norm or not status or not data_s:
        return None
    loc_s = str(loc).strip() if loc else ""
    cli = str(cliente).strip() if cliente else None
    tipo_eq = classificar_tipo_equipamento(id_norm)
    return {
        "idMedidor": id_norm,
        "tipoEquipamento": tipo_eq,
        "statusExecucao": status,
        "data": data_s,
        "localizacao": loc_s or None,
        "codigoAnalisador": codigo_analisador(loc_s) if loc_s else None,
        "cliente": cli,
        "instalador": str(inst).strip() if inst else None,
    }


def uses_five_column_online_layout(header_row: list[Any] | tuple[Any, ...]) -> bool:
    """
    Planilha online (export Google): status | localizacao | id_medidor | razao_social | registro_de_data
    Sem coluna instalador.
    """
    cells = [str(x or "").strip().lower() for x in header_row[:5]]
    if len(cells) < 5:
        return False
    return cells[2] == "id_medidor"


def eventos_from_grid(all_rows: list[list[Any]]) -> list[dict[str, Any]]:
    """
    Primeira linha = cabeçalho (sempre ignorada na conversão). Detecta layout 5 cols (Sheet online) vs 6 cols (legado).
    """
    eventos: list[dict[str, Any]] = []
    if not all_rows or len(all_rows) < 2:
        return eventos
    header = all_rows[0]
    five = uses_five_column_online_layout(header)
    for row in all_rows[1:]:
        if not row or all(_cell_empty(x) for x in row):
            continue
        cells: list[Any] = list(row)
        if five:
            while len(cells) < 5:
                cells.append(None)
            ev = evento_from_row_values(cells[0], cells[1], cells[2], None, cells[3], cells[4])
        else:
            while len(cells) < 6:
                cells.append(None)
            ev = evento_from_row_values(
                cells[0],
                cells[1],
                cells[2],
                cells[3],
                cells[4],
                cells[5],
            )
        if ev:
            eventos.append(ev)
    eventos.sort(key=lambda e: (e["data"] or "", e["idMedidor"], e["statusExecucao"]))
    return eventos


def _cell_empty(x: Any) -> bool:
    if x is None:
        return True
    return str(x).strip() == ""


def eventos_from_row_iter(rows: Iterable[tuple[Any, ...]]) -> list[dict[str, Any]]:
    """Legado: apenas linhas de dados, 6 colunas (status, loc, id, instalador, cliente, data)."""
    eventos: list[dict[str, Any]] = []
    for row in rows:
        if len(row) < 6:
            continue
        st_raw, loc, mid, inst, cliente, data = (
            row[0],
            row[1],
            row[2],
            row[3],
            row[4],
            row[5],
        )
        ev = evento_from_row_values(st_raw, loc, mid, inst, cliente, data)
        if ev:
            eventos.append(ev)
    eventos.sort(key=lambda e: (e["data"] or "", e["idMedidor"], e["statusExecucao"]))
    return eventos


def build_bundle(eventos: list[dict[str, Any]], fonte_planilha: str) -> dict[str, Any]:
    ids_med = sorted(
        {e["idMedidor"] for e in eventos if e.get("tipoEquipamento") == "medidor"},
        key=lambda x: x.lower(),
    )
    anal_set: set[str] = set()
    for e in eventos:
        if e.get("tipoEquipamento") != "analisador":
            continue
        raw = str(e["idMedidor"]).strip().lower()
        m = re.match(r"^analisador[_\s]?(\d+)$", raw)
        if m:
            anal_set.add(str(int(m.group(1))))
        elif re.fullmatch(r"\d+", raw):
            anal_set.add(str(int(raw)))
    analisadores_ids = sorted(anal_set, key=lambda x: int(x))
    locs = sorted({e["localizacao"] for e in eventos if e.get("localizacao")})
    return {
        "geradoEm": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "fontePlanilha": fonte_planilha,
        "config": {
            "diasMedicaoPadrao": 8,
            "timezone": "America/Recife",
            "mapaLocalizacaoParaAnalisador": {loc: codigo_analisador(loc) for loc in locs if loc},
            "regraClassificacaoId": "xp… = medidor; analisador_N ou só dígitos = analisador",
            "regraEventos": "Coluna Status_execucao: INSTALAÇÃO / MANUTENÇÃO / DESINSTALAÇÃO",
        },
        "eventos": eventos,
        "frota": {
            "totalMedidoresObservados": len(ids_med),
            "totalAnalisadoresOficial": max(5, len(analisadores_ids)) if analisadores_ids else 5,
            "idsMedidoresObservados": ids_med,
            "idsAnalisadoresObservados": analisadores_ids,
            "comentario": "Fonte: aba de eventos (legado 6 colunas ou Google 5 colunas); estado em campo derivado do histórico.",
        },
    }


def write_bundle(bundle: dict[str, Any], out_path: Path | None = None) -> Path:
    path = out_path or OUT_DEFAULT
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8")
    return path
