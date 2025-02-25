"use client"

import { useState, useEffect } from "react"
import { Search, MessageSquare, User, BarChart } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface SearchResult {
  title: string
  description: string
  url: string
  category: string
  icon?: string
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery)
    if (!searchQuery) {
      setResults([])
      return
    }

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Erro na busca:", error)
      setResults([])
    }
  }

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    router.push(result.url)
  }

  const getIcon = (icon: string) => {
    switch (icon) {
      case "chat":
        return <MessageSquare className="w-4 h-4 text-[#58E877]" />
      case "user":
        return <User className="w-4 h-4 text-[#58E877]" />
      case "chart":
        return <BarChart className="w-4 h-4 text-[#58E877]" />
      default:
        return <Search className="w-4 h-4 text-[#58E877]" />
    }
  }

  return (
    <>
      <div className="w-full relative" onClick={() => setOpen(true)}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 w-5 h-5" />
          <Input
            type="text"
            placeholder="Pesquisar em todo o sistema... (⌘ K)"
            className="w-full pl-10 h-14 bg-[#121214]/80 border-white/10 text-white placeholder-white/40"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 max-w-2xl border border-[#272727] bg-[#0F0F10]">
          <DialogTitle className="sr-only">Pesquisa Global</DialogTitle>
          <DialogDescription className="sr-only">
            Use esta caixa de diálogo para pesquisar em todo o sistema
          </DialogDescription>
          <Command className="rounded-lg border-0 overflow-hidden [&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-[#272727]">
            <CommandInput 
              placeholder="Digite para pesquisar em todo o sistema..." 
              value={query}
              onValueChange={handleSearch}
              className="focus:ring-0 placeholder:text-neutral-500 border-0"
            />
            <CommandList>
              <CommandEmpty className="py-6 text-center text-sm">
                Nenhum resultado encontrado.
              </CommandEmpty>
              {results.length > 0 && (
                <CommandGroup>
                  {results.map((result, index) => (
                    <CommandItem
                      key={index}
                      value={result.title}
                      onSelect={() => handleSelect(result)}
                      className="flex items-start gap-3 p-3 hover:bg-[#1a1a1c] cursor-pointer"
                    >
                      <div className="mt-0.5">{getIcon(result.icon || "")}</div>
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{result.title}</span>
                          <span className="text-xs text-[#58E877]">{result.category}</span>
                        </div>
                        <span className="text-sm text-neutral-400">{result.description}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
} 