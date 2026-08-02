'use client'

import { useEffect } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

interface ToastProps {
  type: 'success' | 'error'
  message: string
  onClose: () => void
}

export default function Toast({ type, message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  const icon = type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
      className={`toast toast-${type}`}
    >
      {icon}
      <span>{message}</span>
    </div>
  )
}
