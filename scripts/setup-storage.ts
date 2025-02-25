import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Carrega as variáveis de ambiente do arquivo .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('As variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são necessárias')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupStorage() {
  try {
    // Criar o bucket se não existir
    const { data: bucket, error: bucketError } = await supabase
      .storage
      .createBucket('chat-attachments', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: [
          'image/jpeg',
          'image/png',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain'
        ]
      })

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('O bucket chat-attachments já existe')
        
        // Atualizar configurações do bucket existente
        const { error: updateError } = await supabase
          .storage
          .updateBucket('chat-attachments', {
            public: true,
            fileSizeLimit: 10485760,
            allowedMimeTypes: [
              'image/jpeg',
              'image/png',
              'application/pdf',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'text/plain'
            ]
          })

        if (updateError) {
          throw updateError
        }
        
        console.log('Configurações do bucket atualizadas com sucesso')
      } else {
        throw bucketError
      }
    } else {
      console.log('Bucket chat-attachments criado com sucesso')
    }

  } catch (error) {
    console.error('Erro ao configurar o storage:', error)
    process.exit(1)
  }
}

setupStorage() 