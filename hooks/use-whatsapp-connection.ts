"use client"

import { useState, useEffect, useCallback } from "react"

interface ConnectionState {
  isConnected: boolean
  error: string | null
  status: "connecting" | "connected" | "disconnected" | "error"
}

export function useWhatsAppConnection() {
  const [state, setState] = useState<ConnectionState>({
    isConnected: false,
    error: null,
    status: "disconnected",
  })

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, status: "connecting", error: null }))

    try {
      const response = await fetch("/api/whatsapp/connect", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Connection failed")
      }

      const data = await response.json()

      setState({
        isConnected: true,
        error: null,
        status: "connected",
      })
    } catch (error) {
      setState({
        isConnected: false,
        error: "Failed to connect to WhatsApp",
        status: "error",
      })
    }
  }, [])

  const disconnect = useCallback(() => {
    setState({
      isConnected: false,
      error: null,
      status: "disconnected",
    })
  }, [])

  useEffect(() => {
    // Check initial connection status
    fetch("/api/whatsapp/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.isConnected) {
          setState({
            isConnected: true,
            error: null,
            status: "connected",
          })
        }
      })
      .catch(() => {
        setState({
          isConnected: false,
          error: "Failed to check connection status",
          status: "error",
        })
      })
  }, [])

  return {
    ...state,
    connect,
    disconnect,
  }
}

