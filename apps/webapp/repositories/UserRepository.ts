import { users_table } from '@workspace/db';
import BaseRepository from '@workspace/db/repositories/BaseRepository';
import { and, asc, eq, ilike, or } from 'drizzle-orm';

export type GetUserParams = {
  workspace_id: string;
  q?: string;
  page?: number;
  page_size?: number;
  current_user_id?: string;
};

export class UserRepository extends BaseRepository {
  static override model: any = users_table;

  static async getUsers({ workspace_id, q = '', page = 1, page_size = 10, current_user_id }: GetUserParams) {
    const limit = page_size || 10;
    const offset = ((page || 1) - 1) * page_size;

    const workspaceFilter = eq(users_table.workspace_id, workspace_id);
    // o usuário logado sempre deve se enxergar na lista, mesmo sem workspace vinculado
    const baseFilter = current_user_id ? or(workspaceFilter, eq(users_table.id, current_user_id)) : workspaceFilter;
    const where = q ? and(baseFilter, ilike(users_table.name, `%${q}%`)) : baseFilter;

    const data = await super.findAll(where, {
      orderBy: (users_table: any) => [asc(users_table.id)],
      limit,
      offset,
    });

    return {
      count: await super.count(where),
      data,
    };
  }

  static async findByEmail(email: string, options: any = {}) {
    return await this.query().findFirst({
      ...options,
      where: eq(this.model.email, email),
    });
  }

  static async findByDocumentNumber(document_number: string, options: any = {}) {
    return await this.query().findFirst({
      ...options,
      where: eq(this.model.document_number, document_number),
    });
  }

  static async findOrCreateByEmail(email: string) {
    return await this.findOrCreate(eq(users_table.email, email), { email });
  }

  static async search(workspaceId: string, searchTerm: string = '', options: any = {}) {
    const workspaceFilter = eq(users_table.workspace_id, workspaceId);
    const where = searchTerm ? and(workspaceFilter, ilike(users_table.name, `%${searchTerm}%`)) : workspaceFilter;
    return await this.findAll(where, options);
  }
}

export default UserRepository;
