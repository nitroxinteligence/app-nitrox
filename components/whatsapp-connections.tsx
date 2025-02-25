"use client"

import { useState, useEffect } from "react"
import { WhatsAppConnection } from "@/components/whatsapp/whatsapp-connection"
import { Plus, Loader2 } from "lucide-react"
import { ConnectionCard } from "@/components/whatsapp/connection-card"

interface WhatsAppConnectionData {
  id: string
  title: string
  status: "connected" | "disconnected" | "connecting"
  phoneNumber: string
  contacts: number
  messages: number
  avatar?: string
}

export function WhatsAppConnections() {
  const [connections, setConnections] = useState<WhatsAppConnectionData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const response = await fetch("/api/whatsapp/connections")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setConnections(data)
      } catch (error) {
        console.error("Error fetching connections:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchConnections()
  }, [])

  const handleDeleteConnection = async (id: string) => {
    try {
      const response = await fetch(`/api/whatsapp/connections/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setConnections((prev) => prev.filter((conn) => conn.id !== id))
    } catch (error) {
      console.error("Error deleting connection:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#58E877]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {connections.map((connection) => (
          <ConnectionCard key={connection.id} {...connection} onDelete={() => handleDeleteConnection(connection.id)} />
        ))}
      </div>
    </div>
  )
}

