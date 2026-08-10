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

FIELDS = [
    "nome_fantasia", "razao_social", "cnpj", "cep", "uf", "municipio",
    "bairro", "logradouro", "numero", "complemento", "modalidade",
    "inicio_operacao", "fim_operacao", "cpf_franqueado", "status",
]

EXPORT_HEADERS = {
    "id": "ID", "nome_fantasia": "Nome Fantasia", "razao_social": "Razão Social",
    "cnpj": "CNPJ", "contatos": "Contatos", "cep": "CEP", "uf": "UF",
    "municipio": "Município", "bairro": "Bairro", "logradouro": "Logradouro",
    "numero": "Número", "complemento": "Complemento", "modalidade": "Modalidade",
    "inicio_operacao": "Início da Operação", "fim_operacao": "Fim da Operação",
    "cpf_franqueado": "CPF do Franqueado", "status": "Status",
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


class Contato(BaseModel):
    nome: str = ""
    telefone: str = ""
    email: str = ""


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
    return sorted(result, key=lambda x: (x["uf"], x["municipio"]))


@app.get("/franqueados/export")
def export_franqueados():
    items = load_franqueados()
    wb = Workbook()
    ws = wb.active
    ws.title = "Franqueados"
    keys = ["id"] + FIELDS
    headers = [EXPORT_HEADERS.get(k, k) for k in keys[:6]] + ["Contatos"] + [EXPORT_HEADERS.get(k, k) for k in keys[6:]]
    ws.append(headers)
    for f in items:
        contatos_str = "; ".join(
            f"{c.get('nome') or 'Contato'}: {c.get('telefone') or ''} {c.get('email') or ''}".strip()
            for c in f.get("contatos") or []
        )
        row = [f.get(k, "") for k in keys[:6]] + [contatos_str] + [f.get(k, "") for k in keys[6:]]
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
