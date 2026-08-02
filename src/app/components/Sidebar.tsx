'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  Users,
  GraduationCap,
  Award,
} from 'lucide-react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/empresas', label: 'Empresas', icon: Building2 },
  { path: '/trabalhadores', label: 'Trabalhadores', icon: Users },
  { path: '/treinamentos', label: 'Treinamentos', icon: BookOpen },
  { path: '/turmas', label: 'Turmas', icon: GraduationCap },
  { path: '/certificados', label: 'Certificados', icon: Award },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo estático do app */}
        <img
          src="/icon.png"
          alt="TOPSEGST"
          className="logo-icon"
          style={{ height: 28, width: 28, objectFit: 'contain' }}
        />
        <span>TOPSEGST</span>
      </div>
      <nav className="nav-menu">
        {navItems.map((item) => {
          const isActive =
            item.path === '/'
              ? pathname === '/'
              : pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`nav-item${isActive ? ' active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
