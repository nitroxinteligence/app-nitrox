import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log('N8N API URL:', process.env.NEXT_PUBLIC_N8N_API_URL)
    
    const url = `${process.env.NEXT_PUBLIC_N8N_API_URL}/workflows`
    console.log('Fetching from URL:', url)
    
    const headers = {
      'X-N8N-API-KEY': process.env.NEXT_PUBLIC_N8N_API_KEY || '',
      'Content-Type': 'application/json',
    }
    console.log('Using headers:', headers)

    const response = await fetch(url, { headers })
    console.log('Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error response:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
    }

    const data = await response.json()
    console.log('Received data:', data)

    if (!data || !data.data) {
      console.error('Invalid data format:', data)
      throw new Error('Invalid data format received from N8N')
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in N8N workflows route:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch workflows',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
} 