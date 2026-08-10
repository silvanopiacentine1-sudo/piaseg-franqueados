import io
import json
import os
import shutil
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from pydantic import BaseModel

import auth

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
BACKUP_SOURCE_FILES = ["franqueados.json", "users.json"]
MAX_BACKUPS = 30

FIELDS = [
    "nome_fantasia", "razao_social", "cnpj", "email", "telefone", "celular",
    "cep", "uf", "municipio", "bairro", "logradouro", "numero", "complemento",
    "latitude", "longitude", "ie", "natureza_juridica", "capital_social",
    "inaugurada", "grupos", "data_inicio_implantacao", "data_fim_implantacao",
    "data_inauguracao", "data_criacao", "data_criacao_sistema",
    "data_inativacao", "tipo", "cpf_franqueado", "status",
]

EXPORT_HEADERS = {
    "id": "ID", "nome_fantasia": "Nome Fantasia", "razao_social": "Razão Social",
    "cnpj": "CNPJ", "email": "Email", "telefone": "Telefone", "celular": "Celular",
    "cep": "CEP", "uf": "UF", "municipio": "Município", "bairro": "Bairro",
    "logradouro": "Logradouro", "numero": "Número", "complemento": "Complemento",
    "latitude": "Latitude", "longitude": "Longitude", "ie": "IE",
    "natureza_juridica": "Natureza Jurídica", "capital_social": "Capital Social",
    "inaugurada": "Inaugurada", "grupos": "Grupos",
    "data_inicio_implantacao": "Data Início Implantação",
    "data_fim_implantacao": "Data Fim Implantação",
    "data_inauguracao": "Data Inauguração", "data_criacao": "Data Criação",
    "data_criacao_sistema": "Data Criação Sistema",
    "data_inativacao": "Data Inativação", "tipo": "Tipo",
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


def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Não autenticado")
    token = authorization.removeprefix("Bearer ")
    payload = auth.decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
    return payload


class LoginRequest(BaseModel):
    username: str
    password: str


class FranqueadoIn(BaseModel):
    nome_fantasia: str = ""
    razao_social: str = ""
    cnpj: str = ""
    email: str = ""
    telefone: str = ""
    celular: str = ""
    cep: str = ""
    uf: str = ""
    municipio: str = ""
    bairro: str = ""
    logradouro: str = ""
    numero: str = ""
    complemento: str = ""
    latitude: str = ""
    longitude: str = ""
    ie: str = ""
    natureza_juridica: str = ""
    capital_social: str = ""
    inaugurada: str = ""
    grupos: str = ""
    data_inicio_implantacao: str = ""
    data_fim_implantacao: str = ""
    data_inauguracao: str = ""
    data_criacao: str = ""
    data_criacao_sistema: str = ""
    data_inativacao: str = ""
    tipo: str = "Loja Franqueada"
    cpf_franqueado: str = ""
    status: str = "ativo"


class UserIn(BaseModel):
    username: str
    name: str
    password: str


class UserUpdateIn(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None


@app.post("/auth/login")
def login(body: LoginRequest):
    user = auth.authenticate(body.username, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos")
    token = auth.create_token(user["username"], user["name"])
    return {"token": token, "name": user["name"], "username": user["username"]}


@app.get("/auth/me")
def me(user: dict = Depends(get_current_user)):
    return {"username": user["sub"], "name": user["name"]}


@app.get("/franqueados")
def list_franqueados(
    q: Optional[str] = None,
    uf: Optional[str] = None,
    municipio: Optional[str] = None,
    tipo: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    items = load_franqueados()
    if q:
        needle = q.strip().lower()
        items = [
            f for f in items
            if needle in (f.get("nome_fantasia") or "").lower()
            or needle in (f.get("razao_social") or "").lower()
            or needle in (f.get("cnpj") or "").lower()
            or needle in (f.get("email") or "").lower()
            or needle in (f.get("municipio") or "").lower()
        ]
    if uf:
        items = [f for f in items if (f.get("uf") or "").upper() == uf.upper()]
    if municipio:
        items = [f for f in items if (f.get("municipio") or "").lower() == municipio.lower()]
    if tipo:
        items = [f for f in items if f.get("tipo") == tipo]
    if status:
        items = [f for f in items if f.get("status") == status]
    items = sorted(items, key=lambda f: (f.get("nome_fantasia") or "").lower())
    return items


@app.get("/franqueados/stats/uf")
def stats_uf(user: dict = Depends(get_current_user)):
    items = load_franqueados()
    counts = Counter((f.get("uf") or "—").upper() for f in items)
    return [{"uf": uf, "total": total} for uf, total in sorted(counts.items())]


@app.get("/franqueados/stats/municipio")
def stats_municipio(user: dict = Depends(get_current_user)):
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
def export_franqueados(user: dict = Depends(get_current_user)):
    items = load_franqueados()
    wb = Workbook()
    ws = wb.active
    ws.title = "Franqueados"
    keys = ["id"] + FIELDS
    ws.append([EXPORT_HEADERS.get(k, k) for k in keys])
    for f in items:
        ws.append([f.get(k, "") for k in keys])
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
def get_franqueado(franqueado_id: str, user: dict = Depends(get_current_user)):
    items = load_franqueados()
    for f in items:
        if f["id"] == franqueado_id:
            return f
    raise HTTPException(status_code=404, detail="Franqueado não encontrado")


@app.post("/franqueados", status_code=201)
def create_franqueado(body: FranqueadoIn, user: dict = Depends(get_current_user)):
    items = load_franqueados()
    existing_ids = [int(f["id"]) for f in items if str(f.get("id", "")).isdigit()]
    new_id = str(max(existing_ids) + 1) if existing_ids else "1"
    record = {"id": new_id, **body.model_dump()}
    items.append(record)
    save_franqueados(items)
    return record


@app.put("/franqueados/{franqueado_id}")
def update_franqueado(franqueado_id: str, body: FranqueadoIn, user: dict = Depends(get_current_user)):
    items = load_franqueados()
    for i, f in enumerate(items):
        if f["id"] == franqueado_id:
            items[i] = {"id": franqueado_id, **body.model_dump()}
            save_franqueados(items)
            return items[i]
    raise HTTPException(status_code=404, detail="Franqueado não encontrado")


@app.delete("/franqueados/{franqueado_id}", status_code=204)
def delete_franqueado(franqueado_id: str, user: dict = Depends(get_current_user)):
    items = load_franqueados()
    filtered = [f for f in items if f["id"] != franqueado_id]
    if len(filtered) == len(items):
        raise HTTPException(status_code=404, detail="Franqueado não encontrado")
    save_franqueados(filtered)


@app.get("/admin/users")
def list_users(user: dict = Depends(get_current_user)):
    return [{"username": u["username"], "name": u["name"]} for u in auth.load_users()]


@app.post("/admin/users", status_code=201)
def create_user(body: UserIn, user: dict = Depends(get_current_user)):
    try:
        return auth.create_user(body.username, body.name, body.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/admin/users/{username}")
def update_user_endpoint(username: str, body: UserUpdateIn, user: dict = Depends(get_current_user)):
    result = auth.update_user(username, name=body.name, password=body.password)
    if not result:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return result


@app.delete("/admin/users/{username}", status_code=204)
def delete_user_endpoint(username: str, user: dict = Depends(get_current_user)):
    try:
        deleted = auth.delete_user(username)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not deleted:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")


@app.get("/admin/backups")
def list_backups(user: dict = Depends(get_current_user)):
    if not BACKUPS_DIR.exists():
        return []
    snapshots = sorted((p.name for p in BACKUPS_DIR.iterdir() if p.is_dir()), reverse=True)
    return snapshots


@app.post("/admin/backups/{name}/restore")
def restore_backup(name: str, user: dict = Depends(get_current_user)):
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
