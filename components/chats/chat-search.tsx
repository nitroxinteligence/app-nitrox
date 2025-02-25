"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface ChatResult {
  id: string
  title: string
  description: string
  department: string
  url: string
}

export function ChatSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ChatResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const searchChats = async () => {
      if (!query) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/search/chats?q=${encodeURIComponent(query)}`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setResults(data)
      } catch (error) {
        console.error("Erro na busca:", error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }

    // Debounce para evitar muitas requisições
    const timeoutId = setTimeout(searchChats, 300)
    return () => clearTimeout(timeoutId)
  }, [query])

  const handleSelect = (result: ChatResult) => {
    router.push(result.url)
  }

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 w-5 h-5" />
        <Input
          type="text"
          placeholder="Qual chat você quer utilizar?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 h-14 bg-[#121214]/80 border-white/10 text-white placeholder-white/40 rounded-xl"
        />
      </div>

      {query && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#0F0F10] border border-[#272727] rounded-lg overflow-hidden z-50">
          <div className="max-h-[300px] overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={result.id}
                className={cn(
                  "flex flex-col gap-1 p-4 cursor-pointer hover:bg-[#1a1a1c]",
                  index !== results.length - 1 && "border-b border-[#272727]"
                )}
                onClick={() => handleSelect(result)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{result.title}</span>
                  <span className="text-xs text-[#58E877]">{result.department}</span>
                </div>
                <span className="text-sm text-neutral-400">{result.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {query && results.length === 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-[#0F0F10] border border-[#272727] rounded-lg text-center text-neutral-400">
          Nenhum chat encontrado
        </div>
      )}
    </div>
  )
} 