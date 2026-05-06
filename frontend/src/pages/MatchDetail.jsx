import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { ArrowLeft, Sparkles, FileText } from "lucide-react";
import { StatusPill } from "@/components/MatchCard";

export default function MatchDetail() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [h2h, setH2h] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [predLoading, setPredLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [sumLoading, setSumLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const m = await api.get(`/matches/${id}`);
        setMatch(m.data);
        const h = await api.get(`/matches/h2h/${m.data.player1_id}/${m.data.player2_id}`);
        setH2h(h.data.filter((x) => x.id !== id));
      } catch {}
    })();
    const t = setInterval(async () => {
      try { const r = await api.get(`/matches/${id}`); setMatch(r.data); } catch {}
    }, 12000);
    return () => clearInterval(t);
  }, [id]);

  const generatePrediction = async () => {
    setPredLoading(true);
    try {
      const r = await api.post("/ai/predict", { match_id: id });
      setPrediction(r.data);
    } catch { setPrediction({ reasoning: "Prédiction indisponible.", player1_win_probability: 0.5, player2_win_probability: 0.5, predicted_score: "—" }); }
    setPredLoading(false);
  };

  const generateSummary = async () => {
    setSumLoading(true);
    try {
      const r = await api.get(`/ai/summary/${id}`);
      setSummary(r.data);
    } catch { setSummary({ summary: "Résumé indisponible.", highlights: [] }); }
    setSumLoading(false);
  };

  if (!match) return <div className="text-zinc-500">Chargement...</div>;

  const p1Stats = h2h.filter((m) => m.status === "finished" && (
    (m.player1_id === match.player1_id && m.score_p1 > m.score_p2) ||
    (m.player2_id === match.player1_id && m.score_p2 > m.score_p1)
  )).length;
  const p2Stats = h2h.filter((m) => m.status === "finished" && (
    (m.player1_id === match.player2_id && m.score_p1 > m.score_p2) ||
    (m.player2_id === match.player2_id && m.score_p2 > m.score_p1)
  )).length;

  return (
    <div className="space-y-8 tt-fade-in" data-testid="match-detail-page">
      <Link to="/matches" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white" data-testid="back-to-matches">
        <ArrowLeft size={14} /> Retour
      </Link>

      <section className="border border-white/5 bg-[#121212] p-6 md:p-10" data-testid="match-hero">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="tt-overline text-[#FF3B30]">{match.competition_name}</div>
            <div className="text-sm text-zinc-400 mt-1">{match.round_name}</div>
          </div>
          <StatusPill status={match.status} />
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 md:gap-12 items-center">
          <Link to={`/player/${match.player1_id}`} className="text-center md:text-right group">
            <div className="text-5xl md:text-7xl mb-2">{match.player1_flag}</div>
            <div className="font-heading text-2xl md:text-4xl tracking-wider group-hover:text-[#FF3B30] transition-colors" data-testid="md-p1-name">{match.player1_name}</div>
            <div className="text-xs text-zinc-500 mt-1">{match.player1_country}</div>
          </Link>

          <div className="flex items-center gap-3 md:gap-6">
            <span className="font-heading text-6xl md:text-8xl tabular-nums" data-testid="md-score-p1">
              {match.status === "scheduled" ? "—" : match.score_p1}
            </span>
            <span className="text-zinc-600 font-heading text-4xl md:text-6xl">:</span>
            <span className="font-heading text-6xl md:text-8xl tabular-nums" data-testid="md-score-p2">
              {match.status === "scheduled" ? "—" : match.score_p2}
            </span>
          </div>

          <Link to={`/player/${match.player2_id}`} className="text-center md:text-left group">
            <div className="text-5xl md:text-7xl mb-2">{match.player2_flag}</div>
            <div className="font-heading text-2xl md:text-4xl tracking-wider group-hover:text-[#FF3B30] transition-colors" data-testid="md-p2-name">{match.player2_name}</div>
            <div className="text-xs text-zinc-500 mt-1">{match.player2_country}</div>
          </Link>
        </div>

        {match.sets && match.sets.length > 0 && (
          <div className="mt-8 grid grid-cols-[auto_1fr] gap-4 items-center">
            <span className="tt-overline">Sets</span>
            <div className="flex flex-wrap gap-3 font-mono text-sm">
              {match.sets.map((s, i) => (
                <span key={i} className="px-3 py-1 border border-white/10 bg-white/[0.02]">{s[0]}-{s[1]}</span>
              ))}
              {match.status === "live" && (
                <span className="px-3 py-1 border border-[#FF3B30] text-[#FF3B30] bg-[#FF3B30]/5">
                  {match.current_set_p1}-{match.current_set_p2}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center gap-4 text-xs text-zinc-500 font-mono">
          <span>{new Date(match.scheduled_at).toLocaleString("fr-FR")}</span>
          {match.venue && <span>· {match.venue}</span>}
        </div>
      </section>

      {match.rubbers && match.rubbers.length > 0 && (
        <section data-testid="match-rubbers">
          <h2 className="font-heading text-3xl tracking-wider mb-4">RUBBERS INDIVIDUELS</h2>
          <div className="border border-white/5">
            <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 px-4 py-2 tt-overline border-b border-white/5 bg-white/[0.02]">
              <span>{match.player1_name}</span>
              <span className="text-center">SCORE</span>
              <span>{match.player2_name}</span>
              <span className="text-right">SETS</span>
            </div>
            {match.rubbers.map((r, i) => {
              const winnerP1 = r.score_p1 > r.score_p2;
              return (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02]"
                  data-testid={`rubber-${i}`}
                >
                  <span className={`font-bold tracking-tight ${winnerP1 ? "text-white" : "text-zinc-500"}`}>
                    {r.player1_name}
                  </span>
                  <span className="font-mono font-bold text-lg tabular-nums">
                    {r.score_p1}–{r.score_p2}
                  </span>
                  <span className={`font-bold tracking-tight ${!winnerP1 && r.score_p2 > r.score_p1 ? "text-white" : "text-zinc-500"}`}>
                    {r.player2_name}
                  </span>
                  <span className="font-mono text-xs text-zinc-400 text-right">
                    {(r.sets || []).map((s, k) => `${s[0]}-${s[1]}`).join(", ")}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {match.stream_url && (
        <section data-testid="match-stream">
          <h2 className="font-heading text-3xl tracking-wider mb-3">RETRANSMISSION</h2>
          <div className="border border-white/5 aspect-video">
            <iframe
              src={match.stream_url}
              title="Match stream"
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="match-ai-section">
        <div className="tt-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-[#FF3B30]" />
            <h2 className="font-heading text-2xl tracking-wider">PRÉDICTION IA</h2>
          </div>
          {prediction ? (
            <div className="space-y-3" data-testid="prediction-result">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="tt-overline mb-1">{match.player1_name}</div>
                  <div className="font-heading text-4xl text-[#34C759]">{Math.round(prediction.player1_win_probability * 100)}%</div>
                </div>
                <div>
                  <div className="tt-overline mb-1">{match.player2_name}</div>
                  <div className="font-heading text-4xl text-[#FF3B30]">{Math.round(prediction.player2_win_probability * 100)}%</div>
                </div>
              </div>
              <div className="h-2 bg-white/5 overflow-hidden flex">
                <div className="bg-[#34C759]" style={{ width: `${prediction.player1_win_probability * 100}%` }} />
                <div className="bg-[#FF3B30]" style={{ width: `${prediction.player2_win_probability * 100}%` }} />
              </div>
              <div>
                <div className="tt-overline mb-1">Score prédit</div>
                <div className="text-base font-bold">{prediction.predicted_score}</div>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">{prediction.reasoning}</p>
            </div>
          ) : (
            <button
              onClick={generatePrediction}
              disabled={predLoading}
              className="w-full bg-[#FF3B30] hover:bg-[#FF5C53] disabled:opacity-50 text-white px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors"
              data-testid="generate-prediction-btn"
            >
              {predLoading ? "Analyse..." : "Générer une prédiction"}
            </button>
          )}
        </div>

        <div className="tt-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-[#FF3B30]" />
            <h2 className="font-heading text-2xl tracking-wider">RÉSUMÉ IA</h2>
          </div>
          {summary ? (
            <div className="space-y-3" data-testid="summary-result">
              <p className="text-sm text-zinc-200 leading-relaxed">{summary.summary}</p>
              {summary.highlights?.length > 0 && (
                <ul className="space-y-2 text-sm text-zinc-400">
                  {summary.highlights.map((h, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-[#FF3B30]">▸</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <button
              onClick={generateSummary}
              disabled={sumLoading}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 text-white px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors"
              data-testid="generate-summary-btn"
            >
              {sumLoading ? "Génération..." : "Générer un résumé"}
            </button>
          )}
        </div>
      </section>

      <section data-testid="match-h2h">
        <h2 className="font-heading text-3xl tracking-wider mb-4">FACE À FACE</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="tt-card p-4 text-center">
            <div className="tt-overline mb-1">{match.player1_name}</div>
            <div className="font-heading text-4xl">{p1Stats}</div>
          </div>
          <div className="tt-card p-4 text-center">
            <div className="tt-overline mb-1">{match.player2_name}</div>
            <div className="font-heading text-4xl">{p2Stats}</div>
          </div>
        </div>
        {h2h.length > 0 ? (
          <div className="border border-white/5">
            {h2h.slice(0, 8).map((m) => (
              <Link
                key={m.id}
                to={`/match/${m.id}`}
                className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm"
                data-testid={`h2h-row-${m.id}`}
              >
                <span className="text-zinc-400 font-mono text-xs">{new Date(m.scheduled_at).toLocaleDateString("fr-FR")}</span>
                <span className="text-zinc-300">{m.competition_name}</span>
                <span className="font-mono">{m.score_p1}-{m.score_p2}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="tt-card p-6 text-zinc-500 text-sm">Aucune confrontation passée.</div>
        )}
      </section>
    </div>
  );
}
