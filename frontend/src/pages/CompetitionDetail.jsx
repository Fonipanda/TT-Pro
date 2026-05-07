import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import MatchCard from "@/components/MatchCard";
import { useFavorites } from "@/lib/useFavorites";
import { Star, ArrowLeft, Download, Loader2 } from "lucide-react";

export default function CompetitionDetail() {
  const { id } = useParams();
  const { isFav, toggle } = useFavorites();
  const [comp, setComp] = useState(null);
  const [matches, setMatches] = useState([]);
  const [round, setRound] = useState("all");
  const [gender, setGender] = useState("all");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const loadMatches = async () => {
    const params = gender !== "all" ? `?gender=${gender}` : "";
    const m = await api.get(`/competitions/${id}/matches${params}`);
    setMatches(m.data);
  };

  useEffect(() => {
    (async () => {
      try {
        const c = await api.get(`/competitions/${id}`);
        setComp(c.data);
        await loadMatches();
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, gender]);

  const handleWttImport = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const r = await api.post(`/sync/wtt/import/${id}`);
      setImportResult(r.data);
      await loadMatches();
    } catch (e) {
      setImportResult({ error: e?.response?.data?.detail || "Import échoué" });
    }
    setImporting(false);
  };

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
            {comp.wtt_event_id && (
              <button
                onClick={handleWttImport}
                disabled={importing}
                data-testid="wtt-import-btn"
                className="px-5 py-2.5 font-bold uppercase tracking-wider text-xs transition-colors flex items-center gap-2 bg-[#FF3B30] hover:bg-[#cc2f26] text-white disabled:opacity-50"
                title={`Importer données réelles WTT (eventId ${comp.wtt_event_id})`}
              >
                {importing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {importing ? "Import..." : "Importer WTT"}
              </button>
            )}
          </div>
          {importResult && (
            <div className="mt-3 text-xs font-mono text-zinc-300" data-testid="import-result">
              {importResult.error ? (
                <span className="text-[#FF3B30]">⚠ {importResult.error}</span>
              ) : (
                <span className="text-[#FFCC00]">
                  ✓ Import WTT : {importResult.inserted ?? 0} ajouts · {importResult.updated ?? 0} mises à jour
                  {importResult.live_count > 0 && ` · ${importResult.live_count} live`}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-3 items-center">
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
        <div className="flex flex-wrap gap-1 ml-auto" data-testid="gender-filters">
          {[
            { v: "all", l: "Tous", icon: "★" },
            { v: "men", l: "Hommes", icon: "♂" },
            { v: "women", l: "Dames", icon: "♀" },
          ].map((g) => (
            <button
              key={g.v}
              onClick={() => setGender(g.v)}
              data-testid={`filter-gender-${g.v}`}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                gender === g.v ? "bg-[#FFCC00] text-black" : "bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              <span className="mr-1.5">{g.icon}</span>{g.l}
            </button>
          ))}
        </div>
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
