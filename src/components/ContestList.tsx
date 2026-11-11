import { Clock, Users, Trophy, Hourglass, BarChart3 } from "lucide-react";
import { ContestWithParticipants } from "@/types/contest";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ContestListProps {
  contests: ContestWithParticipants[];
  selectedContestId: string | null;
  onSelectContest: (contest: ContestWithParticipants | null) => void;
  onShowLeaderboard?: (contest: ContestWithParticipants | null) => void;
  showGlobal?: boolean;
  isGlobalSelected?: boolean;
  emptyMessage?: string;
  isPendingList?: boolean;
}

function formatTimeLeft(endsAt: string): string {
  const now = new Date();
  const end = new Date(endsAt);
  const diffMs = end.getTime() - now.getTime();
  
  if (diffMs <= 0) return "Ended";
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h left`;
  if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m left`;
  return `${diffMins}m left`;
}

function formatDuration(startedAt: string, endedAt: string): string {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const diffMs = end.getTime() - start.getTime();
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) return `Ran for ${diffDays}d ${diffHours % 24}h`;
  if (diffHours > 0) return `Ran for ${diffHours}h ${diffMins % 60}m`;
  return `Ran for ${diffMins}m`;
}

export function ContestList({
  contests,
  selectedContestId,
  onSelectContest,
  onShowLeaderboard,
  showGlobal = false,
  isGlobalSelected = false,
  emptyMessage = "No contests found",
  isPendingList = false
}: ContestListProps) {
  const isExpiredList = contests.length > 0 && contests[0].status === 'expired';

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 pr-4">
        {showGlobal && (
          <button
            onClick={() => onSelectContest(null)}
            className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
              isGlobalSelected
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50 bg-card"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="font-semibold text-foreground flex-1">The Global Estimator Challenge</span>
              {onShowLeaderboard && (
                <button
                  onClick={(e) => { e.stopPropagation(); onShowLeaderboard(null); }}
                  className="p-1 rounded hover:bg-primary/20 transition-colors"
                  title="View Stats"
                >
                  <BarChart3 className="w-4 h-4 text-primary" />
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Compete against players worldwide
            </p>
          </button>
        )}
        
        {contests.map((contest) => {
          // Determine if this is a pending contest by checking approval_status
          const isPending = (contest as any).approval_status === 'pending';
          
          return (
            <button
              key={contest.id}
              onClick={() => onSelectContest(contest)}
              className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                selectedContestId === contest.id
                  ? isPending 
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-primary bg-primary/10"
                  : isPending
                    ? "border-amber-500/50 hover:border-amber-500 bg-card"
                    : "border-border hover:border-primary/50 bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-foreground truncate flex-1 mr-2">
                  {contest.name}
                </span>
                {onShowLeaderboard && !isPending && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onShowLeaderboard(contest); }}
                    className="p-1 rounded hover:bg-primary/20 transition-colors mr-1 flex-shrink-0"
                    title="View Stats"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-primary" />
                  </button>
                )}
                {isPending ? (
                  <Badge variant="outline" className="text-xs text-amber-500 border-amber-500">
                    <Hourglass className="w-3 h-3 mr-1" />
                    Pending
                  </Badge>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>{contest.participant_count}/{contest.participant_limit}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>
                  {isPending 
                    ? "Awaiting approval"
                    : isExpiredList 
                      ? formatDuration(contest.starts_at, contest.ends_at)
                      : formatTimeLeft(contest.ends_at)
                  }
                </span>
              </div>
            </button>
          );
        })}
        
        {contests.length === 0 && !showGlobal && (
          <p className="text-center text-muted-foreground py-4 text-sm">
            {emptyMessage}
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
