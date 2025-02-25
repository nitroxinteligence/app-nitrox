"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase-client"

export default function CreditsPage() {
  const [apiKey, setApiKey] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSaveApiKey = async () => {
    try {
      if (!apiKey.trim()) {
        toast({
          title: "Erro",
          description: "Por favor, insira uma chave da OpenAI válida",
          variant: "destructive",
        })
        return
      }

      setIsLoading(true)
      
      // Atualizar a chave da API no Supabase
      const { error } = await supabase
        .from('profiles')
        .update({ openai_key: apiKey })
        .eq('id', 'default')

      if (error) {
        throw error
      }
      
      toast({
        title: "Sucesso",
        description: "API Key da OpenAI salva com sucesso!",
      })
      
    } catch (error) {
      console.error("Error saving API key:", error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar a API Key",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="fixed inset-0 w-full h-full bg-[#0A0A0B] -z-10" />

      <div className="mx-auto max-w-7xl px-4 pt-0 pb-0">
        <motion.div
          className="relative rounded-2xl bg-[#0A0A0B]/40 backdrop-blur-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="space-y-12 p-8">
            {/* Header Section */}
            <div className="space-y-4">
              <h1 className="text-4xl font-regular">
                <span className="bg-gradient-to-r from-[#58E877] to-[#FFFFFF] bg-clip-text text-transparent">
                  Configuração OpenAI
                </span>
              </h1>
              <p className="text-[#E8F3ED]/60 text-lg">
                Configure sua chave da API da OpenAI para utilizar os recursos de IA.
              </p>
            </div>

            <Card className="bg-[#0F0F10] border-[#272727]">
              <CardHeader>
                <CardTitle className="text-white">Configuração da API Key</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-6 max-w-2xl">
                  <div className="space-y-2">
                    <label className="text-sm text-[#E8F3ED]/60">API Key da OpenAI</label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="password"
                        placeholder="Digite sua API Key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="bg-[#121214] border-[#272727] text-white"
                      />
                      <Button
                        onClick={handleSaveApiKey}
                        disabled={!apiKey || isLoading}
                        className="bg-[#58E877] text-black hover:bg-[#4EDB82]"
                      >
                        {isLoading ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                    <p className="text-sm text-[#E8F3ED]/40 mt-2">
                      Sua API Key será armazenada de forma segura e criptografada.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 