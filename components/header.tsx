import { Bell, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="bg-[#121214] text-[#4CFFA7] p-4 flex items-center justify-between border-b border-[#4CFFA7]">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[#4CFFA7]" />
          <Input
            type="search"
            placeholder="Buscar agentes..."
            className="pl-10 bg-[#121214] border-[#4CFFA7] text-[#4CFFA7] focus:ring-[#FFD700] focus:border-[#FFD700]"
          />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon">
          <Bell className="w-5 h-5" />
        </Button>
        <Button variant="outline" className="border-[#4CFFA7] text-[#4CFFA7] hover:bg-[#4CFFA7] hover:text-[#121214]">
          Perfil
        </Button>
      </div>
    </header>
  )
}

