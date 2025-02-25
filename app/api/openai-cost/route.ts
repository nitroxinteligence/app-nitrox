import { NextResponse } from "next/server"
import OpenAI from "openai"
import { supabase } from "@/lib/supabase-client"

// Helper function to validate OpenAI key
async function validateOpenAIKey(key: string) {
  try {
    const openai = new OpenAI({ apiKey: key })
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    await openai.billing.retrieveUsage({
      start_date: Math.floor(startOfMonth.getTime() / 1000),
      end_date: Math.floor(now.getTime() / 1000)
    })

    return true
  } catch (error: any) {
    console.error("OpenAI key validation error:", error)
    throw new Error(error.message || "Invalid OpenAI key")
  }
}

export async function POST(request: Request) {
  try {
    const { key } = await request.json()

    if (!key) {
      return NextResponse.json(
        { error: "OpenAI key is required" },
        { status: 400 }
      )
    }

    await validateOpenAIKey(key)

    return NextResponse.json({ valid: true })
  } catch (error: any) {
    console.error("Key validation error:", error)
    return NextResponse.json(
      { error: "Invalid OpenAI key", details: error.message },
      { status: 400 }
    )
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET() {
  try {
    // Get current date in ISO format
    const today = new Date()
    const startDate = new Date(today)
    startDate.setHours(0, 0, 0, 0)
    
    // Get usage data from OpenAI
    const usage = await openai.dashboard.getBilling(startDate.toISOString())
    
    return NextResponse.json({
      total_cost: usage.total_usage / 100, // Convert from cents to dollars
      success: true
    })
  } catch (error) {
    console.error('Error fetching OpenAI cost:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch OpenAI cost',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

