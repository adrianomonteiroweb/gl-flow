import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);

export async function saveUserPhotoFile(file: File, userId: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'users');

  // Cria a pasta se não existir
  if (!(await exists(uploadDir))) {
    await mkdir(uploadDir, { recursive: true });
  }

  // Garante uma extensão segura
  const extension = file.name?.split('.').pop()?.toLowerCase() || 'png';

  const fileName = `${userId}.${extension}`;
  const filePath = path.join(uploadDir, fileName);

  // Salva o arquivo
  await writeFile(filePath, buffer);

  // Retorna o caminho público
  return `/uploads/users/${fileName}`;
}
