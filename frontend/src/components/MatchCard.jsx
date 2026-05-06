import { Link } from "react-router-dom";

export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 bg-[#FF3B30] text-white text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-0.5">
      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
      Live
    </span>
  );
}

export function StatusPill({ status }) {
  if (status === "live") return <LiveBadge />;
  if (status === "scheduled")
    return (
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 px-2 py-0.5 border border-white/10">
        À venir
      </span>
    );
  return (
    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-2 py-0.5 border border-white/5">
      Terminé
    </span>
  );
}

function fmtTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

export default function MatchCard({ match, dense = false }) {
  const winnerP1 = match.status === "finished" && match.score_p1 > match.score_p2;
  const winnerP2 = match.status === "finished" && match.score_p2 > match.score_p1;
  const id = match.id;

  return (
    <Link
      to={`/match/${id}`}
      className="block tt-card p-4 group hover:border-white/10"
      data-testid={`match-card-${id}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="tt-overline truncate max-w-[60%]" data-testid={`match-comp-${id}`}>
          {match.competition_name} · {match.round_name}
        </span>
        <StatusPill status={match.status} />
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 items-center">
        <div className={`flex items-center gap-3 ${winnerP1 ? "text-white" : winnerP2 ? "text-zinc-500" : "text-white"}`}>
          <span className="text-2xl leading-none">{match.player1_flag}</span>
          <span className="font-bold tracking-tight truncate" data-testid={`match-p1-${id}`}>{match.player1_name}</span>
          {match.serving === 1 && match.status === "live" && (
            <span className="w-1.5 h-1.5 bg-[#FFCC00] rounded-full" title="Service" />
          )}
        </div>
        <div className="font-heading text-3xl leading-none tabular-nums" data-testid={`match-score-p1-${id}`}>
          {match.status === "scheduled" ? "—" : match.score_p1}
        </div>

        <div className={`flex items-center gap-3 ${winnerP2 ? "text-white" : winnerP1 ? "text-zinc-500" : "text-white"}`}>
          <span className="text-2xl leading-none">{match.player2_flag}</span>
          <span className="font-bold tracking-tight truncate" data-testid={`match-p2-${id}`}>{match.player2_name}</span>
          {match.serving === 2 && match.status === "live" && (
            <span className="w-1.5 h-1.5 bg-[#FFCC00] rounded-full" title="Service" />
          )}
        </div>
        <div className="font-heading text-3xl leading-none tabular-nums" data-testid={`match-score-p2-${id}`}>
          {match.status === "scheduled" ? "—" : match.score_p2}
        </div>
      </div>

      {match.sets && match.sets.length > 0 && !dense && (
        <div className="mt-3 pt-3 border-t border-white/5 flex gap-2 text-xs font-mono text-zinc-400 overflow-x-auto">
          {match.sets.map((s, i) => (
            <span key={i} className="whitespace-nowrap">
              {s[0]}-{s[1]}
            </span>
          ))}
          {match.status === "live" && (
            <span className="whitespace-nowrap text-[#FF3B30] font-bold">
              {match.current_set_p1}-{match.current_set_p2}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
        <span data-testid={`match-time-${id}`}>{fmtTime(match.scheduled_at)}</span>
        {match.venue && <span className="truncate ml-2">{match.venue}</span>}
      </div>
    </Link>
  );
}
