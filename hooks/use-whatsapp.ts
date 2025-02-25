import { useState, useEffect, useCallback } from "react"
import { whatsAppService } from "@/lib/services/whatsapp-service"

export function useWhatsApp() {
  const [state, setState] = useState(whatsAppService.getState())

  useEffect(() => {
    const handleStateChange = (newState: typeof state) => {
      setState(newState)
    }

    whatsAppService.on("stateChange", handleStateChange)

    // Initial connection attempt
    whatsAppService.connect()

    return () => {
      whatsAppService.removeListener("stateChange", handleStateChange)
      whatsAppService.disconnect()
    }
  }, [])

  const retry = useCallback(() => {
    whatsAppService.connect()
  }, [])

  return {
    ...state,
    retry,
  }
}

