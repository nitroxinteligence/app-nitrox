import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Simulating a successful disconnection for demonstration purposes
    await new Promise(resolve => setTimeout(resolve, 1000))

    return NextResponse.json({ message: 'Desconectado com sucesso do WhatsApp' })
  } catch (error: any) {
    console.error('Erro ao desconectar do WhatsApp:', error)
    return NextResponse.json({ error: error.message || 'Falha ao desconectar do WhatsApp' }, { status: 500 })
  }
}

