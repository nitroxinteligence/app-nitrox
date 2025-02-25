"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, Settings, User } from "lucide-react"

const menuItems = [
  { title: "Home", href: "/", icon: Home },
  { title: "Buscar", href: "/search", icon: Search },
  { title: "Configurações", href: "/settings", icon: Settings },
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="w-64 border-r border-[#4CFFA7]/10 bg-[#121214] p-6 h-screen">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Brazilian Brain</h2>
      </div>
      <div className="space-y-4">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center space-x-2 px-2 py-1.5 rounded-md transition-colors hover:text-[#FFD700] ${
              pathname === item.href ? "text-[#4CFFA7]" : "text-[#4CFFA7]/60"
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.title}</span>
          </Link>
        ))}
      </div>
      <div className="absolute bottom-6">
        <Link
          href="/profile"
          className="flex items-center space-x-2 px-2 py-1.5 rounded-md transition-colors hover:text-[#FFD700] text-[#4CFFA7]/60"
        >
          <User className="h-5 w-5" />
          <span>Perfil</span>
        </Link>
      </div>
    </nav>
  )
}

