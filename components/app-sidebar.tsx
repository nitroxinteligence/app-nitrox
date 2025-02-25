import { Card, Text } from "@nextui-org/react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import { useSocket } from "@/context/socketContext"
import type { Bot } from "@/types/bot"

interface ConnectionCardProps {
  connectionId: string
  name: string
  onClick: () => void
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({ connectionId, name, onClick }) => {
  return (
    <Card onClick={onClick} className="cursor-pointer hover:bg-[#58E877]/10 transition-colors duration-300">
      <div className="p-4">
        <Text b size={16}>
          {name}
        </Text>
      </div>
    </Card>
  )
}

interface BotCardProps {
  bot: Bot
  onClick: () => void
}

const BotCard: React.FC<BotCardProps> = ({ bot, onClick }) => {
  return (
    <div onClick={onClick} className="cursor-pointer hover:bg-[#58E877]/10 transition-colors duration-300 p-4">
      <Text b size={16}>
        {bot.name}
      </Text>
    </div>
  )
}

const AppSidebar: React.FC = () => {
  const { data: session } = useSession()
  const router = useRouter()
  const { socket } = useSocket()
  const [bots, setBots] = useState<Bot[]>([])

  useEffect(() => {
    if (socket) {
      socket.on("bots", (bots: Bot[]) => {
        setBots(bots)
      })
    }
  }, [socket])

  const handleConnectionClick = (connectionId: string) => {
    router.push(`/connections/${connectionId}`)
  }

  const handleBotClick = (bot: Bot) => {
    router.push(`/bots/${bot.id}`)
  }

  if (!session) {
    return <div>Loading...</div>
  }

  return (
    <div className="w-64 bg-gray-100 h-screen">
      <div className="p-4">
        <Text h2>Connections</Text>
        {session.user.connections.map((connection) => (
          <ConnectionCard
            key={connection.id}
            connectionId={connection.id}
            name={connection.name}
            onClick={() => handleConnectionClick(connection.id)}
          />
        ))}
      </div>
      <div className="p-4 mt-4">
        <Text h2>Bots</Text>
        {bots.map((bot) => (
          <BotCard key={bot.id} bot={bot} onClick={() => handleBotClick(bot)} />
        ))}
      </div>
    </div>
  )
}

export default AppSidebar

