-- Verificar usuário existente no auth.users
SELECT id, email, role, email_confirmed_at, last_sign_in_at
FROM auth.users
WHERE email = '123@gmail.com';

-- Verificar se existe perfil correspondente
SELECT id, email, username, created_at
FROM profiles
WHERE email = '123@gmail.com';

-- Verificar sessões de chat do usuário
SELECT cs.id, cs.title, cs.created_at
FROM chat_sessions cs
JOIN profiles p ON cs.user_id = p.id
WHERE p.email = '123@gmail.com';

-- Verificar políticas de segurança ativas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('profiles', 'chat_sessions', 'messages', 'agents'); 