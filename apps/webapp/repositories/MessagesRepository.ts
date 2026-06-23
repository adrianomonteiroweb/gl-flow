import { messages_table, chats_table, leads_table, users_table } from '@workspace/db';
import BaseRepository from '@workspace/db/repositories/BaseRepository';
import { asc, eq, ilike, desc, count, and, gt } from 'drizzle-orm';

export type GetMessageParams = {
  q?: string;
  page?: number;
  page_size?: number;
};

export type MessageWithRelations = {
  message: any;
  chat?: any;
  lead?: any;
  assignee?: any;
};

export class MessageRepository extends BaseRepository {
  static override model: any = messages_table;

  static async getMessages({ q = '', page = 1, page_size = 10 }: GetMessageParams = {}) {
    const limit = page_size || 10;
    const offset = ((page || 1) - 1) * page_size;

    const where = q && ilike(messages_table.content, `%${q}%`);

    const data = await super.findAll(where, {
      orderBy: (messages_table: any) => [asc(messages_table.id)],
      limit,
      offset,
    });

    return {
      count: await super.count(where),
      data,
    };
  }

  static async search(searchTerm: string = '', options: any = {}) {
    const where = searchTerm ? ilike(messages_table.content, `%${searchTerm}%`) : undefined;
    return await this.findAll(where, options);
  }

  static async getMessagesWithChat({ q = '', page = 1, page_size = 10 }: GetMessageParams = {}): Promise<{
    count: number;
    data: MessageWithRelations[];
  }> {
    const limit = page_size || 10;
    const offset = ((page || 1) - 1) * page_size;

    const where = q ? ilike(messages_table.content, `%${q}%`) : undefined;

    const data = await this.db
      .select({
        message: messages_table,
        chat: chats_table,
        lead: leads_table,
        assignee: users_table,
      })
      .from(messages_table)
      .leftJoin(chats_table, eq(messages_table.chat_id, chats_table.id))
      .leftJoin(leads_table, eq(chats_table.lead_id, leads_table.id))
      .leftJoin(users_table, eq(chats_table.assignee_id, users_table.id))
      .where(where)
      .orderBy(desc(messages_table.created_at))
      .limit(limit)
      .offset(offset);

    const countResult = await this.db.select({ value: count() }).from(messages_table).where(where);

    return {
      count: countResult[0]?.value || 0,
      data,
    };
  }

  static async getMessagesByChatWithChat(
    chatId: string,
    { q = '', page = 1, page_size = 10 }: GetMessageParams = {}
  ): Promise<{ count: number; data: MessageWithRelations[] }> {
    const limit = page_size || 10;
    const offset = ((page || 1) - 1) * page_size;

    const where = q ? ilike(messages_table.content, `%${q}%`) : eq(messages_table.chat_id, chatId);

    const data = await this.db
      .select({
        message: messages_table,
        chat: chats_table,
        lead: leads_table,
        assignee: users_table,
      })
      .from(messages_table)
      .leftJoin(chats_table, eq(messages_table.chat_id, chats_table.id))
      .leftJoin(leads_table, eq(chats_table.lead_id, leads_table.id))
      .leftJoin(users_table, eq(chats_table.assignee_id, users_table.id))
      .where(eq(messages_table.chat_id, chatId))
      .orderBy(asc(messages_table.created_at))
      .limit(limit)
      .offset(offset);

    const countResult = await this.db.select({ value: count() }).from(messages_table).where(eq(messages_table.chat_id, chatId));

    return {
      count: countResult[0]?.value || 0,
      data,
    };
  }

  static async getNewMessagesByChatSince(chatId: string, since: Date): Promise<MessageWithRelations[]> {
    const sinceIsoString = since.toISOString();
    return await this.db
      .select({
        message: messages_table,
        chat: chats_table,
        lead: leads_table,
        assignee: users_table,
      })
      .from(messages_table)
      .leftJoin(chats_table, eq(messages_table.chat_id, chats_table.id))
      .leftJoin(leads_table, eq(chats_table.lead_id, leads_table.id))
      .leftJoin(users_table, eq(chats_table.assignee_id, users_table.id))
      .where(and(eq(messages_table.chat_id, chatId), gt(messages_table.created_at, sinceIsoString)))
      .orderBy(asc(messages_table.created_at));
  }

  static async getMessageById(id: string): Promise<MessageWithRelations | null> {
    const data = await this.db
      .select({
        message: messages_table,
        chat: chats_table,
        lead: leads_table,
        assignee: users_table,
      })
      .from(messages_table)
      .leftJoin(chats_table, eq(messages_table.chat_id, chats_table.id))
      .leftJoin(leads_table, eq(chats_table.lead_id, leads_table.id))
      .leftJoin(users_table, eq(chats_table.assignee_id, users_table.id))
      .where(eq(messages_table.id, id))
      .limit(1);

    return data?.[0] || null;
  }
}

export default MessageRepository;
