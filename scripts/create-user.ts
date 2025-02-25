const { createClient } = require("@supabase/supabase-js")

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    db: {
      schema: 'public'
    }
  }
)

async function initializeDatabase() {
  try {
    // Criar tabelas necessárias
    const { error: createError } = await supabase.rpc('initialize_database', {
      sql: `
        -- Criar tabela de agentes se não existir
        CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
        );

        -- Criar tabela de sessões de chat se não existir
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id TEXT PRIMARY KEY,
          agent_id TEXT REFERENCES agents(id),
          title TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
        );

        -- Criar tabela de mensagens se não existir
        CREATE TABLE IF NOT EXISTS messages (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          session_id TEXT REFERENCES chat_sessions(id) ON DELETE CASCADE,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
        );

        -- Criar tabela de departamentos se não existir
        CREATE TABLE IF NOT EXISTS departments (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
        );
      `
    })

    if (createError) {
      console.error('Erro ao criar tabelas:', createError)
      return
    }

    console.log('Tabelas criadas com sucesso')

  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error)
  }
}

async function createUser() {
  try {
    await initializeDatabase()

    const { data, error } = await supabase.auth.signUp({
      email: 'mateus@gmail.com',
      password: '123',
    })

    if (error) {
      console.error('Erro ao criar usuário:', error.message)
      return
    }

    console.log('Usuário criado com sucesso:', data)
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
  }
}

createUser() 