export interface Empresa {
  cnpj: string
  nome: string
  endereco: string
  cidade: string
  estado: string
}

export interface Trabalhador {
  id: string
  empresa_cnpj: string
  nome: string
  cpf: string
}

export interface Treinamento {
  id: string
  nome: string
  carga_horaria: number
  conteudo_programatico: string
}

export interface Turma {
  id: string
  empresa_cnpj: string
  treinamento_id: string
  data_inicio: string
  data_fim: string
  data_vencimento: string
}

export interface TurmaTrabalhador {
  id: string
  turma_id: string
  trabalhador_id: string
}

export interface TurmaView {
  id: string
  data_inicio: string
  data_fim: string
  data_vencimento: string
  empresa_nome: string
  empresa_cidade: string
  treinamento_nome: string
  carga_horaria: number
  total_alunos: number
  status: 'Valido' | 'Proximo ao vencimento' | 'Vencido'
}

export interface CertificadoView {
  id: string
  turma_id: string
  data_fim: string
  data_vencimento: string
  trabalhador_nome: string
  trabalhador_cpf: string
  empresa_nome: string
  empresa_cidade: string
  empresa_estado: string
  treinamento_nome: string
  carga_horaria: number
  conteudo_programatico: string
}

export interface CertificateData {
  nome: string
  cpf: string
  curso: string
  carga_horaria: string
  data: string
  empresa: string
  cidade: string
  estado?: string
  conteudoProgramatico?: string[]
}

export interface RowData {
  nome?: string
  cpf?: string
}
