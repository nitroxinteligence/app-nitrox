import { commandHandler } from "../lib/whatsapp/commandHandler"
import { logger } from "../lib/Utils/logger"

// rest of the code will go here.  This is a placeholder.
// Example function using the imported modules:

async function handleCommand(command) {
  try {
    const result = await commandHandler(command)
    logger.info(`Command '${command}' executed successfully. Result: ${result}`)
    return result
  } catch (error) {
    logger.error(`Error executing command '${command}': ${error}`)
    throw error
  }
}

