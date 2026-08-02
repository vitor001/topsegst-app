'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { TurmaView } from '@/lib/types'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  AlertCircle,
  GraduationCap,
} from 'lucide-react'

export default function Dashboard() {
  const [trainings, setTrainings] = useState<TurmaView[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from('turmas_view')
        .select('*')
        .order('data_inicio', { ascending: false })

      if (data) {
        setTrainings(data as TurmaView[])
      }
      setLoading(false)
    }

    fetchData()
  }, [])

  const total = trainings.length
  const validos = trainings.filter((t) => t.status === 'Valido').length
  const proximos = trainings.filter((t) => t.status === 'Proximo ao vencimento').length
  const vencidos = trainings.filter((t) => t.status === 'Vencido').length

  function getStatusBadgeClass(status: string) {
    if (status === 'Valido') return 'badge badge-success'
    if (status === 'Proximo ao vencimento') return 'badge badge-warning'
    return 'badge badge-danger'
  }

  const lastFive = trainings.slice(0, 5)
  const totalSegments = total || 1

  if (loading) {
    return (
      <div>
        <h1 className="page-title">Dashboard</h1>
        <div className="empty-state">
          <div className="empty-state-title">Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GraduationCap size={20} style={{ color: 'var(--primary)' }} />
            <span className="kpi-label">Total de treinamentos</span>
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

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
          Distribuição de Status
        </h2>
        <div className="status-bar">
          {validos > 0 && (
            <div
              className="status-bar-segment"
              style={{
                width: `${(validos / totalSegments) * 100}%`,
                background: 'var(--success)',
              }}
            />
          )}
          {proximos > 0 && (
            <div
              className="status-bar-segment"
              style={{
                width: `${(proximos / totalSegments) * 100}%`,
                background: 'var(--warning)',
              }}
            />
          )}
          {vencidos > 0 && (
            <div
              className="status-bar-segment"
              style={{
                width: `${(vencidos / totalSegments) * 100}%`,
                background: 'var(--danger)',
              }}
            />
          )}
        </div>
        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            marginTop: '0.75rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
            Válidos ({validos})
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', display: 'inline-block' }} />
            Próximo ao vencimento ({proximos})
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />
            Vencidos ({vencidos})
          </span>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
          Últimos Treinamentos
        </h2>
        {lastFive.length === 0 ? (
          <div className="empty-state">
            <AlertTriangle size={32} style={{ marginBottom: '0.75rem', color: 'var(--text-muted)' }} />
            <div className="empty-state-title">Nenhum treinamento encontrado</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Empresa</th>
                  <th>Data</th>
                  <th>Alunos</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lastFive.map((t) => (
                  <tr key={t.id}>
                    <td>{t.treinamento_nome}</td>
                    <td>{t.empresa_nome}</td>
                    <td>{new Date(t.data_fim).toLocaleDateString('pt-BR')}</td>
                    <td>{t.total_alunos}</td>
                    <td>
                      <span className={getStatusBadgeClass(t.status)}>
                        {t.status === 'Proximo ao vencimento' ? 'Próximo ao venc.' : t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
