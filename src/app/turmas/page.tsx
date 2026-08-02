'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Empresa, Treinamento, Turma, CertificateData } from '@/lib/types'
import Modal from '@/app/components/ui/Modal'
import Toast from '@/app/components/ui/Toast'
import Loading from '@/app/components/ui/Loading'
import { generateBatchCertificates } from '@/lib/pdf-engine'
import { GraduationCap, Pencil, Trash2, Plus, X, Award } from 'lucide-react'

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR')
}

function computeStatus(vencimento: string) {
  const hoje = new Date()
  const venc = new Date(vencimento + 'T12:00:00')
  const diff = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'Vencido' as const
  if (diff <= 90) return 'Proximo ao vencimento' as const
  return 'Valido' as const
}

interface TurmaRow {
  id: string
  empresa_cnpj: string
  treinamento_id: string
  data_inicio: string
  data_fim: string
  data_vencimento: string
  empresa_nome: string
  empresa_cidade: string
  treinamento_nome: string
  carga_horaria: number
  total_alunos: number
}

interface WorkerOption {
  id: string
  nome: string
  cpf: string
}

const initialForm = {
  empresa_cnpj: '',
  treinamento_id: '',
  data_inicio: '',
  data_fim: '',
  data_vencimento: '',
}

export default function TurmasPage() {
  const [turmas, setTurmas] = useState<TurmaRow[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([])
  const [form, setForm] = useState(initialForm)
  const [editing, setEditing] = useState<Turma | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [availableWorkers, setAvailableWorkers] = useState<WorkerOption[]>([])
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetchTurmas()
    fetchEmpresas()
    fetchTreinamentos()
  }, [])

  async function fetchTurmas() {
    const { data } = await supabase
      .from('turmas')
      .select(`
        *,
        empresas!turmas_empresa_cnpj_fkey ( nome, cidade ),
        treinamentos!turmas_treinamento_id_fkey ( nome, carga_horaria )
      `)
      .order('data_inicio', { ascending: false })
    if (data) {
      const mapped: TurmaRow[] = (data as Array<Record<string, unknown>>).map((t) => ({
        id: String(t.id ?? ''),
        empresa_cnpj: String(t.empresa_cnpj ?? ''),
        treinamento_id: String(t.treinamento_id ?? ''),
        data_inicio: String(t.data_inicio ?? ''),
        data_fim: String(t.data_fim ?? ''),
        data_vencimento: String(t.data_vencimento ?? ''),
        empresa_nome: (t.empresas as Record<string, string>)?.nome ?? '',
        empresa_cidade: (t.empresas as Record<string, string>)?.cidade ?? '',
        treinamento_nome: (t.treinamentos as Record<string, unknown>)?.nome as string ?? '',
        carga_horaria: Number((t.treinamentos as Record<string, unknown>)?.carga_horaria ?? 0),
        total_alunos: 0,
      }))
      setTurmas(mapped)
      for (const t of mapped) {
        const { count } = await supabase
          .from('turma_trabalhadores')
          .select('*', { count: 'exact', head: true })
          .eq('turma_id', t.id)
        if (count !== null) {
          setTurmas(prev => prev.map(p => p.id === t.id ? { ...p, total_alunos: count } : p))
        }
      }
    }
  }

  async function fetchEmpresas() {
    const { data } = await supabase.from('empresas').select('*').order('nome')
    if (data) setEmpresas(data)
  }

  async function fetchTreinamentos() {
    const { data } = await supabase.from('treinamentos').select('*').order('nome')
    if (data) setTreinamentos(data)
  }

  function handleOpenCreate() {
    setForm(initialForm)
    setEditing(null)
    setAvailableWorkers([])
    setSelectedWorkerIds(new Set())
    setModalOpen(true)
  }

  function handleOpenEdit(turma: TurmaRow) {
    setForm({
      empresa_cnpj: turma.empresa_cnpj,
      treinamento_id: turma.treinamento_id,
      data_inicio: turma.data_inicio,
      data_fim: turma.data_fim,
      data_vencimento: turma.data_vencimento,
    })
    setEditing({ id: turma.id, empresa_cnpj: turma.empresa_cnpj, treinamento_id: turma.treinamento_id, data_inicio: turma.data_inicio, data_fim: turma.data_fim, data_vencimento: turma.data_vencimento })
    setAvailableWorkers([])
    setSelectedWorkerIds(new Set())
    setModalOpen(true)
    loadCompanyWorkers(turma.empresa_cnpj, turma.id)
  }

  async function loadCompanyWorkers(cnpj: string, turmaId?: string) {
    const { data: workers } = await supabase
      .from('trabalhadores')
      .select('id, nome, cpf')
      .eq('empresa_cnpj', cnpj)
      .order('nome')

    if (workers) {
      setAvailableWorkers(workers)

      if (turmaId) {
        const { data: links } = await supabase
          .from('turma_trabalhadores')
          .select('trabalhador_id')
          .eq('turma_id', turmaId)

        if (links) {
          const linked = new Set(links.map(l => l.trabalhador_id))
          setSelectedWorkerIds(linked)
        }
      }
    } else {
      setAvailableWorkers([])
      setSelectedWorkerIds(new Set())
    }
  }

  async function fetchWorkersFromCompany(cnpj: string) {
    if (!cnpj) {
      setAvailableWorkers([])
      setSelectedWorkerIds(new Set())
      return
    }
    const { data: workers } = await supabase
      .from('trabalhadores')
      .select('id, nome, cpf')
      .eq('empresa_cnpj', cnpj)
      .order('nome')
    setAvailableWorkers(workers || [])
    setSelectedWorkerIds(new Set())
  }

  function handleCloseModal() {
    setModalOpen(false)
    setForm(initialForm)
    setEditing(null)
    setAvailableWorkers([])
    setSelectedWorkerIds(new Set())
  }

  async function handleFinalizar() {
    if (!form.empresa_cnpj || !form.treinamento_id || !form.data_inicio || !form.data_fim || !form.data_vencimento) {
      setToast({ type: 'error', message: 'Preencha todos os campos obrigatórios.' })
      return
    }
    if (selectedWorkerIds.size === 0) {
      setToast({ type: 'error', message: 'Selecione pelo menos um trabalhador da empresa.' })
      return
    }

    setLoading(true)

    const empresa = empresas.find(e => e.cnpj === form.empresa_cnpj)
    const treinamento = treinamentos.find(t => t.id === form.treinamento_id)
    if (!empresa || !treinamento) {
      setToast({ type: 'error', message: 'Empresa ou treinamento não encontrado.' })
      setLoading(false)
      return
    }

    let turmaId = editing?.id

    if (!turmaId) {
      const { data: newTurma, error: insertError } = await supabase
        .from('turmas')
        .insert({
          empresa_cnpj: form.empresa_cnpj,
          treinamento_id: form.treinamento_id,
          data_inicio: form.data_inicio,
          data_fim: form.data_fim,
          data_vencimento: form.data_vencimento,
        })
        .select()
        .single()

      if (insertError || !newTurma) {
        setToast({ type: 'error', message: insertError?.message ?? 'Erro ao criar turma.' })
        setLoading(false)
        return
      }
      turmaId = newTurma.id
    } else {
      const { error: updateError } = await supabase
        .from('turmas')
        .update({
          empresa_cnpj: form.empresa_cnpj,
          treinamento_id: form.treinamento_id,
          data_inicio: form.data_inicio,
          data_fim: form.data_fim,
          data_vencimento: form.data_vencimento,
        })
        .eq('id', turmaId)

      if (updateError) {
        setToast({ type: 'error', message: updateError.message })
        setLoading(false)
        return
      }
    }

    const { error: deleteLinksError } = await supabase
      .from('turma_trabalhadores')
      .delete()
      .eq('turma_id', turmaId)

    if (deleteLinksError) {
      setToast({ type: 'error', message: deleteLinksError.message })
      setLoading(false)
      return
    }

    const selectedWorkers = availableWorkers.filter(w => selectedWorkerIds.has(w.id))

    for (const worker of selectedWorkers) {
      const { error: linkError } = await supabase
        .from('turma_trabalhadores')
        .insert({ turma_id: turmaId, trabalhador_id: worker.id })

      if (linkError) {
        setToast({ type: 'error', message: `Erro ao vincular ${worker.nome}: ${linkError.message}` })
        setLoading(false)
        return
      }
    }

    const certificateData: CertificateData[] = selectedWorkers.map(w => ({
      nome: w.nome,
      cpf: w.cpf,
      curso: treinamento.nome,
      carga_horaria: String(treinamento.carga_horaria),
      data: formatDate(form.data_fim),
      empresa: empresa.nome,
      cidade: empresa.cidade,
      estado: empresa.estado,
      conteudoProgramatico: (treinamento.conteudo_programatico || '').split('\n').filter(Boolean),
    }))

    const zipBlob = await generateBatchCertificates('', certificateData, treinamento.nome)

    if (!zipBlob) {
      setToast({ type: 'error', message: 'Erro ao gerar certificados.' })
      await supabase.from('turmas').delete().eq('id', turmaId)
      setLoading(false)
      return
    }

    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `certificados_${treinamento.nome.replace(/\s+/g, '_')}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setToast({ type: 'success', message: editing ? 'Turma atualizada com sucesso!' : 'Turma criada com sucesso!' })
    setLoading(false)
    handleCloseModal()
    fetchTurmas()
  }

  async function handleDelete(turma: TurmaRow) {
    if (!window.confirm(`Tem certeza que deseja excluir a turma "${turma.treinamento_nome}"?`)) return

    await supabase.from('turma_trabalhadores').delete().eq('turma_id', turma.id)
    const { error } = await supabase.from('turmas').delete().eq('id', turma.id)

    if (error) {
      setToast({ type: 'error', message: error.message })
    } else {
      setToast({ type: 'success', message: 'Turma excluída com sucesso.' })
      fetchTurmas()
    }
  }

  function statusBadge(status: string) {
    if (status === 'Valido') return <span className="badge badge-success">Válido</span>
    if (status === 'Proximo ao vencimento') return <span className="badge badge-warning">Próximo ao vencimento</span>
    return <span className="badge badge-danger">Vencido</span>
  }

  return (
    <>
      <h1 className="page-title">Turmas</h1>

      <div className="action-bar">
        <div />
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={18} />
          Nova Turma
        </button>
      </div>

      {turmas.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <GraduationCap size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
            <div className="empty-state-title">Nenhuma turma cadastrada</div>
            <p>Clique em &ldquo;Nova Turma&rdquo; para adicionar.</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Treinamento</th>
                <th>Data Início</th>
                <th>Data Fim</th>
                <th>Data Vencimento</th>
                <th>Qtd Alunos</th>
                <th>Status</th>
                <th style={{ width: 120 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {turmas.map((turma) => {
                const status = computeStatus(turma.data_vencimento)
                return (
                  <tr key={turma.id}>
                    <td>{turma.empresa_nome}</td>
                    <td>{turma.treinamento_nome}</td>
                    <td>{formatDate(turma.data_inicio)}</td>
                    <td>{formatDate(turma.data_fim)}</td>
                    <td>{formatDate(turma.data_vencimento)}</td>
                    <td>{turma.total_alunos}</td>
                    <td>{statusBadge(status)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn-icon" onClick={() => handleOpenEdit(turma)} title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button className="btn-icon btn-delete" onClick={() => handleDelete(turma)} title="Excluir">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={handleCloseModal} title={editing ? 'Editar Turma' : 'Nova Turma'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Empresa</label>
            <select
              className="form-control"
              value={form.empresa_cnpj}
              onChange={(e) => {
                setForm({ ...form, empresa_cnpj: e.target.value })
                fetchWorkersFromCompany(e.target.value)
              }}
            >
              <option value="">Selecione uma empresa...</option>
              {empresas.map((emp) => (
                <option key={emp.cnpj} value={emp.cnpj}>{emp.nome}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Treinamento</label>
            <select
              className="form-control"
              value={form.treinamento_id}
              onChange={(e) => setForm({ ...form, treinamento_id: e.target.value })}
            >
              <option value="">Selecione um treinamento...</option>
              {treinamentos.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Data Início</label>
              <input
                className="form-control"
                type="date"
                value={form.data_inicio}
                onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Data Fim</label>
              <input
                className="form-control"
                type="date"
                value={form.data_fim}
                onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Data Vencimento</label>
            <input
              className="form-control"
              type="date"
              value={form.data_vencimento}
              onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
            />
          </div>

          <hr className="section-divider" />

          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Trabalhadores da Empresa</h3>

          {!form.empresa_cnpj ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Selecione uma empresa para ver os trabalhadores disponíveis.
            </p>
          ) : availableWorkers.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Nenhum trabalhador cadastrado para esta empresa.
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {availableWorkers.length} trabalhador(es) — {selectedWorkerIds.size} selecionado(s)
                </span>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                  onClick={() => {
                    if (selectedWorkerIds.size === availableWorkers.length) {
                      setSelectedWorkerIds(new Set())
                    } else {
                      setSelectedWorkerIds(new Set(availableWorkers.map(w => w.id)))
                    }
                  }}
                >
                  {selectedWorkerIds.size === availableWorkers.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>

              <div className="table-wrapper" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}></th>
                      <th>Nome</th>
                      <th>CPF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableWorkers.map((w) => (
                      <tr key={w.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedWorkerIds.has(w.id)}
                            onChange={() => {
                              const next = new Set(selectedWorkerIds)
                              if (next.has(w.id)) next.delete(w.id)
                              else next.add(w.id)
                              setSelectedWorkerIds(next)
                            }}
                            style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                          />
                        </td>
                        <td>{w.nome}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{w.cpf}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <hr className="section-divider" />

          <div className="form-actions">
            <button className="btn btn-secondary" onClick={handleCloseModal}>
              <X size={16} />
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleFinalizar} disabled={loading}>
              <Award size={16} />
              {loading ? 'Salvando...' : 'Finalizar'}
            </button>
          </div>
        </div>
      </Modal>

      {toast && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      )}

      {loading && <Loading message="Salvando turma e gerando certificados..." />}
    </>
  )
}
