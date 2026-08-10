# Piaseg Franqueados

Portal interno de cadastro e consulta das unidades franqueadas Piaseg.

- **Backend**: FastAPI + JWT, dados em JSON (`backend/franqueados.json`, `backend/users.json`)
- **Frontend**: Next.js (App Router) + Tailwind CSS

## Funcionalidades

- Login para equipe interna (JWT, 60 dias)
- Cadastro, edição e exclusão de franqueados
- Busca e filtros (nome, razão social, CNPJ, email, UF, status)
- Exportação para Excel
- Mapa de franqueados por estado
- Relação de franqueados por cidade
- Gestão de usuários internos do portal
- Backup automático a cada deploy (últimos 30 snapshots) + restauração

## Desenvolvimento local

```bash
# Backend
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --reload

# Frontend
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```
