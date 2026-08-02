-- Tabelas do sistema TOPSEGST - Controle de Treinamentos

CREATE TABLE IF NOT EXISTS empresas (
  cnpj TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT,
  cidade TEXT,
  estado TEXT CHECK (estado IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trabalhadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_cnpj TEXT REFERENCES empresas(cnpj) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS treinamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  carga_horaria INTEGER NOT NULL,
  conteudo_programatico TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_cnpj TEXT NOT NULL REFERENCES empresas(cnpj) ON DELETE CASCADE,
  treinamento_id UUID NOT NULL REFERENCES treinamentos(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS turma_trabalhadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  trabalhador_id UUID NOT NULL REFERENCES trabalhadores(id) ON DELETE CASCADE,
  UNIQUE(turma_id, trabalhador_id)
);

-- View para dashboard com status calculado
CREATE OR REPLACE VIEW turmas_view AS
SELECT
  t.id,
  t.data_inicio,
  t.data_fim,
  t.data_vencimento,
  e.nome AS empresa_nome,
  e.cidade AS empresa_cidade,
  tr.nome AS treinamento_nome,
  tr.carga_horaria,
  COUNT(tt.id) AS total_alunos,
  CASE
    WHEN t.data_vencimento < CURRENT_DATE THEN 'Vencido'
    WHEN (t.data_vencimento - CURRENT_DATE) <= 90 THEN 'Proximo ao vencimento'
    ELSE 'Valido'
  END AS status
FROM turmas t
JOIN empresas e ON e.cnpj = t.empresa_cnpj
JOIN treinamentos tr ON tr.id = t.treinamento_id
LEFT JOIN turma_trabalhadores tt ON tt.turma_id = t.id
GROUP BY t.id, e.nome, e.cidade, tr.nome, tr.carga_horaria;

-- View para certificados
CREATE OR REPLACE VIEW certificados_view AS
SELECT
  tt.id,
  t.id AS turma_id,
  t.data_fim,
  t.data_vencimento,
  trab.nome AS trabalhador_nome,
  trab.cpf AS trabalhador_cpf,
  e.nome AS empresa_nome,
  e.cidade AS empresa_cidade,
  tr.nome AS treinamento_nome,
  tr.carga_horaria
FROM turma_trabalhadores tt
JOIN turmas t ON t.id = tt.turma_id
JOIN trabalhadores trab ON trab.id = tt.trabalhador_id
JOIN empresas e ON e.cnpj = t.empresa_cnpj
JOIN treinamentos tr ON tr.id = t.treinamento_id;

-- Políticas RLS (acesso livre - sem autenticação)
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabalhadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE treinamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE turma_trabalhadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY allow_all_empresas ON empresas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_trabalhadores ON trabalhadores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_treinamentos ON treinamentos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_turmas ON turmas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_turma_trabalhadores ON turma_trabalhadores FOR ALL USING (true) WITH CHECK (true);
