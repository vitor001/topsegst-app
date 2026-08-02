import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from './components/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TOPSEGST - Controle de Treinamentos',
  description: 'Plataforma de Controle de Treinamentos e Geração de Certificados',
}

export const dynamic = 'force-dynamic'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="app-container">
          <Sidebar />
          <div className="main-content">
            <header className="main-header">
              <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                Controle de Treinamentos
              </h1>
            </header>
            <main className="page-container">{children}</main>
          </div>
        </div>
      </body>
    </html>
  )
}
