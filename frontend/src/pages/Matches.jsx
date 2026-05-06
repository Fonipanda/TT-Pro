import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import MatchCard from "@/components/MatchCard";

const STATUS = [
  { v: "all", l: "Tous" },
  { v: "live", l: "En direct" },
  { v: "scheduled", l: "À venir" },
  { v: "finished", l: "Terminés" },
];

const CATS = [
  { v: "all", l: "Toutes" },
  { v: "WTT", l: "WTT" },
  { v: "ITTF", l: "ITTF" },
  { v: "France", l: "France" },
  { v: "Bundesliga", l: "Bundesliga" },
  { v: "CSL", l: "Chinese SL" },
  { v: "ChampionsLeague", l: "Champions League" },
];

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [status, setStatus] = useState("all");
  const [cat, setCat] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== "all") params.append("status", status);
    if (cat !== "all") params.append("category", cat);
    params.append("limit", "60");
    api.get(`/matches?${params.toString()}`).then((r) => {
      setMatches(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [status, cat]);

  return (
    <div className="space-y-6 tt-fade-in" data-testid="matches-page">
      <h1 className="font-heading text-5xl md:text-6xl tracking-wider">MATCHS</h1>

      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1" data-testid="status-filters">
          {STATUS.map((s) => (
            <button
              key={s.v}
              onClick={() => setStatus(s.v)}
              data-testid={`filter-status-${s.v}`}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                status === s.v ? "bg-[#FF3B30] text-white" : "bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              {s.l}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1" data-testid="cat-filters">
          {CATS.map((c) => (
            <button
              key={c.v}
              onClick={() => setCat(c.v)}
              data-testid={`filter-cat-${c.v}`}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                cat === c.v ? "bg-white text-black" : "bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              {c.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-zinc-500">Chargement...</div>
      ) : matches.length === 0 ? (
        <div className="tt-card p-12 text-center text-zinc-500">Aucun match trouvé avec ces filtres.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {matches.map((m) => <MatchCard key={m.id} match={m} />)}
        </div>
      )}
    </div>
  );
}
