# TOPSEGST App — Instruções para o Agente

## Sessão — 26/07/2026

### O que foi feito
- Substituída a geração de certificados via pdfmake (desenhava do zero) por um módulo que usa o PDF-template oficial do cliente como base
- Criado `src/utils/certificado/localizarPlaceholders.ts` — lê placeholders `{{chave}}` do PDF com `pdfjs-dist` (dynamic import para evitar erro DOMMatrix no SSR)
- Criado `src/utils/certificado/gerarCertificadoPDF.ts` — carrega o template, cobre placeholders com retângulos e desenha texto real com `pdf-lib`
- Atualizado `src/lib/pdf-engine.ts` para delegar ao novo módulo
- Atualizado `src/app/turmas/page.tsx` para passar `conteudoProgramatico` (split por newline) na finalização da turma
- Dependências adicionadas: `pdfjs-dist@6.1.200`, `pdf-lib@1.17.1`

### Problema conhecido
O template `public/templates/certificado_template.pdf` foi exportado do Google Docs e tem o texto rasterizado em imagens — `localizarPlaceholders` não consegue detectar os placeholders automaticamente. O sistema cai no fallback de coordenadas fixas (objeto `DEFAULTS`), que precisam ser calibradas manualmente.

Foi gerado `grade_referencia.pdf` na raiz do projeto (grid visual com eixos X/Y a cada 50pt) para facilitar a leitura das coordenadas exatas de cada campo.

### Próximo passo (pendente)
**Calibrar coordenadas e cores do módulo de certificados:**
1. Abrir `grade_referencia.pdf` e anotar x/y/fontSize de cada campo `{{placeholder}}`
2. Extrair a cor exata do fundo (conta-gotas) das páginas 1 e 2
3. Atualizar o objeto `DEFAULTS` em `gerarCertificadoPDF.ts` com as coordenadas reais
4. Ajustar a cor dos retângulos de cobertura para bater com o fundo
5. Testar com dados reais até o resultado visual ficar correto

## Stack
- **Framework:** Next.js 16 (App Router)
- **UI:** React 19 + TypeScript
- **Database:** Supabase (PostgreSQL)
- **Package Manager:** pnpm
- **Ícones:** lucide-react
- **Certificados:** pdf-lib + pdfjs-dist + jszip
- **Planilhas:** xlsx (SheetJS)
- **CSS:** Custom properties (tema dark), sem framework CSS

## Comandos Essenciais
```bash
pnpm dev       # Dev server (localhost:3000)
pnpm build     # Build de produção
pnpm start     # Servidor de produção
pnpm lint      # ESLint
```

## Estrutura do Projeto
```
src/
  lib/
    supabase.ts           # Cliente Supabase (lazy init)
    pdf-engine.ts         # Geração de certificados (delega para utils/certificado/)
    types.ts              # Interfaces compartilhadas
  utils/
    certificado/
      localizarPlaceholders.ts  # Leitura de placeholders {{chave}} via pdfjs-dist
      gerarCertificadoPDF.ts    # Geração do PDF preenchido via pdf-lib
  app/
    globals.css           # Tema dark + classes utilitárias
    layout.tsx            # Layout raiz (Sidebar + Header + Content)
    page.tsx              # Dashboard (KPIs, status, últimos treinamentos)
    componentes/
      Sidebar.tsx         # Nav: Dashboard, Empresas, Trabalhadores, Treinamentos, Turmas, Certificados
      ui/
        Modal.tsx         # Modal reutilizável
        Toast.tsx         # Toast de feedback (success/error)
        Loading.tsx       # Loading overlay com spinner
    empresas/
      page.tsx            # CRUD completo (CNPJ PK, upsert)
    trabalhadores/
      page.tsx            # CRUD + Importar CSV/XLSX + Colar planilha
    treinamentos/
      page.tsx            # CRUD completo
    turmas/
      page.tsx            # CRUD + Finalizar (salva + gera .zip certificados)
```

## Database Schema (executar no Supabase SQL Editor)

5 tabelas + 2 views, todas com RLS liberado:

```sql
-- empresas: CNPJ (PK), nome, endereco, cidade, estado (CHECK 27 UFs)
-- trabalhadores: id (UUID), empresa_cnpj (FK), nome, cpf (UNIQUE)
-- treinamentos: id (UUID), nome, carga_horaria (INT), conteudo_programatico
-- turmas: id (UUID), empresa_cnpj (FK), treinamento_id (FK), data_inicio, data_fim, data_vencimento
-- turma_trabalhadores: id (UUID), turma_id (FK), trabalhador_id (FK), UNIQUE(turma_id, trabalhador_id)
```

**View turmas_view:** join turmas + empresas + treinamentos com status computado:
- `Vencido`: data_vencimento < CURRENT_DATE
- `Próximo ao vencimento`: <= 90 dias
- `Válido`: demais casos

**View certificados_view:** join completo para geração de certificados.

### Regras de RLS
Todas as tabelas com `allow_all_...` (sem autenticação por enquanto).

## Variáveis de Ambiente
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Regras de Negócio

### Cadastro de Empresa
- CNPJ é PK (texto livre, sem máscara)
- Estado validado via CHECK constraint (27 UFs)
- Upsert: se CNPJ existir, atualiza; senão, insere

### Cadastro de Trabalhador
- Vinculado obrigatoriamente a uma empresa (select dropdown)
- CPF é único na tabela (UNIQUE constraint)
- Importação em massa: detecta colunas 'nome' e 'cpf' (case insensitive), pula CPFs duplicados

### Cadastro de Treinamento
- Nome + Carga Horária (número inteiro) + Conteúdo Programático (textarea)

### Cadastro de Turma (mais complexo)
- Seleciona Empresa + Treinamento (dropdowns carregados do banco)
- Datas: Início, Fim, Vencimento (date inputs)
- Alunos: adicionar manual (Nome + CPF), importar CSV/XLSX, ou colar planilha
- Botão **Finalizar**: valida → salva turma → cria trabalhadores (find-or-create por CPF) → vincula turma_trabalhadores → busca template no Storage → gera .docx por aluno → compacta em .zip → download automático
- Se certificado falhar, deleta a turma criada (rollback parcial)
- Template: bucket `certificados`, arquivo `template_certificado.docx`

### Dashboard
- KPIs: Total, Válidos, Próximo ao vencimento, Vencidos
- Barra de distribuição de status
- Tabela dos 5 últimos treinamentos

### Geração de Certificados
- Template PDF oficial: `/public/templates/certificado_template.pdf`
- Biblioteca: pdf-lib + pdfjs-dist (leitura de placeholders), jszip (empacotamento)
- Fluxo: carrega template → detecta placeholders ou usa fallback de coordenadas → desenha retângulo de cobertura → insere texto real → retorna blob ou zip

## Estilo (CSS)
- Tema dark com variáveis CSS customizadas (--background, --surface, --primary, --success, --warning, --danger)
- Classes utilitárias: .card, .btn, .btn-primary, .btn-secondary, .btn-danger, .btn-icon, .form-group, .form-label, .form-control, .form-row, .form-actions, .table-wrapper, .badge (.badge-success/warning/danger), .toast (.toast-success/error), .modal-overlay, .modal-container, .action-bar, .kpi-grid, .kpi-card, .empty-state, .tabs, .tab, .section-divider, .inline-form, .loading-overlay, .spinner, .status-bar
- Sidebar fixa 260px, layout flex com main-content
- Responsivo a 768px (colunas viram 1)
- Sem CSS-in-JS ou Tailwind — usar classes globais + inline styles pontuais

## Observações Técnicas
- Todas as páginas são `"use client"` (sem Server Components)
- Path alias: `@/*` → `./src/*`
- PC Windows — usar cmd.exe para comandos
- `.npmrc` com `node-linker=hoisted` para compatibilidade Windows
- Build de produção usa `next build`

## Próximos Passos Possíveis
- Calibrar coordenadas e cores do módulo de certificados (ver sessão 26/07/2026)
- Autenticação (controle de acesso)
- Relatórios/exportações
- Melhorias no layout responsivo
- Testes automatizados
