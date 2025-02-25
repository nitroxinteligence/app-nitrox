"use client"

import { useState, useEffect } from "react"
import { Search, MoreVertical, Phone, Video, Image, Smile, Mic } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useWhatsAppClient } from "@/hooks/use-whatsapp-client"

interface Chat {
  id: string
  name: string
  lastMessage: string
  time: string
  unread: number
  avatar: string
}

export function WhatsAppChats() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [chats, setChats] = useState<Chat[]>([])
  const { client } = useWhatsAppClient()

  useEffect(() => {
    if (client) {
      const fetchChats = async () => {
        try {
          const fetchedChats = await client.getChats()
          const formattedChats = fetchedChats.map((chat) => ({
            id: chat.id._serialized,
            name: chat.name || chat.id.user,
            lastMessage: chat.lastMessage
              ? chat.lastMessage.type !== "chat"
                ? `[${chat.lastMessage.type}]`
                : chat.lastMessage.body
              : "",
            time: chat.lastMessage ? new Date(chat.lastMessage.timestamp * 1000).toLocaleTimeString() : "",
            unread: chat.unreadCount,
            avatar: "/placeholder.svg",
          }))
          setChats(formattedChats)
        } catch (error) {
          console.error("Failed to fetch chats:", error)
        }
      }

      fetchChats()
    }
  }, [client])

  const filteredChats = chats.filter(
    (chat) =>
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="flex w-full">
      <div className="w-[400px] border-r border-[#1a1a1c] flex flex-col">
        <div className="p-4 border-b border-[#1a1a1c]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Pesquisar ou começar uma nova conversa"
              className="pl-10 bg-[#1a1a1c] border-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChat(chat.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1c] transition-colors ${
                selectedChat === chat.id ? "bg-[#1a1a1c]" : ""
              }`}
            >
              <Avatar>
                <AvatarImage src={chat.avatar} />
                <AvatarFallback>{chat.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex justify-between items-baseline">
                  <p className="text-sm font-medium text-white truncate">{chat.name}</p>
                  <span className="text-xs text-gray-400 ml-2">{chat.time}</span>
                </div>
                <p className="text-sm text-gray-400 truncate">{chat.lastMessage}</p>
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-[#1a1a1c]">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={chats.find((c) => c.id === selectedChat)?.avatar} />
                  <AvatarFallback>{chats.find((c) => c.id === selectedChat)?.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-sm font-medium text-white">{chats.find((c) => c.id === selectedChat)?.name}</h2>
                  <p className="text-xs text-gray-400">online</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Video className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Phone className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 bg-[#0A0A0B] p-4">{/* Messages would go here */}</div>

            <div className="p-4 border-t border-[#1a1a1c]">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Smile className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Image className="h-5 w-5" />
                </Button>
                <Input placeholder="Digite uma mensagem" className="bg-[#1a1a1c] border-0" />
                <Button variant="ghost" size="icon">
                  <Mic className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-xl font-medium text-white mb-2">WhatsApp Web</h3>
              <p className="text-sm text-gray-400">Selecione uma conversa para começar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

