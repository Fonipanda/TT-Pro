import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Search } from "lucide-react";

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (country) params.append("country", country);
    params.append("limit", "100");
    const t = setTimeout(() => {
      api.get(`/players?${params.toString()}`).then((r) => {
        setPlayers(r.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [search, country]);

  const countries = ["", "FR", "CN", "JP", "DE", "SE", "BR", "TW", "SI", "RO"];

  return (
    <div className="space-y-6 tt-fade-in" data-testid="players-page">
      <div className="flex items-end justify-between">
        <h1 className="font-heading text-5xl md:text-6xl tracking-wider">JOUEURS</h1>
        <span className="text-zinc-500 font-mono text-sm" data-testid="players-count">{players.length} joueurs</span>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 flex-1 max-w-md">
          <Search size={16} className="text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un joueur..."
            className="bg-transparent flex-1 text-sm focus:outline-none placeholder:text-zinc-500"
            data-testid="player-search-input"
          />
        </div>
        <div className="flex flex-wrap gap-1" data-testid="country-filters">
          {countries.map((c) => (
            <button
              key={c || "all"}
              onClick={() => setCountry(c)}
              data-testid={`filter-country-${c || 'all'}`}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                country === c ? "bg-[#FF3B30] text-white" : "bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              {c || "Tous"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-zinc-500">Chargement...</div>
      ) : (
        <div className="border border-white/5">
          <div className="grid grid-cols-[60px_1fr_100px_100px_120px] md:grid-cols-[80px_1fr_120px_120px_140px_160px] tt-overline px-4 py-3 border-b border-white/5 bg-white/[0.02]">
            <span>Rang</span>
            <span>Joueur</span>
            <span className="hidden md:block">Pays</span>
            <span>Points</span>
            <span>Forme</span>
            <span className="hidden md:block">Style</span>
          </div>
          {players.map((p, i) => (
            <Link
              key={p.id}
              to={`/player/${p.id}`}
              className={`grid grid-cols-[60px_1fr_100px_100px_120px] md:grid-cols-[80px_1fr_120px_120px_140px_160px] items-center px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${i % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"}`}
              data-testid={`player-row-${p.id}`}
            >
              <span className="font-heading text-2xl text-[#FF3B30]">{p.rank_world}</span>
              <span className="flex items-center gap-3">
                <span className="text-xl">{p.flag}</span>
                <span className="font-bold tracking-tight truncate">{p.name}</span>
              </span>
              <span className="hidden md:block text-zinc-400 text-sm font-mono">{p.country_code}</span>
              <span className="font-mono text-sm">{p.points?.toLocaleString()}</span>
              <span className="flex gap-0.5">
                {(p.recent_form || []).map((f, k) => (
                  <span
                    key={k}
                    className={`w-3 h-3 ${f === "W" ? "bg-[#34C759]" : "bg-[#FF3B30]"}`}
                    title={f === "W" ? "Win" : "Loss"}
                  />
                ))}
              </span>
              <span className="hidden md:block text-xs text-zinc-500 truncate">{p.style}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
