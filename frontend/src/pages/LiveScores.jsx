import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import MatchCard from "@/components/MatchCard";
import { RefreshCw } from "lucide-react";

const GENDERS = [
  { v: "all", l: "Tous", icon: "★" },
  { v: "men", l: "Hommes", icon: "♂" },
  { v: "women", l: "Dames", icon: "♀" },
];

export default function LiveScores() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gender, setGender] = useState("all");
  const [lastSync, setLastSync] = useState(null);
  const [syncSource, setSyncSource] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const tickRef = useRef(0);

  const load = async () => {
    try {
      const params = gender !== "all" ? `?gender=${gender}` : "";
      const r = await api.get(`/matches/live${params}`);
      setMatches(r.data);
    } catch {}
    setLoading(false);
  };

  const syncWtt = async () => {
    setSyncing(true);
    try {
      const r = await api.post("/sync/wtt");
      setLastSync(new Date());
      setSyncSource(r.data?.source || "wtt");
    } catch {}
    setSyncing(false);
    await load();
  };

  useEffect(() => {
    load();
    // Auto-refresh: load every 12s, sync WTT every 36s (every 3rd tick)
    const t = setInterval(async () => {
      tickRef.current += 1;
      if (tickRef.current % 3 === 0) {
        await syncWtt();
      } else {
        await load();
      }
    }, 12000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender]);

  return (
    <div className="space-y-6 tt-fade-in" data-testid="live-page">
      <div className="flex flex-wrap items-center gap-4">
        <span className="tt-live-dot" />
        <h1 className="font-heading text-5xl md:text-6xl tracking-wider">SCORES LIVE</h1>
        <span className="text-zinc-500 font-mono text-sm" data-testid="live-count">{matches.length} matchs</span>
        <button
          onClick={syncWtt}
          disabled={syncing}
          data-testid="sync-wtt-btn"
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Sync..." : "Sync WTT"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <div className="flex flex-wrap gap-1" data-testid="gender-filters">
          {GENDERS.map((g) => (
            <button
              key={g.v}
              onClick={() => setGender(g.v)}
              data-testid={`filter-gender-${g.v}`}
              className={`px-3 py-1.5 font-bold uppercase tracking-wider transition-colors ${
                gender === g.v ? "bg-[#FFCC00] text-black" : "bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              <span className="mr-1.5">{g.icon}</span>{g.l}
            </button>
          ))}
        </div>
        {lastSync && (
          <span className="text-zinc-500 font-mono ml-auto" data-testid="last-sync">
            Dernière sync: {lastSync.toLocaleTimeString("fr-FR")} {syncSource ? `· ${syncSource}` : ""}
          </span>
        )}
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
