import { useState, useEffect, useCallback } from "react"
import { whatsAppService } from "@/lib/whatsapp-client"

export function useWhatsAppClient() {
  const [state, setState] = useState(whatsAppService.getState())

  useEffect(() => {
    const handleStateChange = (newState: typeof state) => {
      setState(newState)
    }

    whatsAppService.on("stateChange", handleStateChange)

    // Initial connection attempt
    whatsAppService.initialize().catch(console.error)

    return () => {
      whatsAppService.removeListener("stateChange", handleStateChange)
      whatsAppService.destroy().catch(console.error)
    }
  }, [])

  const reconnect = useCallback(() => {
    whatsAppService.initialize().catch(console.error)
  }, [])

  return {
    ...state,
    reconnect,
    getChats: whatsAppService.getChats.bind(whatsAppService),
    getContacts: whatsAppService.getContacts.bind(whatsAppService),
  }
}

