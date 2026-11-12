import io
import json
import os
import shutil
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from pydantic import BaseModel

# Trava de segurança: no Render, DATA_DIR é obrigatório. Sem isso, o app
# subiria normalmente gravando no filesystem efêmero do container e perderia
# todos os dados no próximo deploy, sem nenhum erro visível.
if os.getenv("RENDER") and not os.getenv("DATA_DIR"):
    raise RuntimeError(
        "DATA_DIR não está configurado no Render. Isso faria o app gravar dados "
        "no filesystem efêmero do container (perda total no próximo deploy). "
        "Configure a env var DATA_DIR=/data no serviço antes de tentar de novo."
    )

app = FastAPI(title="Piaseg Franqueados")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

APP_DIR = Path(__file__).parent
DATA_DIR = Path(os.getenv("DATA_DIR", str(APP_DIR)))
DATA_DIR.mkdir(parents=True, exist_ok=True)

FRANQUEADOS_FILE = DATA_DIR / "franqueados.json"
_BUNDLED_FRANQUEADOS_FILE = APP_DIR / "franqueados.json"

BACKUPS_DIR = DATA_DIR / "backups"
BACKUP_SOURCE_FILES = ["franqueados.json"]
MAX_BACKUPS = 30

MODALIDADES = ["H.O", "Store", "Migração", "Corporate"]

SISTEMAS = ["E-mail", "Contador", "Sistema Financeiro"]

FUNCOES_CONTATO = ["Sócio", "Colaborador", "Parceiro"]

FIELDS = [
    "nome_fantasia", "razao_social", "cnpj", "cep", "uf", "municipio",
    "bairro", "logradouro", "numero", "complemento", "modalidade",
    "inicio_operacao", "fim_operacao", "cpf_franqueado", "status",
    "sistemas_contratados", "observacao", "multi_franqueado",
]

EXPORT_HEADERS = {
    "id": "ID", "nome_fantasia": "Nome Fantasia", "razao_social": "Razão Social",
    "cnpj": "CNPJ", "contatos": "Contatos", "cep": "CEP", "uf": "UF",
    "municipio": "Município", "bairro": "Bairro", "logradouro": "Logradouro",
    "numero": "Número", "complemento": "Complemento", "modalidade": "Modalidade",
    "inicio_operacao": "Início da Operação", "fim_operacao": "Fim da Operação",
    "cpf_franqueado": "CPF do Franqueado", "status": "Status",
    "sistemas_contratados": "Sistemas Contratados", "observacao": "Observação",
    "multi_franqueado": "Multi Franqueado",
}


def _run_startup_backup() -> None:
    """Snapshot dos dados a cada subida do app (redeploy = novo processo).

    Só roda quando DATA_DIR foi explicitamente configurado (produção), nunca
    em dev local, para não poluir a pasta do projeto.
    """
    if not os.getenv("DATA_DIR"):
        return
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    dest = BACKUPS_DIR / timestamp
    dest.mkdir(parents=True, exist_ok=True)
    for filename in BACKUP_SOURCE_FILES:
        source = DATA_DIR / filename
        if source.exists():
            shutil.copy2(source, dest / filename)
    snapshots = sorted(p for p in BACKUPS_DIR.iterdir() if p.is_dir())
    for old in snapshots[:-MAX_BACKUPS]:
        shutil.rmtree(old, ignore_errors=True)


_run_startup_backup()


def load_franqueados() -> list[dict]:
    if FRANQUEADOS_FILE.exists():
        return json.loads(FRANQUEADOS_FILE.read_text(encoding="utf-8"))
    if _BUNDLED_FRANQUEADOS_FILE.exists():
        return json.loads(_BUNDLED_FRANQUEADOS_FILE.read_text(encoding="utf-8"))
    return []


def save_franqueados(items: list[dict]) -> None:
    FRANQUEADOS_FILE.parent.mkdir(parents=True, exist_ok=True)
    FRANQUEADOS_FILE.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")


def _migrate_franqueados() -> None:
    """Preenche campos novos com default em registros antigos, sem nunca
    sobrescrever ou apagar dados existentes (só adiciona chaves ausentes).

    Roda em todo startup — ao contrário de um "reseed"/restore, isto NUNCA
    substitui o arquivo inteiro, então edições reais feitas via UI entre
    deploys (criar, editar, excluir franqueados) são sempre preservadas.
    """
    items = load_franqueados()
    changed = not FRANQUEADOS_FILE.exists()
    for f in items:
        if "sistemas_contratados" not in f:
            f["sistemas_contratados"] = []
            changed = True
        if "observacao" not in f:
            f["observacao"] = ""
            changed = True
        if "multi_franqueado" not in f:
            f["multi_franqueado"] = "nao"
            changed = True
        if "unidades" not in f:
            f["unidades"] = []
            changed = True
        for c in f.get("contatos") or []:
            if "funcao" not in c:
                c["funcao"] = ""
                changed = True
            if "data_nascimento" not in c:
                c["data_nascimento"] = ""
                changed = True
    if changed:
        save_franqueados(items)


_migrate_franqueados()


class Contato(BaseModel):
    nome: str = ""
    telefone: str = ""
    email: str = ""
    funcao: str = ""
    data_nascimento: str = ""


class Unidade(BaseModel):
    nome: str = ""
    cnpj: str = ""
    cep: str = ""
    uf: str = ""
    municipio: str = ""
    bairro: str = ""
    logradouro: str = ""
    numero: str = ""
    complemento: str = ""
    telefone: str = ""
    email: str = ""
    inicio_operacao: str = ""
    status: str = "ativo"


class FranqueadoIn(BaseModel):
    nome_fantasia: str = ""
    razao_social: str = ""
    cnpj: str = ""
    contatos: list[Contato] = []
    cep: str = ""
    uf: str = ""
    municipio: str = ""
    bairro: str = ""
    logradouro: str = ""
    numero: str = ""
    complemento: str = ""
    modalidade: str = ""
    inicio_operacao: str = ""
    fim_operacao: str = ""
    cpf_franqueado: str = ""
    status: str = "ativo"
    sistemas_contratados: list[str] = []
    observacao: str = ""
    multi_franqueado: str = "nao"
    unidades: list[Unidade] = []


@app.get("/franqueados")
def list_franqueados(
    q: Optional[str] = None,
    uf: Optional[str] = None,
    municipio: Optional[str] = None,
    modalidade: Optional[str] = None,
    status: Optional[str] = None,
):
    items = load_franqueados()
    if q:
        needle = q.strip().lower()
        def matches(f):
            if needle in (f.get("nome_fantasia") or "").lower():
                return True
            if needle in (f.get("razao_social") or "").lower():
                return True
            if needle in (f.get("cnpj") or "").lower():
                return True
            if needle in (f.get("municipio") or "").lower():
                return True
            for c in f.get("contatos") or []:
                if needle in (c.get("nome") or "").lower():
                    return True
                if needle in (c.get("telefone") or "").lower():
                    return True
                if needle in (c.get("email") or "").lower():
                    return True
            return False
        items = [f for f in items if matches(f)]
    if uf:
        items = [f for f in items if (f.get("uf") or "").upper() == uf.upper()]
    if municipio:
        items = [f for f in items if (f.get("municipio") or "").lower() == municipio.lower()]
    if modalidade:
        items = [f for f in items if f.get("modalidade") == modalidade]
    if status:
        items = [f for f in items if f.get("status") == status]
    items = sorted(items, key=lambda f: (f.get("nome_fantasia") or "").lower())
    return items


@app.get("/franqueados/stats/uf")
def stats_uf():
    items = load_franqueados()
    counts = Counter((f.get("uf") or "—").upper() for f in items)
    return [{"uf": uf, "total": total} for uf, total in sorted(counts.items())]


@app.get("/franqueados/stats/municipio")
def stats_municipio():
    items = load_franqueados()
    grouped: dict[tuple[str, str], list[dict]] = {}
    for f in items:
        key = (f.get("uf") or "—", f.get("municipio") or "—")
        grouped.setdefault(key, []).append(f)
    result = [
        {
            "uf": uf,
            "municipio": municipio,
            "total": len(group),
            "franqueados": sorted(
                [{"id": f["id"], "nome_fantasia": f.get("nome_fantasia", "")} for f in group],
                key=lambda x: x["nome_fantasia"].lower(),
            ),
        }
        for (uf, municipio), group in grouped.items()
    ]
    return sorted(result, key=lambda x: x["municipio"].lower())


MESES_PT = [
    "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]


def _build_aniversarios() -> list[dict]:
    items = load_franqueados()
    result = []
    for f in items:
        for c in f.get("contatos") or []:
            dn = c.get("data_nascimento")
            if not dn:
                continue
            try:
                dt = datetime.strptime(dn, "%Y-%m-%d")
            except ValueError:
                continue
            result.append({
                "franqueado_id": f["id"],
                "franqueado_nome": f.get("nome_fantasia", ""),
                "contato_nome": c.get("nome") or "Contato",
                "funcao": c.get("funcao", ""),
                "telefone": c.get("telefone", ""),
                "email": c.get("email", ""),
                "data_nascimento": dn,
                "dia": dt.day,
                "mes": dt.month,
            })
    result.sort(key=lambda x: (x["mes"], x["dia"]))
    return result


@app.get("/franqueados/aniversarios")
def list_aniversarios():
    return _build_aniversarios()


@app.get("/franqueados/aniversarios/export")
def export_aniversarios():
    data = _build_aniversarios()
    wb = Workbook()
    ws = wb.active
    ws.title = "Aniversários"
    ws.append(["Data", "Mês", "Nome do Contato", "Função", "Franqueado", "Telefone", "E-mail"])
    for a in data:
        ws.append([
            f"{a['dia']:02d}/{a['mes']:02d}",
            MESES_PT[a["mes"]],
            a["contato_nome"],
            a["funcao"],
            a["franqueado_nome"],
            a["telefone"],
            a["email"],
        ])
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    filename = f"aniversarios_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/franqueados/aniversarios/export-pdf")
def export_aniversarios_pdf():
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Table, TableStyle

    data = _build_aniversarios()
    cell_style = ParagraphStyle(name="cell", fontSize=9, leading=11)
    header_style = ParagraphStyle(name="header", fontSize=9.5, leading=12, textColor=colors.white, fontName="Helvetica-Bold")

    headers = ["Data", "Mês", "Nome do Contato", "Função", "Franqueado", "Telefone", "E-mail"]
    table_data = [[Paragraph(h, header_style) for h in headers]]
    for a in data:
        row = [
            f"{a['dia']:02d}/{a['mes']:02d}", MESES_PT[a["mes"]], a["contato_nome"],
            a["funcao"], a["franqueado_nome"], a["telefone"], a["email"],
        ]
        table_data.append([Paragraph(str(v), cell_style) for v in row])

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), leftMargin=25, rightMargin=25, topMargin=25, bottomMargin=25)
    weights = [0.6, 0.9, 1.4, 1.0, 1.6, 1.0, 1.6]
    usable_width = landscape(A4)[0] - 50
    col_widths = [usable_width * w / sum(weights) for w in weights]
    table = Table(table_data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#072a3c")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f6f6f6")]),
    ]))
    doc.build([table])
    buffer.seek(0)
    filename = f"aniversarios_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _build_export_table() -> tuple[list[str], list[list[str]]]:
    items = load_franqueados()
    keys = ["id"] + FIELDS
    headers = (
        [EXPORT_HEADERS.get(k, k) for k in keys[:6]] + ["Contatos"]
        + [EXPORT_HEADERS.get(k, k) for k in keys[6:]] + ["Unidades Vinculadas"]
    )
    rows = []
    for f in items:
        contato_parts = []
        for c in f.get("contatos") or []:
            nome = c.get("nome") or "Contato"
            funcao = c.get("funcao")
            label = f"{nome} ({funcao})" if funcao else nome
            valores = f"{c.get('telefone') or ''} {c.get('email') or ''}".strip()
            contato_parts.append(f"{label}: {valores}")
        contatos_str = "; ".join(contato_parts)
        unidade_parts = []
        for u in f.get("unidades") or []:
            local = "/".join(x for x in [u.get("municipio"), u.get("uf")] if x)
            extra = " - ".join(x for x in [u.get("cnpj"), local] if x)
            unidade_parts.append(f"{u.get('nome') or 'Unidade'}" + (f" ({extra})" if extra else ""))
        unidades_str = "; ".join(unidade_parts)
        def cell_value(k):
            v = f.get(k, "")
            if k == "multi_franqueado":
                return "Sim" if v == "sim" else "Não"
            return ", ".join(v) if isinstance(v, list) else str(v)
        row = (
            [cell_value(k) for k in keys[:6]] + [contatos_str]
            + [cell_value(k) for k in keys[6:]] + [unidades_str]
        )
        rows.append(row)
    return headers, rows


@app.get("/franqueados/export")
def export_franqueados():
    headers, rows = _build_export_table()
    wb = Workbook()
    ws = wb.active
    ws.title = "Franqueados"
    ws.append(headers)
    for row in rows:
        ws.append(row)
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    filename = f"franqueados_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/franqueados/export-pdf")
def export_franqueados_pdf():
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Table, TableStyle

    headers, rows = _build_export_table()
    cell_style = ParagraphStyle(name="cell", fontSize=6, leading=7)
    header_style = ParagraphStyle(name="header", fontSize=6.5, leading=8, textColor=colors.white, fontName="Helvetica-Bold")

    table_data = [[Paragraph(h, header_style) for h in headers]]
    for row in rows:
        table_data.append([Paragraph(str(v), cell_style) for v in row])

    # Pesos relativos por coluna: colunas com texto mais longo (nome, contatos,
    # endereço) recebem mais espaço que colunas curtas (ID, número, status).
    COLUMN_WEIGHTS = {
        "ID": 0.4, "Nome Fantasia": 1.6, "Razão Social": 1.6, "CNPJ": 1.0,
        "Contatos": 2.2, "CEP": 0.7, "UF": 0.4, "Município": 1.0, "Bairro": 1.1,
        "Logradouro": 1.6, "Número": 0.5, "Complemento": 0.9, "Modalidade": 0.7,
        "Início da Operação": 0.9, "Fim da Operação": 0.9, "CPF do Franqueado": 0.9,
        "Status": 0.6, "Sistemas Contratados": 1.3, "Observação": 1.6,
        "Multi Franqueado": 0.6, "Unidades Vinculadas": 2.0,
    }
    weights = [COLUMN_WEIGHTS.get(h, 1.0) for h in headers]

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=(1700, 900),
        leftMargin=15, rightMargin=15, topMargin=15, bottomMargin=15,
    )
    usable_width = 1700 - 30
    total_weight = sum(weights)
    col_widths = [usable_width * w / total_weight for w in weights]
    table = Table(table_data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#072a3c")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f6f6f6")]),
    ]))
    doc.build([table])
    buffer.seek(0)
    filename = f"franqueados_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/franqueados/{franqueado_id}")
def get_franqueado(franqueado_id: str):
    items = load_franqueados()
    for f in items:
        if f["id"] == franqueado_id:
            return f
    raise HTTPException(status_code=404, detail="Franqueado não encontrado")


@app.post("/franqueados", status_code=201)
def create_franqueado(body: FranqueadoIn):
    items = load_franqueados()
    existing_ids = [int(f["id"]) for f in items if str(f.get("id", "")).isdigit()]
    new_id = str(max(existing_ids) + 1) if existing_ids else "1"
    record = {"id": new_id, **body.model_dump()}
    items.append(record)
    save_franqueados(items)
    return record


@app.put("/franqueados/{franqueado_id}")
def update_franqueado(franqueado_id: str, body: FranqueadoIn):
    items = load_franqueados()
    for i, f in enumerate(items):
        if f["id"] == franqueado_id:
            items[i] = {"id": franqueado_id, **body.model_dump()}
            save_franqueados(items)
            return items[i]
    raise HTTPException(status_code=404, detail="Franqueado não encontrado")


@app.delete("/franqueados/{franqueado_id}", status_code=204)
def delete_franqueado(franqueado_id: str):
    items = load_franqueados()
    filtered = [f for f in items if f["id"] != franqueado_id]
    if len(filtered) == len(items):
        raise HTTPException(status_code=404, detail="Franqueado não encontrado")
    save_franqueados(filtered)


@app.get("/admin/backups")
def list_backups():
    if not BACKUPS_DIR.exists():
        return []
    snapshots = sorted((p.name for p in BACKUPS_DIR.iterdir() if p.is_dir()), reverse=True)
    return snapshots


@app.post("/admin/backups/{name}/restore")
def restore_backup(name: str):
    source_dir = BACKUPS_DIR / name
    if not source_dir.exists():
        raise HTTPException(status_code=404, detail="Backup não encontrado")
    _run_startup_backup()  # snapshot de segurança do estado atual antes de sobrescrever
    for filename in BACKUP_SOURCE_FILES:
        source = source_dir / filename
        if source.exists():
            shutil.copy2(source, DATA_DIR / filename)
    return {"restored": name}


@app.get("/health")
def health():
    return {"status": "ok"}
