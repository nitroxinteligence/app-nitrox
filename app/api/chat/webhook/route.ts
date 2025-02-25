import { NextResponse } from "next/server"
import { logger } from "@/lib/utils/logger"

const WEBHOOK_URL = "https://node.nitroxinteligencia.com.br/webhook/75c1648f-aaac-407c-bd96-f118ce90bf2c"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    logger.info("Recebida solicitação para webhook", { body })

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    logger.info(`Resposta do webhook recebida. Status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      logger.error("Erro na resposta do webhook", { status: response.status, error: errorText })
      return NextResponse.json({ error: "Erro na chamada do webhook", details: errorText }, { status: response.status })
    }

    const data = await response.json()
    logger.info("Resposta do webhook processada com sucesso", { data })

    return NextResponse.json(data)
  } catch (error) {
    logger.error("Erro ao processar webhook:", error)
    return NextResponse.json(
      { error: "Falha ao processar webhook", details: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 },
    )
  }
}

