import BaseRepository from './BaseRepository';
import { workspaces_table } from '../schema';

export class WorkspaceRepository extends BaseRepository {
  static override model: any = workspaces_table;
}

export default WorkspaceRepository;
