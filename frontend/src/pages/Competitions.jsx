import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";

const CATS = [
  { v: "all", l: "Toutes" },
  { v: "WTT", l: "WTT" },
  { v: "ITTF", l: "ITTF" },
  { v: "France", l: "France" },
  { v: "Bundesliga", l: "Bundesliga" },
  { v: "CSL", l: "Chinese SL" },
  { v: "ChampionsLeague", l: "Champions League" },
];

export default function Competitions() {
  const [comps, setComps] = useState([]);
  const [cat, setCat] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (cat !== "all") params.append("category", cat);
    api.get(`/competitions?${params.toString()}`).then((r) => {
      setComps(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [cat]);

  return (
    <div className="space-y-6 tt-fade-in" data-testid="competitions-page">
      <h1 className="font-heading text-5xl md:text-6xl tracking-wider">COMPÉTITIONS</h1>

      <div className="flex flex-wrap gap-1" data-testid="comp-cat-filters">
        {CATS.map((c) => (
          <button
            key={c.v}
            onClick={() => setCat(c.v)}
            data-testid={`filter-comp-${c.v}`}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              cat === c.v ? "bg-[#FF3B30] text-white" : "bg-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            {c.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-zinc-500">Chargement...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {comps.map((c) => (
            <Link
              key={c.id}
              to={`/competition/${c.id}`}
              className="tt-card overflow-hidden group"
              data-testid={`comp-${c.id}`}
            >
              <div className="aspect-[16/9] bg-cover bg-center relative" style={{ backgroundImage: `url(${c.banner_url})` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
                <div className="absolute top-3 left-3 tt-overline text-white">{c.category}</div>
                <div className="absolute top-3 right-3 text-[10px] uppercase tracking-widest text-zinc-300">{c.country}</div>
              </div>
              <div className="p-5">
                <h3 className="font-heading text-2xl tracking-wider mb-2 group-hover:text-[#FF3B30] transition-colors">{c.name}</h3>
                <div className="text-xs text-zinc-500 font-mono mb-3">
                  {new Date(c.start_date).toLocaleDateString("fr-FR")} → {new Date(c.end_date).toLocaleDateString("fr-FR")}
                </div>
                <p className="text-sm text-zinc-400 line-clamp-2">{c.description}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
