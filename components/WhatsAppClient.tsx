import React, { useState } from "react"

export function WhatsAppClient() {
  const [status, setStatus] = useState("Not initialized")

  const initializeClient = async () => {
    try {
      const response = await fetch("/api/whatsapp", { method: "POST" })
      const data = await response.json()
      setStatus(data.message)
    } catch (error) {
      setStatus("Error initializing client")
      console.error(error)
    }
  }

  return (
    <div className="p-4 bg-[#121214] text-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">WhatsApp Client</h2>
      <p className="mb-4">Status: {status}</p>
      <button
        onClick={initializeClient}
        className="px-4 py-2 bg-[#5EEC92] text-[#121214] rounded hover:bg-[#4EDB82] transition-colors"
      >
        Initialize Client
      </button>
    </div>
  )
}

