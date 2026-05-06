import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Search as SearchIcon } from "lucide-react";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState({ players: [], competitions: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults({ players: [], competitions: [] }); return; }
    setLoading(true);
    const t = setTimeout(() => {
      api.get(`/search?q=${encodeURIComponent(q)}`).then((r) => {
        setResults(r.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-6 tt-fade-in" data-testid="search-page">
      <h1 className="font-heading text-5xl md:text-6xl tracking-wider">RECHERCHE</h1>

      <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 max-w-2xl">
        <SearchIcon size={18} className="text-zinc-500" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un joueur, une compétition..."
          className="bg-transparent flex-1 text-base focus:outline-none placeholder:text-zinc-500"
          data-testid="search-input"
        />
      </div>

      {loading && <div className="text-zinc-500 text-sm">Recherche...</div>}

      {(results.players.length > 0 || results.competitions.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div data-testid="search-results-players">
            <h2 className="tt-overline mb-3">Joueurs ({results.players.length})</h2>
            <div className="border border-white/5">
              {results.players.map((p) => (
                <Link key={p.id} to={`/player/${p.id}`} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 last:border-b-0">
                  <span className="text-2xl">{p.flag}</span>
                  <span className="flex-1 font-bold">{p.name}</span>
                  <span className="text-xs font-mono text-zinc-500">#{p.rank_world}</span>
                </Link>
              ))}
            </div>
          </div>
          <div data-testid="search-results-comps">
            <h2 className="tt-overline mb-3">Compétitions ({results.competitions.length})</h2>
            <div className="border border-white/5">
              {results.competitions.map((c) => (
                <Link key={c.id} to={`/competition/${c.id}`} className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 last:border-b-0">
                  <span className="font-bold">{c.name}</span>
                  <span className="text-xs font-mono text-zinc-500">{c.category}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {q && !loading && results.players.length === 0 && results.competitions.length === 0 && (
        <div className="tt-card p-8 text-center text-zinc-500">Aucun résultat pour "{q}"</div>
      )}
    </div>
  );
}
