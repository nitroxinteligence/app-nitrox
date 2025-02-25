import fs from "fs"
import os from "os"

export const checkEnvironment = () => {
  // Verificar se o Chrome está instalado
  const isChromiumInstalled = fs.existsSync(process.env.CHROME_PATH || "/usr/bin/google-chrome-stable")

  if (!isChromiumInstalled) {
    throw new Error("Chrome não encontrado. Por favor, instale o Chrome ou configure CHROME_PATH.")
  }

  // Verificar memória disponível
  const freeMem = os.freemem() / 1024 / 1024 // MB
  if (freeMem < 512) {
    // Menos que 512MB
    throw new Error("Memória insuficiente para executar o cliente.")
  }
}

