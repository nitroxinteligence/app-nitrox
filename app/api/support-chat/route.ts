import { CoreMessage, streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(req: Request) {
  try {
    const { messages }: { messages: CoreMessage[] } = await req.json()

    if (!Array.isArray(messages)) {
      throw new Error('Invalid messages format. Expected an array of CoreMessage objects.')
    }

    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: 'You are a helpful assistant.',
      messages,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Error in POST handler:', error)
    return new Response('An error occurred processing the request.', { status: 500 })
  }
}

