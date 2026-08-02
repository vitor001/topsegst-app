'use client'

import { supabase } from '@/lib/supabase'
import { Trabalhador, Empresa } from '@/lib/types'
import Modal from '@/app/components/ui/Modal'
import Toast from '@/app/components/ui/Toast'
import { useEffect, useState, useCallback } from 'react'
import { Users, Pencil, Trash2, Plus, Save, X, Upload, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

interface ParsedRow {
  nome?: string
  cpf?: string
}

export default function TrabalhadoresPage() {
  const [trabalhadores, setTrabalhadores] = useState<Trabalhador[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [empresaCnpj, setEmpresaCnpj] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [importTab, setImportTab] = useState<'upload' | 'paste'>('upload')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [importEmpresaCnpj, setImportEmpresaCnpj] = useState('')
  const [importing, setImporting] = useState(false)
  const [pasteText, setPasteText] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [trabRes, empRes] = await Promise.all([
      supabase.from('trabalhadores').select('*'),
      supabase.from('empresas').select('*').order('nome'),
    ])
    if (trabRes.data) setTrabalhadores(trabRes.data)
    if (empRes.data) setEmpresas(empRes.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Parse automaticamente quando o texto colado mudar
  useEffect(() => {
    handlePaste(pasteText)
  }, [pasteText])

  function openCreate() {
    setEditingId(null)
    setNome('')
    setCpf('')
    setEmpresaCnpj('')
    setFormOpen(true)
  }

  function openEdit(t: Trabalhador) {
    setEditingId(t.id)
    setNome(t.nome)
    setCpf(t.cpf)
    setEmpresaCnpj(t.empresa_cnpj)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
  }

  async function handleSave() {
    if (!nome.trim() || !cpf.trim() || !empresaCnpj) return
    const payload = { nome: nome.trim(), cpf: cpf.trim(), empresa_cnpj: empresaCnpj }
    if (editingId) {
      const { error } = await supabase.from('trabalhadores').update(payload).eq('id', editingId)
      if (error) { setToast({ type: 'error', message: error.message }); return }
      setToast({ type: 'success', message: 'Trabalhador atualizado' })
    } else {
      const { error } = await supabase.from('trabalhadores').insert(payload)
      if (error) { setToast({ type: 'error', message: error.message }); return }
      setToast({ type: 'success', message: 'Trabalhador criado' })
    }
    closeForm()
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir este trabalhador?')) return
    const { error } = await supabase.from('trabalhadores').delete().eq('id', id)
    if (error) { setToast({ type: 'error', message: error.message }); return }
    setToast({ type: 'success', message: 'Trabalhador excluído' })
    fetchData()
  }

  function getEmpresaNome(cnpj: string) {
    return empresas.find((e) => e.cnpj === cnpj)?.nome || cnpj
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true })
      setParsedRows(detectColumns(json))
    }
    reader.readAsArrayBuffer(file)
  }

  function handlePaste(text: string) {
    if (!text.trim()) { setParsedRows([]); return }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
    if (lines.length === 0) { setParsedRows([]); return }

    // Detecta separador: tab > ponto-e-vírgula > vírgula
    const firstLine = lines[0]
    let sep = '\t'
    if (!firstLine.includes('\t')) {
      sep = firstLine.includes(';') ? ';' : ','
    }

    // Verifica se a primeira linha parece um cabeçalho (contém as palavras 'nome' e 'cpf')
    const firstCols = firstLine.split(sep).map(h => h.trim().toLowerCase())
    const hasHeader = firstCols.some(h => h === 'nome') && firstCols.some(h => h === 'cpf')

    let startIdx = 0
    let nomeIdx = 0
    let cpfIdx = 1

    if (hasHeader) {
      startIdx = 1
      nomeIdx = firstCols.findIndex(h => h === 'nome')
      cpfIdx = firstCols.findIndex(h => h === 'cpf')
      if (lines.length < 2) { setParsedRows([]); return }
    }

    const parsed: ParsedRow[] = []
    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split(sep)
      parsed.push({
        nome: cols[nomeIdx]?.trim() || undefined,
        cpf: cols[cpfIdx]?.trim() || undefined,
      })
    }
    setParsedRows(parsed)
  }

  function detectColumns(data: Record<string, string>[]): ParsedRow[] {
    if (data.length === 0) return []
    const headers = Object.keys(data[0])
    const nomeKey = headers.find((h) => h.toLowerCase() === 'nome')
    const cpfKey = headers.find((h) => h.toLowerCase() === 'cpf')
    return data.map((row) => ({
      nome: nomeKey ? row[nomeKey] : undefined,
      cpf: cpfKey ? row[cpfKey] : undefined,
    }))
  }

  async function confirmImport() {
    if (!importEmpresaCnpj) { alert('Selecione uma empresa'); return }
    setImporting(true)
    let imported = 0
    let skipped = 0
    for (const row of parsedRows) {
      if (!row.cpf) { skipped++; continue }
      const { data: existing } = await supabase
        .from('trabalhadores')
        .select('id')
        .eq('cpf', row.cpf.trim())
        .maybeSingle()
      if (existing) { skipped++; continue }
      const { error } = await supabase.from('trabalhadores').insert({
        nome: row.nome?.trim() || '',
        cpf: row.cpf.trim(),
        empresa_cnpj: importEmpresaCnpj,
      })
      if (error) { skipped++; continue }
      imported++
    }
    setImporting(false)
    setImportOpen(false)
    setParsedRows([])
    setImportEmpresaCnpj('')
    setToast({ type: 'success', message: `${imported} importado(s), ${skipped} ignorado(s) (CPF duplicado)` })
    fetchData()
  }

  return (
    <div>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <h1 className="page-title">Trabalhadores</h1>

      <div className="action-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
          <Users size={20} />
          <span>{trabalhadores.length} trabalhador(es)</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setImportOpen(true)}>
            <Upload size={16} />
            Importar
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Novo Trabalhador
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <div className="empty-state-title">Carregando...</div>
        </div>
      ) : trabalhadores.length === 0 ? (
        <div className="card empty-state">
          <Users size={40} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
          <div className="empty-state-title">Nenhum trabalhador cadastrado</div>
          <p style={{ marginBottom: '1rem' }}>Clique em "Novo Trabalhador" para começar.</p>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Novo Trabalhador
          </button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>Empresa</th>
                <th style={{ width: '100px' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {trabalhadores.map((t) => (
                <tr key={t.id}>
                  <td>{t.nome}</td>
                  <td>{t.cpf}</td>
                  <td>{getEmpresaNome(t.empresa_cnpj)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn-icon" onClick={() => openEdit(t)} title="Editar">
                        <Pencil size={16} />
                      </button>
                      <button className="btn-icon btn-delete" onClick={() => handleDelete(t.id)} title="Excluir">
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

      <Modal open={formOpen} onClose={closeForm} title={editingId ? 'Editar Trabalhador' : 'Novo Trabalhador'}>
        <div className="form-group">
          <label className="form-label">Nome *</label>
          <input
            className="form-control"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome completo"
          />
        </div>
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="form-label">CPF *</label>
          <input
            className="form-control"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            placeholder="000.000.000-00"
          />
        </div>
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="form-label">Empresa *</label>
          <select
            className="form-control"
            value={empresaCnpj}
            onChange={(e) => setEmpresaCnpj(e.target.value)}
          >
            <option value="">Selecione uma empresa</option>
            {empresas.map((emp) => (
              <option key={emp.cnpj} value={emp.cnpj}>{emp.nome}</option>
            ))}
          </select>
        </div>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={closeForm}>
            <X size={16} />
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={16} />
            Salvar
          </button>
        </div>
      </Modal>

      <Modal open={importOpen} onClose={() => { setImportOpen(false); setParsedRows([]); setImportEmpresaCnpj(''); setPasteText('') }} title="Importar Trabalhadores">
        {/* Seleção da empresa - SEMPRE VISÍVEL no topo */}
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="form-label">Empresa para associar aos trabalhadores *</label>
          <select
            className="form-control"
            value={importEmpresaCnpj}
            onChange={(e) => setImportEmpresaCnpj(e.target.value)}
          >
            <option value="">Selecione uma empresa...</option>
            {empresas.map((emp) => (
              <option key={emp.cnpj} value={emp.cnpj}>{emp.nome}</option>
            ))}
          </select>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
            Todos os trabalhadores importados serão vinculados a esta empresa.
          </p>
        </div>

        <div className="tabs">
          <button className={`tab ${importTab === 'upload' ? 'active' : ''}`} onClick={() => setImportTab('upload')}>
            <Upload size={16} style={{ marginRight: '0.375rem' }} />
            Upload Arquivo
          </button>
          <button className={`tab ${importTab === 'paste' ? 'active' : ''}`} onClick={() => setImportTab('paste')}>
            <FileSpreadsheet size={16} style={{ marginRight: '0.375rem' }} />
            Colar Planilha
          </button>
        </div>

        {/* Instruções gerais */}
        <div style={{ background: 'var(--primary-faded)', border: '1px solid var(--primary)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
          <strong>Formato esperado:</strong> A planilha deve conter as colunas <strong>"nome"</strong> e <strong>"cpf"</strong> (não diferencia maiúsculas/minúsculas).
          <br />
          <strong>Empresa:</strong> Já selecionada acima (não vem na planilha).
          <br />
          <strong>CPFs duplicados:</strong> Serão ignorados automaticamente.
        </div>

        {importTab === 'upload' ? (
          <div className="form-group">
            <label className="form-label">Selecione um arquivo (.csv, .xlsx, .xls)</label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="form-control"
              onChange={handleFileUpload}
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Exemplo de colunas: <code style={{ background: 'var(--background)', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>nome | cpf</code>
              <br />
              A primeira linha deve ser o cabeçalho. Linhas vazias são ignoradas.
            </p>
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">Cole os dados da planilha (copiados do Excel / Google Sheets)</label>
            <textarea
              className="form-control"
              rows={8}
              placeholder={[
                "nome\tcpf",
                "João Silva\t123.456.789-00",
                "Maria Santos\t987.654.321-00",
                "Pedro Oliveira\t111.222.333-44",
                "",
                "(Dica: selecione as colunas 'nome' e 'cpf' no Excel/Google Sheets,",
                " copie (Ctrl+C) e cole aqui. Separador: tabulação ou vírgula.)"
              ].join('\n')}
              onChange={(e) => setPasteText(e.target.value)}
              value={pasteText}
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Use <kbd style={{ background: 'var(--background)', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', border: '1px solid var(--surface-border)' }}>Tab</kbd> ou <kbd style={{ background: 'var(--background)', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', border: '1px solid var(--surface-border)' }}>vírgula</kbd> como separador. A primeira linha deve ser o cabeçalho.
            </p>
          </div>
)}

        {parsedRows.length > 0 && (
          <>
            <div className="table-wrapper" style={{ marginTop: '1rem', maxHeight: '250px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>CPF</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 50).map((row, i) => (
                    <tr key={i}>
                      <td>{row.nome || '-'}</td>
                      <td>{row.cpf || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 50 && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Mostrando 50 de {parsedRows.length} linha(s)
              </p>
            )}

            <div className="form-actions">
              <button className="btn btn-primary" onClick={confirmImport} disabled={importing}>
                {importing ? 'Importando...' : 'Confirmar Importação'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
