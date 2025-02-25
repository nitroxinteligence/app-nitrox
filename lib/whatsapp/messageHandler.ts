import type { Message } from "whatsapp-web.js"
import { commandHandler } from "./commandHandler"
import { logger } from "@/lib/utils/logger"

export async function messageHandler(message: Message) {
  try {
    if (message.isStatus) return

    logger.info(`Mensagem recebida: ${message.body}`)

    if (message.body.startsWith("!")) {
      await commandHandler(message)
      return
    }

    // Add more message handling logic here if needed
  } catch (error) {
    logger.error("Erro ao processar mensagem:", error)
  }
}

