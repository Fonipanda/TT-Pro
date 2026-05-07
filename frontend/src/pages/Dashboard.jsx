import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import MatchCard from "@/components/MatchCard";
import { Sparkles, Calendar as CalIcon, Globe, Trophy } from "lucide-react";

// Generic multi-competition hero — covers WTT/ITTF/FFTT/Bundesliga/CSL/ECL
const HERO = "https://images.unsplash.com/photo-1611251135345-18c56206b863?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600";

const CATEGORY_LABELS = {
  WTT: "World Table Tennis",
  ITTF: "ITTF / Olympics",
  France: "France · Pro A / Pro B",
  Bundesliga: "Bundesliga (DE)",
  CSL: "Chinese Super League",
  ChampionsLeague: "ETTU Champions League",
};

function Stat({ label, value, testid }) {
  return (
    <div className="tt-card p-5" data-testid={testid}>
      <div className="tt-overline mb-2">{label}</div>
      <div className="font-heading text-5xl md:text-6xl leading-none">{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [live, setLive] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [comps, setComps] = useState([]);
  const [reco, setReco] = useState("");
  const [loadingReco, setLoadingReco] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [s, l, u, c] = await Promise.all([
          api.get("/stats/overview"),
          api.get("/matches/live"),
          api.get("/matches/upcoming?limit=6"),
          api.get("/competitions"),
        ]);
        setStats(s.data);
        setLive(l.data);
        setUpcoming(u.data);
        setComps(c.data);
      } catch (e) { /* noop */ }
    })();
  }, []);

  const loadReco = async () => {
    setLoadingReco(true);
    try {
      const r = await api.get("/ai/recommendations");
      setReco(r.data.recommendations);
    } catch { setReco("Recommandations indisponibles pour le moment."); }
    setLoadingReco(false);
  };

  const compsByCategory = comps.reduce((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});
  const categoryOrder = ["WTT", "ITTF", "France", "Bundesliga", "CSL", "ChampionsLeague"];

  return (
    <div className="space-y-8 tt-fade-in" data-testid="dashboard-page">
      {/* Hero — generic multi-competition pitch */}
      <section
        className="relative overflow-hidden border border-white/5"
        style={{ minHeight: 320 }}
        data-testid="dashboard-hero"
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url(${HERO})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent" />
        <div className="relative p-6 md:p-12 flex flex-col justify-end h-full" style={{ minHeight: 320 }}>
          <div className="tt-overline text-[#FF3B30] mb-3">
            FFTT · ITTF · WTT · BUNDESLIGA · CHINESE SUPER LEAGUE · ECL
          </div>
          <h1 className="font-heading text-5xl md:text-7xl leading-none mb-4">
            TOUT LE TENNIS<br />DE TABLE PRO,<br />EN UN SEUL ENDROIT.
          </h1>
          <p className="text-zinc-300 text-lg max-w-xl">
            Scores live, fiches joueurs, calendriers, prédictions IA et streaming officiel.
            Du Pro A français aux Grand Smash WTT, en passant par les championnats du monde.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link to="/live" className="bg-[#FF3B30] hover:bg-[#FF5C53] text-white px-6 py-3 font-bold uppercase tracking-wider text-sm transition-colors" data-testid="hero-live-btn">
              Voir les matchs live
            </Link>
            <Link to="/competitions" className="border border-white/15 hover:bg-white/5 text-white px-6 py-3 font-bold uppercase tracking-wider text-sm transition-colors" data-testid="hero-comps-btn">
              Toutes les compétitions
            </Link>
            <Link to="/players" className="border border-white/15 hover:bg-white/5 text-white px-6 py-3 font-bold uppercase tracking-wider text-sm transition-colors" data-testid="hero-players-btn">
              Joueurs
            </Link>
          </div>
        </div>
      </section>

      {/* Stats overview */}
      {stats && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6" data-testid="dashboard-stats">
          <Stat label="Joueurs" value={stats.players} testid="stat-players" />
          <Stat label="Compétitions" value={stats.competitions} testid="stat-comps" />
          <Stat label="Matchs" value={stats.matches} testid="stat-matches" />
          <Stat label="En direct" value={stats.live_matches} testid="stat-live" />
        </section>
      )}

      {/* Live matches */}
      <section data-testid="section-live">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="tt-live-dot" />
            <h2 className="font-heading text-3xl md:text-4xl tracking-wider">EN DIRECT</h2>
            <span className="text-zinc-500 text-sm font-mono">{live.length} matchs</span>
          </div>
          <Link to="/live" className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white" data-testid="see-all-live">
            Tout voir →
          </Link>
        </div>
        {live.length === 0 ? (
          <div className="tt-card p-8 text-center text-zinc-500">Aucun match en direct pour le moment.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {live.slice(0, 6).map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        )}
      </section>

      {/* Upcoming + AI recommendations */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2" data-testid="section-upcoming">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CalIcon size={20} className="text-[#FF3B30]" />
              <h2 className="font-heading text-3xl md:text-4xl tracking-wider">À VENIR</h2>
            </div>
            <Link to="/matches" className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white" data-testid="see-all-upcoming">
              Tout voir →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>

        <div data-testid="section-reco">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles size={20} className="text-[#FF3B30]" />
            <h2 className="font-heading text-3xl md:text-4xl tracking-wider">POUR VOUS</h2>
          </div>
          <div className="tt-card p-6 space-y-4">
            <p className="text-sm text-zinc-400">Recommandations personnalisées générées par Claude Sonnet 4.5.</p>
            {reco ? (
              <div className="text-sm text-zinc-200 whitespace-pre-wrap" data-testid="reco-content">{reco}</div>
            ) : (
              <button
                onClick={loadReco}
                disabled={loadingReco}
                className="w-full bg-[#FF3B30] hover:bg-[#FF5C53] disabled:opacity-50 text-white px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors"
                data-testid="reco-generate-btn"
              >
                {loadingReco ? "Génération..." : "Générer des recommandations IA"}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Competitions explorer — grouped by category */}
      <section data-testid="section-comps">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Trophy size={20} className="text-[#FF3B30]" />
            <h2 className="font-heading text-3xl md:text-4xl tracking-wider">COMPÉTITIONS</h2>
          </div>
          <Link to="/competitions" className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white" data-testid="see-all-comps">
            Tout voir →
          </Link>
        </div>
        <div className="space-y-6">
          {categoryOrder.filter((cat) => compsByCategory[cat]?.length).map((cat) => (
            <div key={cat} data-testid={`comp-cat-${cat}`}>
              <div className="flex items-center gap-3 mb-3">
                <Globe size={14} className="text-zinc-500" />
                <h3 className="tt-overline">{CATEGORY_LABELS[cat] || cat}</h3>
                <span className="text-zinc-600 font-mono text-xs">{compsByCategory[cat].length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {compsByCategory[cat].slice(0, 3).map((c) => (
                  <Link
                    key={c.id}
                    to={`/competition/${c.id}`}
                    className="tt-card p-5 group"
                    data-testid={`comp-card-${c.id}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="tt-overline">{c.category}</span>
                      <span className="text-[10px] uppercase tracking-widest text-zinc-500">{c.country}</span>
                    </div>
                    <h3 className="font-heading text-2xl tracking-wider mb-2 group-hover:text-[#FF3B30] transition-colors">{c.short_name || c.name}</h3>
                    <div className="text-xs text-zinc-500 font-mono">
                      {new Date(c.start_date).toLocaleDateString("fr-FR")} → {new Date(c.end_date).toLocaleDateString("fr-FR")}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
