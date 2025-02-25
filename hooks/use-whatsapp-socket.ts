"use client"

import { useEffect, useRef, useState, useCallback } from "react"

type WebSocketStatus = "connecting" | "connected" | "disconnected"
type WhatsAppStatus = "initializing" | "qr_received" | "authenticated" | "ready" | "error"

interface WhatsAppState {
  status: WhatsAppStatus
  qrCode: string | null
  error: string | null
}

export function useWhatsAppSocket() {
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>("disconnected")
  const [whatsAppState, setWhatsAppState] = useState<WhatsAppState>({
    status: "initializing",
    qrCode: null,
    error: null,
  })
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)
  const MAX_RECONNECT_ATTEMPTS = 3

  const checkConnection = useCallback(() => {
    return window.navigator.onLine && wsRef.current?.readyState === WebSocket.OPEN
  }, [])

  const connect = useCallback(() => {
    if (checkConnection()) return

    try {
      if (wsRef.current) {
        wsRef.current.close()
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      const host = window.location.host
      const ws = new WebSocket(`${protocol}//${host}/api/whatsapp-socket`)
      wsRef.current = ws

      ws.onopen = () => {
        setWsStatus("connected")
        reconnectAttemptsRef.current = 0
        setWhatsAppState((prev) => ({
          ...prev,
          error: null,
          status: "initializing",
        }))
      }

      ws.onclose = () => {
        setWsStatus("disconnected")
        handleReconnect()
      }

      ws.onerror = () => {
        setWhatsAppState((prev) => ({
          ...prev,
          status: "error",
          error: "Erro de conexão. Por favor, verifique sua conexão com a internet.",
        }))
      }

      ws.onmessage = (event) => {
        try {
          const { event: eventType, data } = JSON.parse(event.data)

          switch (eventType) {
            case "qr":
              setWhatsAppState({
                status: "qr_received",
                qrCode: data,
                error: null,
              })
              break

            case "ready":
              setWhatsAppState({
                status: "ready",
                qrCode: null,
                error: null,
              })
              break

            case "authenticated":
              setWhatsAppState({
                status: "authenticated",
                qrCode: null,
                error: null,
              })
              break

            case "auth_failure":
            case "error":
              setWhatsAppState({
                status: "error",
                qrCode: null,
                error: data.message || "Ocorreu um erro inesperado",
              })
              break
          }
        } catch (error) {
          setWhatsAppState((prev) => ({
            ...prev,
            status: "error",
            error: "Erro ao processar resposta do servidor",
          }))
        }
      }
    } catch (error) {
      setWhatsAppState((prev) => ({
        ...prev,
        status: "error",
        error: "Falha ao estabelecer conexão",
      }))
    }
  }, [checkConnection])

  const handleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setWhatsAppState((prev) => ({
        ...prev,
        status: "error",
        error: "Falha ao reconectar após várias tentativas. Por favor, tente novamente mais tarde.",
      }))
      return
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++
      connect()
    }, delay)
  }, [connect])

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    connect()
  }, [connect])

  useEffect(() => {
    const handleOnline = () => {
      if (!checkConnection()) {
        reconnect()
      }
    }

    const handleOffline = () => {
      setWsStatus("disconnected")
      setWhatsAppState((prev) => ({
        ...prev,
        status: "error",
        error: "Sem conexão com a internet",
      }))
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    connect()

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect, reconnect, checkConnection])

  return {
    wsStatus,
    ...whatsAppState,
    reconnect,
  }
}

