CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Senha para o usuário admin: "@Solfy1q2w" (bcryptjs)
INSERT INTO linharesflow.users (email, name, password, role, created_at, updated_at) VALUES ('adriano@solfy.tech', 'Adriano', '', 'admin', NOW(), NOW());
