import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import MatchCard from "@/components/MatchCard";
import { useFavorites } from "@/lib/useFavorites";
import { useAuth } from "@/lib/auth.jsx";
import { Star, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const BG = "https://images.unsplash.com/photo-1774755458463-224dc3ca8331?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600";

export default function PlayerDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { isFav, toggle } = useFavorites();
  const [player, setPlayer] = useState(null);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [p, m] = await Promise.all([
          api.get(`/players/${id}`),
          api.get(`/players/${id}/matches`),
        ]);
        setPlayer(p.data);
        setMatches(m.data);
      } catch {}
    })();
  }, [id]);

  if (!player) return <div className="text-zinc-500">Chargement...</div>;

  const wins = matches.filter((m) => m.status === "finished" && (
    (m.player1_id === id && m.score_p1 > m.score_p2) || (m.player2_id === id && m.score_p2 > m.score_p1)
  )).length;
  const losses = matches.filter((m) => m.status === "finished" && (
    (m.player1_id === id && m.score_p1 < m.score_p2) || (m.player2_id === id && m.score_p2 < m.score_p1)
  )).length;
  const fav = isFav("player", id);

  return (
    <div className="space-y-8 tt-fade-in" data-testid="player-detail-page">
      <Link to="/players" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white" data-testid="back-to-players">
        <ArrowLeft size={14} /> Retour
      </Link>

      <section className="relative overflow-hidden border border-white/5">
        <div className="absolute inset-0 bg-cover bg-center opacity-15" style={{ backgroundImage: `url(${BG})` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/70 to-transparent" />
        <div className="relative p-6 md:p-10 grid grid-cols-1 md:grid-cols-[200px_1fr_auto] gap-6 items-end">
          <img src={player.photo_url} alt={player.name} className="w-32 h-32 md:w-44 md:h-44 border border-white/10 bg-[#1A1A1A]" data-testid="player-photo" />
          <div>
            <div className="flex items-center gap-3 tt-overline mb-2">
              <span>{player.flag} {player.country}</span>
              <span>·</span>
              <span>#{player.rank_world} mondial</span>
            </div>
            <h1 className="font-heading text-5xl md:text-7xl leading-none mb-3" data-testid="player-name">{player.name}</h1>
            <p className="text-zinc-300 max-w-2xl text-sm md:text-base">{player.bio}</p>
          </div>
          <button
            onClick={() => {
              const r = toggle("player", id);
              r.then?.((res) => { if (res?.needAuth) window.location.href = "/login"; });
            }}
            className={`px-5 py-3 font-bold uppercase tracking-wider text-sm transition-colors flex items-center gap-2 ${
              fav ? "bg-[#FFCC00] text-black" : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
            }`}
            data-testid="fav-player-btn"
          >
            <Star size={16} fill={fav ? "currentColor" : "none"} />
            {fav ? "Favori" : "Ajouter aux favoris"}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-4" data-testid="player-stats">
        <Stat label="Rang mondial" value={`#${player.rank_world}`} />
        <Stat label="Rang national" value={`#${player.rank_national}`} />
        <Stat label="Points" value={player.points?.toLocaleString()} />
        <Stat label="Victoires" value={wins} />
        <Stat label="Défaites" value={losses} />
      </section>

      <section data-testid="player-info">
        <h2 className="font-heading text-3xl tracking-wider mb-4">PROFIL</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoRow label="Année naissance" value={player.birth_year} />
          <InfoRow label="Main" value={player.handedness} />
          <InfoRow label="Style" value={player.style} />
        </div>
      </section>

      <section data-testid="player-matches">
        <h2 className="font-heading text-3xl tracking-wider mb-4">MATCHS RÉCENTS</h2>
        {matches.length === 0 ? (
          <div className="tt-card p-8 text-center text-zinc-500">Aucun match.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {matches.slice(0, 12).map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="tt-card p-4">
      <div className="tt-overline mb-1">{label}</div>
      <div className="font-heading text-3xl">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="tt-card p-4">
      <div className="tt-overline mb-2">{label}</div>
      <div className="text-base font-medium">{value || "—"}</div>
    </div>
  );
}
