CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Senha para o usuário admin: "LinharesFlow@2024" (bcryptjs)
INSERT INTO linharesflow.users (email, name, password, role, created_at, updated_at) VALUES ('adriano@solfy.tech', 'Adriano', '$2b$10$bTM1yu.By/OZx.b/MC3cDe4Ua8qJGueUPXdmph4ZlKfHdY8uE4ORy', 'admin', NOW(), NOW());
