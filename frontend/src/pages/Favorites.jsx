import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth.jsx";
import { Star } from "lucide-react";

export default function Favorites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favs, setFavs] = useState([]);
  const [players, setPlayers] = useState({});
  const [comps, setComps] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    (async () => {
      try {
        const r = await api.get("/favorites");
        setFavs(r.data);
        const playerIds = r.data.filter((f) => f.target_type === "player").map((f) => f.target_id);
        const compIds = r.data.filter((f) => f.target_type === "competition").map((f) => f.target_id);
        const playerData = {};
        const compData = {};
        await Promise.all([
          ...playerIds.map((pid) => api.get(`/players/${pid}`).then((res) => { playerData[pid] = res.data; }).catch(() => {})),
          ...compIds.map((cid) => api.get(`/competitions/${cid}`).then((res) => { compData[cid] = res.data; }).catch(() => {})),
        ]);
        setPlayers(playerData);
        setComps(compData);
      } catch {}
      setLoading(false);
    })();
  }, [user, navigate]);

  if (!user) return null;

  const playerFavs = favs.filter((f) => f.target_type === "player");
  const compFavs = favs.filter((f) => f.target_type === "competition");

  return (
    <div className="space-y-8 tt-fade-in" data-testid="favorites-page">
      <div className="flex items-center gap-3">
        <Star className="text-[#FFCC00]" size={32} fill="currentColor" />
        <h1 className="font-heading text-5xl md:text-6xl tracking-wider">FAVORIS</h1>
      </div>

      {loading ? (
        <div className="text-zinc-500">Chargement...</div>
      ) : favs.length === 0 ? (
        <div className="tt-card p-12 text-center">
          <p className="text-zinc-400 mb-4">Vous n'avez pas encore de favoris.</p>
          <Link to="/players" className="inline-block bg-[#FF3B30] hover:bg-[#FF5C53] text-white px-5 py-2.5 font-bold uppercase tracking-wider text-sm transition-colors">
            Découvrir des joueurs
          </Link>
        </div>
      ) : (
        <>
          {playerFavs.length > 0 && (
            <section data-testid="fav-players">
              <h2 className="font-heading text-3xl tracking-wider mb-4">JOUEURS ({playerFavs.length})</h2>
              <div className="border border-white/5">
                {playerFavs.map((f) => {
                  const p = players[f.target_id];
                  if (!p) return null;
                  return (
                    <Link key={f.id} to={`/player/${p.id}`} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 last:border-b-0">
                      <span className="text-2xl">{p.flag}</span>
                      <span className="flex-1 font-bold">{p.name}</span>
                      <span className="text-xs font-mono text-zinc-500">#{p.rank_world}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
          {compFavs.length > 0 && (
            <section data-testid="fav-comps">
              <h2 className="font-heading text-3xl tracking-wider mb-4">COMPÉTITIONS ({compFavs.length})</h2>
              <div className="border border-white/5">
                {compFavs.map((f) => {
                  const c = comps[f.target_id];
                  if (!c) return null;
                  return (
                    <Link key={f.id} to={`/competition/${c.id}`} className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 last:border-b-0">
                      <span className="font-bold">{c.name}</span>
                      <span className="text-xs font-mono text-zinc-500">{c.category}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
