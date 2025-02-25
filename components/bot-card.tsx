import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { DynamicIcon } from "@/components/icons/dynamic-icon"
import { AGENTS, isValidAgent } from "@/lib/agents"
import { supabase } from "@/lib/supabase-client"
import { toast } from "@/components/ui/use-toast"

interface BotCardProps {
  id: string
  title: string
  description: string
  iconName: string
}

export function BotCard({ id, title, description, iconName }: BotCardProps) {
  const router = useRouter()

  const handleClick = async () => {
    try {
      // Verifica se o agente é válido no objeto AGENTS
      if (!isValidAgent(id)) {
        toast({
          title: "Erro",
          description: "Agente não encontrado",
          variant: "destructive",
        })
        return
      }

      // Criar nova sessão diretamente
      const timestamp = new Date().getTime()
      const sessionId = `${id}_${timestamp}`

      const { data, error: insertError } = await supabase
        .from("chat_sessions")
        .insert([{
          id: sessionId,
          title: "Novo Chat",
          agent_id: id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (insertError) {
        // Se o erro for de chave estrangeira, tenta criar o agente primeiro
        if (insertError.code === '23503') {
          const { error: createAgentError } = await supabase
            .from("agents")
            .insert([{
              id: id,
              name: title,
              description: description,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])

          if (createAgentError) {
            console.error("Erro ao criar agente:", createAgentError)
            toast({
              title: "Erro",
              description: "Não foi possível criar o agente",
              variant: "destructive",
            })
            return
          }

          // Tenta criar a sessão novamente após criar o agente
          const { data: retryData, error: retryError } = await supabase
            .from("chat_sessions")
            .insert([{
              id: sessionId,
              title: "Novo Chat",
              agent_id: id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select()
            .single()

          if (retryError) {
            throw retryError
          }

          // Navegar para a página do chat após retry bem sucedido
          router.push(`/chat/${id}/${retryData.id}`)
          return
        }

        console.error("Erro ao criar sessão do chat:", insertError)
        toast({
          title: "Erro",
          description: "Não foi possível criar uma nova sessão de chat",
          variant: "destructive",
        })
        return
      }

      // Navegar para a página do chat
      router.push(`/chat/${id}/${data.id}`)
    } catch (error) {
      console.error("Erro ao iniciar chat:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao iniciar o chat",
        variant: "destructive",
      })
    }
  }

  return (
    <motion.div
      onClick={handleClick}
      className="group relative h-auto w-full cursor-pointer overflow-hidden rounded-[15px] bg-[#0F0F10] border border-[#272727] hover:border-[#58E877]/20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      viewport={{ once: true }}
    >
      {/* Gradient overlay */}
      <div
        className="absolute inset-0 opacity-30 group-hover:opacity-100 transition-opacity duration-300 ease-in-out pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at top, rgba(88, 232, 119, 0.2), transparent 70%),
            linear-gradient(180deg, 
              rgba(88, 232, 119, 0.1) 0%,
              rgba(24, 24, 24, 0.9) 50%,
              rgba(24, 24, 24, 1) 100%
            )
          `,
        }}
      />

      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col space-y-6 p-6">
        {/* Icon container */}
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#181818]/40 backdrop-blur-sm">
          <DynamicIcon
            name={iconName}
            className="text-[#58E877] h-6 w-6 transition-transform duration-300 group-hover:scale-110"
          />
        </div>

        {/* Text content */}
        <div className="space-y-2">
          <h3 className="text-xl font-semibold leading-tight tracking-tight text-white group-hover:text-[#58E877] transition-colors duration-300">
            {title}
          </h3>
          <p className="text-base font-normal leading-relaxed text-zinc-400 group-hover:text-zinc-300 transition-colors duration-300">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

