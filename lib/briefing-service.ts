import { createClient } from '@/lib/supabase/client'

export interface Briefing {
  id: string
  created_at: string
  updated_at: string
  agent_id: string
  content: string
  user_id: string
}

// Create a single instance of the Supabase client
const supabase = createClient()

export class BriefingService {
  static async getBriefing(agentId: string): Promise<Briefing | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data: briefing, error } = await supabase
        .from('briefings')
        .select('*')
        .eq('agent_id', agentId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error fetching briefing:', error)
        return null
      }

      return briefing
    } catch (error) {
      console.error('Error in getBriefing:', error)
      return null
    }
  }

  static async getBriefingContent(agentId: string): Promise<string | null> {
    try {
      const briefing = await this.getBriefing(agentId)
      return briefing?.content || null
    } catch (error) {
      console.error('Error getting briefing content:', error)
      return null
    }
  }

  static async saveBriefing(agentId: string, content: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No user found')
        return false
      }

      const existingBriefing = await this.getBriefing(agentId)

      if (existingBriefing) {
        const { error } = await supabase
          .from('briefings')
          .update({ 
            content, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', existingBriefing.id)
          .eq('user_id', user.id)

        if (error) {
          console.error('Error updating briefing:', error)
          return false
        }
      } else {
        const { error } = await supabase
          .from('briefings')
          .insert([
            {
              agent_id: agentId,
              content,
              user_id: user.id
            }
          ])

        if (error) {
          console.error('Error creating briefing:', error)
          return false
        }
      }

      return true
    } catch (error) {
      console.error('Error in saveBriefing:', error)
      return false
    }
  }
} 