CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Senha para todos os usuários: "password" (hash: 7c4a8d09ca3762af61e59520943dc26494f8941b = 123456)
INSERT INTO glflow.users (email, name, password, role, created_at, updated_at) VALUES ('alan@solfy.tech', 'Alan Bacelar', '7c4a8d09ca3762af61e59520943dc26494f8941b', 'admin', NOW(), NOW());
