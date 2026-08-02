'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Treinamento } from '@/lib/types'
import Modal from '@/app/components/ui/Modal'
import Toast from '@/app/components/ui/Toast'
import { BookOpen, Pencil, Trash2, Plus, Save, X } from 'lucide-react'

export default function TreinamentosPage() {
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Treinamento | null>(null)
  const [nome, setNome] = useState('')
  const [cargaHoraria, setCargaHoraria] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetchTreinamentos()
  }, [])

  async function fetchTreinamentos() {
    const { data } = await supabase.from('treinamentos').select('*').order('nome')
    if (data) setTreinamentos(data)
  }

  function openCreate() {
    setEditing(null)
    setNome('')
    setCargaHoraria('')
    setConteudo('')
    setModalOpen(true)
  }

  function openEdit(t: Treinamento) {
    setEditing(t)
    setNome(t.nome)
    setCargaHoraria(String(t.carga_horaria))
    setConteudo(t.conteudo_programatico || '')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!nome.trim() || !cargaHoraria) return
    const payload = {
      nome: nome.trim(),
      carga_horaria: Number(cargaHoraria),
      conteudo_programatico: conteudo.trim(),
    }

    if (editing) {
      const { error } = await supabase.from('treinamentos').update(payload).eq('id', editing.id)
      if (error) {
        setToast({ type: 'error', message: 'Erro ao atualizar treinamento' })
        return
      }
      setToast({ type: 'success', message: 'Treinamento atualizado com sucesso' })
    } else {
      const { error } = await supabase.from('treinamentos').insert(payload)
      if (error) {
        setToast({ type: 'error', message: 'Erro ao criar treinamento' })
        return
      }
      setToast({ type: 'success', message: 'Treinamento criado com sucesso' })
    }

    setModalOpen(false)
    fetchTreinamentos()
  }

  async function handleDelete(t: Treinamento) {
    if (!window.confirm(`Excluir treinamento "${t.nome}"?`)) return
    const { error } = await supabase.from('treinamentos').delete().eq('id', t.id)
    if (error) {
      setToast({ type: 'error', message: 'Erro ao excluir treinamento' })
      return
    }
    setToast({ type: 'success', message: 'Treinamento excluído com sucesso' })
    fetchTreinamentos()
  }

  return (
    <div>
      <h1 className="page-title">Treinamentos</h1>

      <div className="action-bar">
        <div />
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} />
          Novo Treinamento
        </button>
      </div>

      {treinamentos.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <BookOpen size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
            <div className="empty-state-title">Nenhum treinamento cadastrado</div>
            <p>Clique em "Novo Treinamento" para começar.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Carga Horária</th>
                  <th>Conteúdo Programático</th>
                  <th style={{ width: 100 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {treinamentos.map((t) => (
                  <tr key={t.id}>
                    <td>{t.nome}</td>
                    <td>{t.carga_horaria}h</td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.conteudo_programatico || '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn-icon" onClick={() => openEdit(t)} title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button className="btn-icon btn-delete" onClick={() => handleDelete(t)} title="Excluir">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Treinamento' : 'Novo Treinamento'}
      >
        <div className="form-group">
          <label className="form-label">Nome *</label>
          <input
            className="form-control"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do treinamento"
          />
        </div>

        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="form-label">Carga Horária (horas) *</label>
          <input
            className="form-control"
            type="number"
            min={1}
            value={cargaHoraria}
            onChange={(e) => setCargaHoraria(e.target.value)}
            placeholder="Ex: 8"
          />
        </div>

        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="form-label">Conteúdo Programático</label>
          <textarea
            className="form-control"
            rows={5}
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            placeholder="Descreva o conteúdo do treinamento"
          />
        </div>

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>
            <X size={16} />
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={16} />
            {editing ? 'Atualizar' : 'Salvar'}
          </button>
        </div>
      </Modal>

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