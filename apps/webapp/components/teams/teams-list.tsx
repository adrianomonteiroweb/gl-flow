'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2Icon, PlusIcon, PencilIcon, TrashIcon, UsersIcon, GitBranchIcon } from 'lucide-react';

import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';

import { getTeams } from '@/actions/teams';

import type { Team } from './types';
import { TeamDialog } from './team-dialog';
import { TeamMembersDialog } from './team-members-dialog';
import { TeamPipelinesDialog } from './team-pipelines-dialog';
import { DeleteTeamDialog } from './delete-team-dialog';

export const TeamsList = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamDialog, setTeamDialog] = useState<{ open: boolean; team: Team | null }>({ open: false, team: null });
  const [membersTeamId, setMembersTeamId] = useState<string | null>(null);
  const [pipelinesTeamId, setPipelinesTeamId] = useState<string | null>(null);
  const [deleteTeam, setDeleteTeam] = useState<Team | null>(null);

  const loadTeams = useCallback(async () => {
    const res = await getTeams();

    if (res.success) {
      setTeams((res.data as Team[]) ?? []);
    } else {
      toast.error(res.error || 'Erro ao carregar times');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const handleCreated = (teamId: string) => {
    loadTeams();
    setMembersTeamId(teamId);
  };

  const handleUpdated = () => {
    loadTeams();
  };

  const handleDeleted = () => {
    setDeleteTeam(null);
    loadTeams();
  };

  const handleMembersSaved = () => {
    const teamId = membersTeamId;
    setMembersTeamId(null);
    loadTeams();

    if (teamId) {
      setPipelinesTeamId(teamId);
    }
  };

  const handlePipelinesSaved = () => {
    setPipelinesTeamId(null);
    loadTeams();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Times</h3>
          <p className="text-sm text-muted-foreground">Organize membros em equipes vinculadas a pipelines.</p>
        </div>

        <Button onClick={() => setTeamDialog({ open: true, team: null })} className="gap-2">
          <PlusIcon className="h-4 w-4" />
          Novo time
        </Button>
      </div>

      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UsersIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-sm text-muted-foreground">Nenhum time criado ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">Crie um time para organizar seus membros por pipeline.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map(team => (
            <Card key={team.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{team.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setTeamDialog({ open: true, team })}
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTeam(team)}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <button
                  type="button"
                  onClick={() => setMembersTeamId(team.id)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  <UsersIcon className="h-4 w-4" />
                  <span>
                    {team.memberCount} {team.memberCount === 1 ? 'membro' : 'membros'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPipelinesTeamId(team.id)}
                  className="flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  <GitBranchIcon className="h-4 w-4 mt-0.5 shrink-0" />
                  {team.pipelines.length === 0 ? (
                    <span className="text-xs italic">Nenhum pipeline vinculado</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {team.pipelines.map(p => (
                        <Badge key={p.id} variant="secondary" className="text-xs">
                          {p.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TeamDialog
        open={teamDialog.open}
        team={teamDialog.team}
        onOpenChange={open => {
          if (!open) {
            setTeamDialog({ open: false, team: null });
          }
        }}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
      />

      <TeamMembersDialog
        open={!!membersTeamId}
        teamId={membersTeamId}
        onOpenChange={open => {
          if (!open) {
            setMembersTeamId(null);
            loadTeams();
          }
        }}
        onSaved={handleMembersSaved}
      />

      <TeamPipelinesDialog
        open={!!pipelinesTeamId}
        teamId={pipelinesTeamId}
        onOpenChange={open => {
          if (!open) {
            setPipelinesTeamId(null);
            loadTeams();
          }
        }}
        onSaved={handlePipelinesSaved}
      />

      <DeleteTeamDialog
        open={!!deleteTeam}
        team={deleteTeam}
        onOpenChange={open => {
          if (!open) {
            setDeleteTeam(null);
          }
        }}
        onDeleted={handleDeleted}
      />
    </div>
  );
};
