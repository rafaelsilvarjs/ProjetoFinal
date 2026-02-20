# EduFlow

MVP para apoio a professores e alunos no ensino publico, com geracao de atividades de multipla escolha, resposta pelos alunos e dashboard de desempenho da turma.

## Funcionalidades

- Autenticacao com perfis `teacher` e `student`
- Professor:
  - gerar previa de 3 questoes por tema, nivel e serie
  - gerar novamente (variacoes de questoes)
  - publicar atividade aprovada
  - listar e apagar atividades proprias
  - dashboard com acertos por aluno e dica de atencao pedagogica
- Aluno:
  - responder atividades publicas
  - feedback por alternativa (verde/vermelho)
  - resumo final de acertos
  - historico de tentativas

## Estrutura

```
eduflow/
  backend/   # API Node.js + Express + Prisma
  frontend/  # React + Vite
  docs/      # Documentacao tecnica
```

## Arquitetura

- Documento tecnico: `docs/ARCHITECTURE.md`

## Tecnologias

- Backend: Node.js, Express, Prisma, JWT, bcryptjs
- Frontend: React, Vite, Axios
- Banco: PostgreSQL (com fallback em memoria para parte do MVP)

## Como rodar localmente

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

API sobe em `http://localhost:3000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend sobe em `http://localhost:5173`.

## Variaveis de ambiente (backend)

Criar `backend/.env` com:

```env
DATABASE_URL="sua_url_postgres"
JWT_SECRET="seu_segredo"
ACTIVITY_PROVIDER="mock"
```

`ACTIVITY_PROVIDER=mock` permite testar atividades sem depender de provedor externo.

## Rotas principais (backend)

### Auth

- `POST /auth/register`
- `POST /auth/login`

### Activities

- `GET /activities/public` (publico)
- `POST /activities/preview` (teacher)
- `POST /activities/generate` (teacher)
- `GET /activities` (teacher)
- `DELETE /activities/:id` (teacher)
- `GET /activities/teacher/stats` (teacher)
- `POST /activities/:id/submit` (student)
- `GET /activities/student/history` (student)

## Fluxo recomendado para demonstracao

1. Login como professor
2. Gerar previa, regenerar, publicar
3. Login como aluno e responder atividades
4. Voltar ao professor e abrir dashboard da turma

## Repositorio

GitHub: `https://github.com/rafaelsilvarjs/ProjetoFinal`
