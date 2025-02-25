-- Remover dados existentes
DELETE FROM messages
WHERE session_id IN (
    SELECT cs.id
    FROM chat_sessions cs
    JOIN profiles p ON cs.user_id = p.id
    WHERE p.email = '123@gmail.com'
);

DELETE FROM chat_sessions
WHERE user_id IN (
    SELECT id FROM profiles WHERE email = '123@gmail.com'
);

DELETE FROM profiles
WHERE email = '123@gmail.com';

DELETE FROM auth.users
WHERE email = '123@gmail.com';

-- Criar novo usuário
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    raw_app_meta_data,
    raw_user_meta_data
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    uuid_generate_v4(),
    'authenticated',
    'authenticated',
    '123@gmail.com',
    crypt('123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Usuário Teste"}'
) RETURNING id; 