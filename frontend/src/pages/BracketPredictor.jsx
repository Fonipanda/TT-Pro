import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Sparkles, Trophy, ArrowRight, Loader2, Save } from "lucide-react";

const ROUNDS_ORDER = ["Round of 16", "Quarter Final", "Semi Final", "Final"];

export default function BracketPredictor() {
  const [comps, setComps] = useState([]);
  const [selectedComp, setSelectedComp] = useState(null);
  const [matches, setMatches] = useState([]);
  const [picks, setPicks] = useState({});  // matchId -> winner_name
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load competitions that have an importable bracket (WTT-mapped)
  useEffect(() => {
    api.get("/competitions").then((r) => {
      const eligible = r.data.filter((c) => c.wtt_event_id || c.category === "ITTF");
      setComps(eligible);
    }).catch(() => {});
  }, []);

  // When user selects a competition, load its matches
  useEffect(() => {
    if (!selectedComp) { setMatches([]); return; }
    api.get(`/competitions/${selectedComp.id}/matches`).then((r) => {
      // Keep only knockout-stage matches (excluding group/journée)
      const ko = r.data.filter((m) => ROUNDS_ORDER.includes(m.round_name));
      setMatches(ko);
      setPicks({});
      setEvaluation(null);
    });
  }, [selectedComp]);

  const matchesByRound = useMemo(() => {
    const out = {};
    for (const r of ROUNDS_ORDER) out[r] = matches.filter((m) => m.round_name === r);
    return out;
  }, [matches]);

  const selectedCount = Object.keys(picks).length;

  const evaluate = async () => {
    if (selectedCount === 0) return;
    setLoading(true);
    setEvaluation(null);
    try {
      const predictions = matches
        .filter((m) => picks[m.id])
        .map((m) => ({
          round: m.round_name,
          player1: m.player1_name,
          player2: m.player2_name,
          picked_winner: picks[m.id],
        }));
      const r = await api.post("/bracket-predictor/eval", {
        competition_name: selectedComp.name,
        predictions,
      });
      setEvaluation(r.data);
    } catch (e) {
      setEvaluation({ summary: "Erreur d'évaluation IA. Réessayez plus tard.", overall_score: 0 });
    }
    setLoading(false);
  };

  const save = async () => {
    if (!evaluation) return;
    setSaving(true);
    try {
      const predictions = matches
        .filter((m) => picks[m.id])
        .map((m) => ({
          round: m.round_name,
          player1: m.player1_name,
          player2: m.player2_name,
          picked_winner: picks[m.id],
        }));
      await api.post("/bracket-predictor/save", {
        competition_id: selectedComp.id,
        competition_name: selectedComp.name,
        predictions,
        ai_evaluation: evaluation,
      });
    } catch (e) {
      if (e?.response?.status === 401) window.location.href = "/login";
    }
    setSaving(false);
  };

  return (
    <div className="space-y-8 tt-fade-in" data-testid="bracket-predictor-page">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Trophy size={24} className="text-[#FFCC00]" />
          <h1 className="font-heading text-5xl md:text-6xl tracking-wider">BRACKET PREDICTOR</h1>
        </div>
        <p className="text-zinc-400 max-w-2xl">
          Choisissez les vainqueurs de chaque match d'un tableau final puis laissez Claude IA évaluer la cohérence de vos pronostics.
        </p>
      </div>

      {/* Competition picker */}
      <section data-testid="comp-picker">
        <div className="tt-overline mb-3">1. Choisir un tournoi</div>
        <div className="flex flex-wrap gap-2">
          {comps.slice(0, 12).map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedComp(c)}
              data-testid={`pick-comp-${c.id}`}
              className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                selectedComp?.id === c.id ? "bg-[#FF3B30] text-white" : "bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              {c.short_name || c.name}
            </button>
          ))}
        </div>
      </section>

      {selectedComp && matches.length === 0 && (
        <div className="tt-card p-8 text-center text-zinc-500" data-testid="no-bracket">
          Pas de phase finale disponible pour ce tournoi.
          <Link to={`/competition/${selectedComp.id}`} className="block mt-2 text-[#FF3B30] hover:underline text-sm">
            Voir tous les matchs →
          </Link>
        </div>
      )}

      {/* Bracket — round-by-round */}
      {matches.length > 0 && (
        <section className="space-y-6" data-testid="bracket-rounds">
          <div className="tt-overline">2. Pronostiquer chaque match ({selectedCount}/{matches.length} sélectionnés)</div>
          {ROUNDS_ORDER.filter((r) => matchesByRound[r]?.length).map((round) => (
            <div key={round} data-testid={`round-${round}`}>
              <h2 className="font-heading text-2xl tracking-wider text-[#FFCC00] mb-3">{round}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {matchesByRound[round].map((m) => (
                  <div key={m.id} className="tt-card p-4" data-testid={`bracket-match-${m.id}`}>
                    {[m.player1_name, m.player2_name].map((name) => (
                      <button
                        key={name}
                        onClick={() => setPicks({ ...picks, [m.id]: name })}
                        data-testid={`pick-${m.id}-${name.replace(/\s/g, '')}`}
                        className={`w-full text-left flex items-center gap-2 px-3 py-2 mb-1 transition-colors ${
                          picks[m.id] === name
                            ? "bg-[#FF3B30] text-white"
                            : "bg-white/5 text-zinc-300 hover:bg-white/10"
                        }`}
                      >
                        <span className="text-sm font-bold flex-1">{name}</span>
                        {picks[m.id] === name && <ArrowRight size={14} />}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/5">
            <button
              onClick={evaluate}
              disabled={selectedCount === 0 || loading}
              data-testid="evaluate-btn"
              className="bg-[#FF3B30] hover:bg-[#FF5C53] disabled:opacity-50 text-white px-6 py-3 font-bold uppercase tracking-wider text-sm transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {loading ? "Analyse Claude..." : "Évaluer mon bracket"}
            </button>
            {evaluation && (
              <button
                onClick={save}
                disabled={saving}
                data-testid="save-bracket-btn"
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-3 font-bold uppercase tracking-wider text-xs transition-colors flex items-center gap-2"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Sauvegarder
              </button>
            )}
          </div>
        </section>
      )}

      {/* AI evaluation */}
      {evaluation && (
        <section className="tt-card p-6 space-y-4" data-testid="evaluation">
          <div className="flex items-baseline gap-3">
            <Sparkles size={20} className="text-[#FFCC00]" />
            <h2 className="font-heading text-3xl tracking-wider">ANALYSE IA</h2>
            <span className="ml-auto text-sm font-mono text-zinc-500">
              Score: <span className="text-[#FFCC00] text-2xl">{evaluation.overall_score}</span>/100
            </span>
          </div>
          <p className="text-zinc-300 whitespace-pre-wrap" data-testid="eval-summary">{evaluation.summary}</p>
          {evaluation.expert_picks?.length > 0 && (
            <div data-testid="expert-picks">
              <div className="tt-overline mb-2">Pronostics de l'expert IA</div>
              <ul className="space-y-2">
                {evaluation.expert_picks.map((p, i) => (
                  <li key={i} className="text-sm text-zinc-300 border-l-2 border-[#FFCC00] pl-3">
                    <strong className="text-white">{p.round}:</strong> {p.expert_winner}
                    {p.rationale && <span className="text-zinc-500"> — {p.rationale}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {typeof evaluation.agreement_count === "number" && (
            <div className="text-xs text-zinc-500 font-mono">
              Accord IA ↔ vous : {evaluation.agreement_count} prédiction(s)
            </div>
          )}
        </section>
      )}
    </div>
  );
}
