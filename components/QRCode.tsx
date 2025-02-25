"use client"

import React, { useState, useEffect } from "react"
import { QRCodeSVG } from "qrcode.react"

export default function QRCode() {
  const [qrValue, setQrValue] = useState("")

  useEffect(() => {
    // In a real application, this would be fetched from your backend
    setQrValue("https://example.com/whatsapp-connection")
  }, [])

  return (
    <div className="bg-white p-4 rounded-lg">
      <QRCodeSVG value={qrValue} size={256} />
    </div>
  )
}

