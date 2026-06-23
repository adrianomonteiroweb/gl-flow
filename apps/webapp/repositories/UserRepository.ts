import { users_table } from '@workspace/db';
import BaseRepository from '@workspace/db/repositories/BaseRepository';
import { and, asc, eq, ilike } from 'drizzle-orm';

export type GetUserParams = {
  workspace_id: string;
  q?: string;
  page?: number;
  page_size?: number;
};

export class UserRepository extends BaseRepository {
  static override model: any = users_table;

  static async getUsers({ workspace_id, q = '', page = 1, page_size = 10 }: GetUserParams) {
    const limit = page_size || 10;
    const offset = ((page || 1) - 1) * page_size;

    const workspaceFilter = eq(users_table.workspace_id, workspace_id);
    const where = q ? and(workspaceFilter, ilike(users_table.name, `%${q}%`)) : workspaceFilter;

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
