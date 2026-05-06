import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import MatchCard from "@/components/MatchCard";
import { useFavorites } from "@/lib/useFavorites";
import { Star, ArrowLeft } from "lucide-react";

export default function CompetitionDetail() {
  const { id } = useParams();
  const { isFav, toggle } = useFavorites();
  const [comp, setComp] = useState(null);
  const [matches, setMatches] = useState([]);
  const [round, setRound] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const [c, m] = await Promise.all([
          api.get(`/competitions/${id}`),
          api.get(`/competitions/${id}/matches`),
        ]);
        setComp(c.data);
        setMatches(m.data);
      } catch {}
    })();
  }, [id]);

  if (!comp) return <div className="text-zinc-500">Chargement...</div>;

  const rounds = ["all", ...new Set(matches.map((m) => m.round_name))];
  const filtered = round === "all" ? matches : matches.filter((m) => m.round_name === round);
  const fav = isFav("competition", id);

  return (
    <div className="space-y-8 tt-fade-in" data-testid="competition-detail">
      <Link to="/competitions" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white" data-testid="back-to-comps">
        <ArrowLeft size={14} /> Retour
      </Link>

      <section className="relative overflow-hidden border border-white/5 min-h-[260px]">
        <div className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: `url(${comp.banner_url})` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent" />
        <div className="relative p-6 md:p-10 flex flex-col justify-end min-h-[260px]">
          <div className="tt-overline text-[#FF3B30] mb-2">{comp.category} · {comp.level}</div>
          <h1 className="font-heading text-5xl md:text-7xl leading-none mb-3" data-testid="comp-name">{comp.name}</h1>
          <p className="text-zinc-300 max-w-2xl text-sm md:text-base mb-4">{comp.description}</p>
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs font-mono text-zinc-400">
              {new Date(comp.start_date).toLocaleDateString("fr-FR")} → {new Date(comp.end_date).toLocaleDateString("fr-FR")}
            </span>
            {comp.venue && <span className="text-xs font-mono text-zinc-400">· {comp.venue}</span>}
            <button
              onClick={() => {
                const r = toggle("competition", id);
                r.then?.((res) => { if (res?.needAuth) window.location.href = "/login"; });
              }}
              className={`ml-auto px-5 py-2.5 font-bold uppercase tracking-wider text-xs transition-colors flex items-center gap-2 ${
                fav ? "bg-[#FFCC00] text-black" : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
              }`}
              data-testid="fav-comp-btn"
            >
              <Star size={14} fill={fav ? "currentColor" : "none"} />
              {fav ? "Favori" : "Suivre"}
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-1" data-testid="round-filters">
        {rounds.map((r) => (
          <button
            key={r}
            onClick={() => setRound(r)}
            data-testid={`filter-round-${r}`}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              round === r ? "bg-[#FF3B30] text-white" : "bg-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            {r === "all" ? "Tous les tours" : r}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="tt-card p-8 text-center text-zinc-500">Aucun match disponible.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {filtered.map((m) => <MatchCard key={m.id} match={m} />)}
        </div>
      )}
    </div>
  );
}
