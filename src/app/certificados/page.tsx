'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { generatePdfCertificate, generateBatchCertificates } from '@/lib/pdf-engine'
import type { CertificadoView } from '@/lib/types'
import Toast from '@/app/components/ui/Toast'
import Loading from '@/app/components/ui/Loading'
import {
  Award,
  Search,
  Download,
  FileDown,
  CheckCircle,
  Clock,
  AlertCircle,
  Filter,
  X,
} from 'lucide-react'

type StatusType = 'Valido' | 'Proximo ao vencimento' | 'Vencido'

interface CertificadoComStatus extends CertificadoView {
  status: StatusType
  estado: string
}

function calcStatus(dataVencimento: string): StatusType {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const venc = new Date(dataVencimento + 'T00:00:00')
  if (venc < hoje) return 'Vencido'
  const diffDays = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 90) return 'Proximo ao vencimento'
  return 'Valido'
}

function getStatusBadgeClass(status: StatusType) {
  if (status === 'Valido') return 'badge badge-success'
  if (status === 'Proximo ao vencimento') return 'badge badge-warning'
  return 'badge badge-danger'
}

function getStatusLabel(status: StatusType) {
  if (status === 'Valido') return 'Válido'
  if (status === 'Proximo ao vencimento') return 'Próx. ao vencimento'
  return 'Vencido'
}

export default function CertificadosPage() {
  const [certificados, setCertificados] = useState<CertificadoComStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [downloadMsg, setDownloadMsg] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroTreinamento, setFiltroTreinamento] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  // Seleção para download em lote
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchCertificados()
  }, [])

  async function fetchCertificados() {
    setLoading(true)
    const { data, error } = await supabase
      .from('certificados_view')
      .select('*')
      .order('data_fim', { ascending: false })

    if (error) {
      setToast({ type: 'error', message: 'Erro ao carregar certificados' })
      setLoading(false)
      return
    }

    if (data) {
      const rows = data as CertificadoView[]

      // Busca o estado da empresa direto na tabela empresas
      // (a view não expõe esse campo, mas o estado já existe no cadastro)
      const turmaIds = Array.from(new Set(rows.map((c) => c.turma_id)))
      const { data: turmas } = await supabase
        .from('turmas')
        .select('id, empresa_cnpj')
        .in('id', turmaIds)
      const cnpjPorTurma = Object.fromEntries((turmas || []).map((t) => [t.id, t.empresa_cnpj]))

      const cnpjs = Array.from(new Set((turmas || []).map((t) => t.empresa_cnpj)))
      const { data: empresas } = await supabase
        .from('empresas')
        .select('cnpj, estado')
        .in('cnpj', cnpjs)
      const estadoPorCnpj = Object.fromEntries((empresas || []).map((e) => [e.cnpj, e.estado]))

      const comStatus: CertificadoComStatus[] = rows.map((c) => ({
        ...c,
        estado: estadoPorCnpj[cnpjPorTurma[c.turma_id]] ?? '',
        status: calcStatus(c.data_vencimento),
      }))
      setCertificados(comStatus)
    }
    setLoading(false)
  }

  // Listas únicas para filtros
  const empresas = useMemo(() => {
    const set = new Set(certificados.map((c) => c.empresa_nome))
    return Array.from(set).sort()
  }, [certificados])

  const treinamentos = useMemo(() => {
    const set = new Set(certificados.map((c) => c.treinamento_nome))
    return Array.from(set).sort()
  }, [certificados])

  // Filtragem
  const filtered = useMemo(() => {
    return certificados.filter((c) => {
      if (filtroEmpresa && c.empresa_nome !== filtroEmpresa) return false
      if (filtroTreinamento && c.treinamento_nome !== filtroTreinamento) return false
      if (filtroStatus && c.status !== filtroStatus) return false
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const match =
          c.trabalhador_nome.toLowerCase().includes(term) ||
          c.trabalhador_cpf.toLowerCase().includes(term) ||
          c.treinamento_nome.toLowerCase().includes(term) ||
          c.empresa_nome.toLowerCase().includes(term)
        if (!match) return false
      }
      return true
    })
  }, [certificados, filtroEmpresa, filtroTreinamento, filtroStatus, searchTerm])

  // KPIs
  const total = filtered.length
  const validos = filtered.filter((c) => c.status === 'Valido').length
  const proximos = filtered.filter((c) => c.status === 'Proximo ao vencimento').length
  const vencidos = filtered.filter((c) => c.status === 'Vencido').length

  const hasActiveFilters = filtroEmpresa || filtroTreinamento || filtroStatus || searchTerm

  function clearFilters() {
    setFiltroEmpresa('')
    setFiltroTreinamento('')
    setFiltroStatus('')
    setSearchTerm('')
  }

  // Seleção
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)))
    }
  }

  // Download individual
  async function handleDownloadSingle(cert: CertificadoComStatus) {
    setDownloading(true)
    setDownloadMsg(`Gerando certificado de ${cert.trabalhador_nome}...`)

    try {
      const blob = await generatePdfCertificate({
        nome: cert.trabalhador_nome,
        cpf: cert.trabalhador_cpf,
        curso: cert.treinamento_nome,
        carga_horaria: String(cert.carga_horaria),
        data: new Date(cert.data_fim).toLocaleDateString('pt-BR'),
        empresa: cert.empresa_nome,
        cidade: cert.empresa_cidade || '',
        estado: cert.estado || '',
        conteudoProgramatico: (cert.conteudo_programatico || '')
          .split('\n')
          .filter(Boolean),
      })

      if (!blob) {
        setToast({ type: 'error', message: 'Erro ao gerar o certificado. Verifique se o template existe no Storage.' })
        setDownloading(false)
        return
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${cert.trabalhador_nome} - ${cert.treinamento_nome}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setToast({ type: 'success', message: 'Certificado baixado com sucesso!' })
    } catch {
      setToast({ type: 'error', message: 'Erro ao gerar certificado' })
    }

    setDownloading(false)
  }

  // Download em lote
  async function handleDownloadBatch() {
    if (selectedIds.size === 0) {
      setToast({ type: 'error', message: 'Selecione ao menos um certificado' })
      return
    }

    setDownloading(true)
    setDownloadMsg(`Gerando ${selectedIds.size} certificado(s)...`)

    try {
      const selectedCerts = filtered.filter((c) => selectedIds.has(c.id))
      const studentsData = selectedCerts.map((cert) => ({
        nome: cert.trabalhador_nome,
        cpf: cert.trabalhador_cpf,
        curso: cert.treinamento_nome,
        carga_horaria: String(cert.carga_horaria),
        data: new Date(cert.data_fim).toLocaleDateString('pt-BR'),
        empresa: cert.empresa_nome,
        cidade: cert.empresa_cidade || '',
        estado: cert.estado || '',
        conteudoProgramatico: (cert.conteudo_programatico || '')
          .split('\n')
          .filter(Boolean),
      }))

      const turmaName = selectedCerts.length === 1
        ? selectedCerts[0].treinamento_nome
        : 'Certificados_Selecionados'

      const zipBlob = await generateBatchCertificates('', studentsData, turmaName)

      if (!zipBlob) {
        setToast({ type: 'error', message: 'Erro ao gerar certificados.' })
        setDownloading(false)
        return
      }

      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${turmaName}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setToast({ type: 'success', message: `${selectedIds.size} certificado(s) baixado(s) com sucesso!` })
      setSelectedIds(new Set())
    } catch {
      setToast({ type: 'error', message: 'Erro ao gerar certificados em lote' })
    }

    setDownloading(false)
  }

  if (loading) {
    return (
      <div>
        <h1 className="page-title">Certificados</h1>
        <div className="empty-state">
          <div className="empty-state-title">Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="page-title">Certificados</h1>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={20} style={{ color: 'var(--primary)' }} />
            <span className="kpi-label">Total de certificados</span>
          </div>
          <div className="kpi-value">{total}</div>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={20} style={{ color: 'var(--success)' }} />
            <span className="kpi-label">Válidos</span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>{validos}</div>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={20} style={{ color: 'var(--warning)' }} />
            <span className="kpi-label">Próximo ao vencimento</span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--warning)' }}>{proximos}</div>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} style={{ color: 'var(--danger)' }} />
            <span className="kpi-label">Vencidos</span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--danger)' }}>{vencidos}</div>
        </div>
      </div>

      {/* Filtros + Ações */}
      <div className="action-bar">
        <div className="filter-bar">
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              className="form-control"
              style={{ paddingLeft: '2.25rem', minWidth: 220 }}
              type="text"
              placeholder="Buscar por nome, CPF, curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="form-control"
            value={filtroEmpresa}
            onChange={(e) => setFiltroEmpresa(e.target.value)}
          >
            <option value="">Todas as empresas</option>
            {empresas.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>

          <select
            className="form-control"
            value={filtroTreinamento}
            onChange={(e) => setFiltroTreinamento(e.target.value)}
          >
            <option value="">Todos os treinamentos</option>
            {treinamentos.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            className="form-control"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="Valido">Válido</option>
            <option value="Proximo ao vencimento">Próximo ao vencimento</option>
            <option value="Vencido">Vencido</option>
          </select>

          {hasActiveFilters && (
            <button className="btn btn-secondary" onClick={clearFilters} title="Limpar filtros">
              <X size={16} />
              Limpar
            </button>
          )}
        </div>

        {selectedIds.size > 0 && (
          <button className="btn btn-primary" onClick={handleDownloadBatch}>
            <FileDown size={18} />
            Baixar {selectedIds.size} selecionado(s)
          </button>
        )}
      </div>

      {/* Tabela */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Award size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
            <div className="empty-state-title">
              {hasActiveFilters
                ? 'Nenhum certificado encontrado com os filtros aplicados'
                : 'Nenhum certificado emitido'}
            </div>
            <p>
              {hasActiveFilters
                ? 'Tente alterar os filtros de busca.'
                : 'Os certificados aparecerão aqui após a finalização de turmas.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <Filter size={14} style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
              {filtered.length} certificado(s) encontrado(s)
              {hasActiveFilters ? ' (filtrado)' : ''}
            </span>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      title="Selecionar todos"
                      style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                  </th>
                  <th>Trabalhador</th>
                  <th>CPF</th>
                  <th>Treinamento</th>
                  <th>Empresa</th>
                  <th>Carga Horária</th>
                  <th>Data Conclusão</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th style={{ width: 60 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cert) => (
                  <tr key={cert.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(cert.id)}
                        onChange={() => toggleSelect(cert.id)}
                        style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                    </td>
                    <td style={{ fontWeight: 500 }}>{cert.trabalhador_nome}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {cert.trabalhador_cpf}
                    </td>
                    <td>{cert.treinamento_nome}</td>
                    <td>{cert.empresa_nome}</td>
                    <td>{cert.carga_horaria}h</td>
                    <td>{new Date(cert.data_fim).toLocaleDateString('pt-BR')}</td>
                    <td>{new Date(cert.data_vencimento).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <span className={getStatusBadgeClass(cert.status)}>
                        {getStatusLabel(cert.status)}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-icon"
                        onClick={() => handleDownloadSingle(cert)}
                        title="Baixar certificado"
                      >
                        <Download size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {downloading && <Loading message={downloadMsg} />}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
