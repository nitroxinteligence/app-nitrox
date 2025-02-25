import type { ClientOptions } from "whatsapp-web.js"
import dotenv from "dotenv"
import { LocalAuth } from "whatsapp-web.js"

dotenv.config()

export const whatsappConfig: ClientOptions = {
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-extensions",
      "--disable-software-rasterizer",
    ],
    executablePath: process.env.CHROME_PATH || undefined,
    defaultViewport: null,
    protocolTimeout: 30000,
  },
}

