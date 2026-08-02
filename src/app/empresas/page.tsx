'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Empresa } from '@/lib/types'
import Modal from '@/app/components/ui/Modal'
import Toast from '@/app/components/ui/Toast'
import { Building2, Pencil, Trash2, Plus, Save, X } from 'lucide-react'

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

const initialForm: Empresa = {
  cnpj: '',
  nome: '',
  endereco: '',
  cidade: '',
  estado: '',
}

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [form, setForm] = useState<Empresa>(initialForm)
  const [editing, setEditing] = useState<Empresa | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetchEmpresas()
  }, [])

  async function fetchEmpresas() {
    const { data } = await supabase.from('empresas').select('*').order('nome')
    if (data) setEmpresas(data)
  }

  function handleOpenCreate() {
    setForm(initialForm)
    setEditing(null)
    setModalOpen(true)
  }

  function handleOpenEdit(empresa: Empresa) {
    setForm({ ...empresa })
    setEditing(empresa)
    setModalOpen(true)
  }

  function handleCloseModal() {
    setModalOpen(false)
    setForm(initialForm)
    setEditing(null)
  }

  async function handleSave() {
    if (!form.cnpj || !form.nome) {
      setToast({ type: 'error', message: 'CNPJ e Nome são obrigatórios.' })
      return
    }

    const { error } = await supabase.from('empresas').upsert(form, { onConflict: 'cnpj' })

    if (error) {
      setToast({ type: 'error', message: error.message })
    } else {
      setToast({ type: 'success', message: editing ? 'Empresa atualizada com sucesso.' : 'Empresa criada com sucesso.' })
      handleCloseModal()
      fetchEmpresas()
    }
  }

  async function handleDelete(empresa: Empresa) {
    if (!window.confirm(`Tem certeza que deseja excluir a empresa "${empresa.nome}"?`)) return

    const { error } = await supabase.from('empresas').delete().eq('cnpj', empresa.cnpj)

    if (error) {
      setToast({ type: 'error', message: error.message })
    } else {
      setToast({ type: 'success', message: 'Empresa excluída com sucesso.' })
      fetchEmpresas()
    }
  }

  return (
    <>
      <h1 className="page-title">Empresas</h1>

      <div className="action-bar">
        <div />
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={18} />
          Nova Empresa
        </button>
      </div>

      {empresas.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Building2 size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
            <div className="empty-state-title">Nenhuma empresa cadastrada</div>
            <p>Clique em "Nova Empresa" para adicionar.</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>CNPJ</th>
                <th>Nome</th>
                <th>Endereço</th>
                <th>Cidade</th>
                <th>Estado</th>
                <th style={{ width: 100 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((empresa) => (
                <tr key={empresa.cnpj}>
                  <td>{empresa.cnpj}</td>
                  <td>{empresa.nome}</td>
                  <td>{empresa.endereco}</td>
                  <td>{empresa.cidade}</td>
                  <td>{empresa.estado}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn-icon" onClick={() => handleOpenEdit(empresa)} title="Editar">
                        <Pencil size={16} />
                      </button>
                      <button className="btn-icon btn-delete" onClick={() => handleDelete(empresa)} title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={handleCloseModal} title={editing ? 'Editar Empresa' : 'Nova Empresa'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">CNPJ</label>
            <input
              className="form-control"
              value={form.cnpj}
              onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
              placeholder="00.000.000/0000-00"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nome</label>
            <input
              className="form-control"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome da empresa"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Endereço</label>
            <input
              className="form-control"
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              placeholder="Endereço completo"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Cidade</label>
              <input
                className="form-control"
                value={form.cidade}
                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                placeholder="Cidade"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Estado</label>
              <select
                className="form-control"
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
              >
                <option value="">Selecione...</option>
                {ESTADOS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-secondary" onClick={handleCloseModal}>
              <X size={16} />
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              <Save size={16} />
              {editing ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </div>
      </Modal>

      {toast && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      )}
    </>
  )
}