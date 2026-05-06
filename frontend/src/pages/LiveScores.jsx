import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import MatchCard from "@/components/MatchCard";

export default function LiveScores() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await api.get("/matches/live");
      setMatches(r.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-6 tt-fade-in" data-testid="live-page">
      <div className="flex items-center gap-4">
        <span className="tt-live-dot" />
        <h1 className="font-heading text-5xl md:text-6xl tracking-wider">SCORES LIVE</h1>
        <span className="text-zinc-500 font-mono text-sm" data-testid="live-count">{matches.length} matchs</span>
      </div>
      {loading ? (
        <div className="text-zinc-500">Chargement...</div>
      ) : matches.length === 0 ? (
        <div className="tt-card p-12 text-center text-zinc-500" data-testid="no-live">
          Aucun match en direct actuellement. Revenez bientôt.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {matches.map((m) => <MatchCard key={m.id} match={m} />)}
        </div>
      )}
    </div>
  );
}
