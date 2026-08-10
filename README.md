# Piaseg Franqueados

Portal interno de cadastro e consulta das unidades franqueadas Piaseg. Sem área logada — acesso direto.

- **Backend**: FastAPI, dados em JSON (`backend/franqueados.json`)
- **Frontend**: Next.js (App Router) + Tailwind CSS

## Funcionalidades

- Cadastro, edição e exclusão de franqueados, com número de sequência gerado automaticamente
- Contatos dinâmicos (adicionar quantos quiser, cada um com tipo e valor)
- Modalidades: H.O, Store, Migração, Corporate
- Busca e filtros (nome, razão social, CNPJ, contato, UF, status)
- Exportação para Excel
- Mapa de franqueados por estado
- Relação de franqueados por cidade
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
