import { Server } from 'ws'
import { NextApiRequest } from 'next'
import { Client, LocalAuth } from 'whatsapp-web.js'
import type { Socket } from 'net'

interface ExtendedNextApiResponse extends Socket {
  socket: Socket & {
    server: any
  }
}

let wsServer: Server | null = null
let whatsappClient: Client | null = null

const initializeWebSocket = (server: any) => {
  if (!wsServer) {
    // Configure WebSocket server with SSL if available
    wsServer = new Server({ 
      server,
      path: '/api/whatsapp-socket',
      // This ensures the WebSocket server inherits the HTTPS settings from Next.js
      perMessageDeflate: false
    })

    wsServer.on('connection', (ws) => {
      console.log('New WebSocket connection')

      const sendUpdate = (event: string, data: any) => {
        ws.send(JSON.stringify({ event, data }))
      }

      if (!whatsappClient) {
        whatsappClient = new Client({
          authStrategy: new LocalAuth(),
          puppeteer: {
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--disable-gpu'
            ],
            headless: 'new'
          }
        })

        whatsappClient.on('qr', (qr) => {
          sendUpdate('qr', qr)
        })

        whatsappClient.on('ready', () => {
          sendUpdate('ready', {})
        })

        whatsappClient.on('authenticated', () => {
          sendUpdate('authenticated', {})
        })

        whatsappClient.on('auth_failure', (msg) => {
          sendUpdate('auth_failure', { message: msg })
        })

        whatsappClient.initialize().catch((error) => {
          sendUpdate('error', { message: error.message })
        })
      }

      ws.on('close', () => {
        console.log('Client disconnected')
      })
    })
  }
  return wsServer
}

export default function handler(req: NextApiRequest, res: ExtendedNextApiResponse) {
  if (!res.socket.server.ws) {
    res.socket.server.ws = initializeWebSocket(res.socket.server)
  }
  res.end()
}

