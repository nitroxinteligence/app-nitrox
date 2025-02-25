import type { Message } from "whatsapp-web.js"
import { logger } from "../utils/logger"

const commands: { [key: string]: (message: Message) => Promise<void> } = {
  ping: async (message: Message) => {
    await message.reply("pong")
  },

  everyone: async (message: Message) => {
    const chat = await message.getChat()
    if (!chat.isGroup) {
      await message.reply("Este comando só pode ser usado em grupos")
      return
    }

    let text = ""
    const mentions = []

    for (const participant of chat.participants) {
      mentions.push(`${participant.id.user}@c.us`)
      text += `@${participant.id.user} `
    }

    await chat.sendMessage(text, { mentions })
  },

  // Adicione mais comandos aqui
}

export async function commandHandler(message: Message) {
  const command = message.body.slice(1).split(" ")[0].toLowerCase()

  if (command in commands) {
    try {
      await commands[command](message)
    } catch (error) {
      logger.error(`Erro ao executar comando ${command}:`, error)
      await message.reply("Ocorreu um erro ao executar o comando.")
    }
  }
}

