# TOPSEGST App

Sistema de gestão de treinamentos de segurança do trabalho (NR). Cadastra empresas, trabalhadores, treinamentos e turmas, acompanha a validade dos treinamentos e gera certificados de conclusão em PDF (individualmente ou em lote compactados em `.zip`).

## Funcionalidades

- **Dashboard** — KPIs de treinamentos (total, válidos, próximos ao vencimento, vencidos), distribuição por status e últimos treinamentos.
- **Empresas** — CRUD completo (CNPJ como chave, upsert, máscara de CNPJ e validação de UF).
- **Trabalhadores** — CRUD + importação em massa via CSV/XLSX ou colagem de planilha.
- **Treinamentos** — CRUD com nome, carga horária e conteúdo programático.
- **Turmas** — CRUD com datas, alunos e botão **Finalizar**: salva a turma, vincula trabalhadores (find-or-create por CPF) e gera um `.zip` com todos os certificados.
- **Certificados** — geração baseada no template oficial do cliente (overlay de texto sobre a arte do certificado) com fontes Calibri.

## Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| UI | React 19 + TypeScript |
| Banco de dados | Supabase (PostgreSQL + Row Level Security) |
| Pacotes de certificados | @react-pdf/renderer, pdfjs-dist, pdf-lib, jszip |
| Planilhas (importação) | xlsx (SheetJS) |
| Ícones | lucide-react |
| Estilo | CSS puro com variáveis customizadas (tema dark), sem framework CSS |
| Package manager | pnpm |

## Scripts

```bash
pnpm dev       # Dev server (localhost:3000)
pnpm build     # Build de produção
pnpm start     # Servidor de produção
pnpm lint      # ESLint
```

## Variáveis de ambiente

Crie um arquivo `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Na Vercel, essas mesmas variáveis devem ser configuradas em **Project Settings → Environment Variables**.

## Detalhes técnicos

### Estrutura

```
src/
  lib/
    supabase.ts           # Cliente Supabase (lazy init com fallback placeholder)
    pdf-engine.ts         # Geração de certificados
    types.ts              # Interfaces compartilhadas
  utils/
    certificado/
      CertificadoPDF.tsx        # Layout do certificado (react-pdf) sobre a arte do template
      gerarCertificadoPDF.ts    # Geração individual + em lote (.zip)
      tipos.ts                  # Tipos dos dados do certificado
  app/
    layout.tsx            # Layout raiz (Sidebar + Header + Content)
    page.tsx              # Dashboard
    empresas/             # CRUD de empresas
    trabalhadores/        # CRUD + importação de planilhas
    treinamentos/         # CRUD de treinamentos
    turmas/               # CRUD + finalização com geração de certificados
    certificados/         # Listagem/consulta de certificados
```

### Modelo de dados

- **empresas** — CNPJ (PK), nome, endereço, cidade e estado (CHECK de 27 UFs).
- **trabalhadores** — id (UUID), empresa (FK), nome e CPF (UNIQUE).
- **treinamentos** — id (UUID), nome, carga horária e conteúdo programático.
- **turmas** — id (UUID), empresa (FK), treinamento (FK) e datas (início, fim, vencimento).
- **turma_trabalhadores** — vínculo N:N entre turmas e trabalhadores (UNIQUE por par).
- **turmas_view** — join de turmas + empresas + treinamentos com status computado (Válido / Próximo ao vencimento / Vencido).
- **certificados_view** — join completo usado na geração de certificados.

Todas as tabelas usam **Row Level Security** (políticas de acesso liberado — sem autenticação por enquanto).

### Geração de certificados

1. A turma é finalizada e cada aluno gera um PDF de certificado via `@react-pdf/renderer`.
2. A arte oficial (frente/verso do certificado) é carregada de `public/templates/*.png`.
3. Textos reais (nome, CPF, treinamento, datas, conteúdo programático) são desenhados sobre painéis com posição fixa.
4. As fontes Calibri (regular/bold) são registradas no react-pdf a partir de `public/fonts/`.
5. Os PDFs dos alunos são compactados em `.zip` e baixados automaticamente.

> O backup do template oficial (PDF original) fica fora do repositório — não versionado de propósito.

### Arquivos não versionados

Com `database.sql` e `AGENTS.md` fora do git, o schema é aplicado manualmente via Supabase SQL Editor.