import { useState, useEffect, useCallback } from "react";
import { api } from "./api";

export function useFavorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const token = localStorage.getItem("tt_token");
    if (!token) { setFavorites([]); return; }
    setLoading(true);
    try {
      const r = await api.get("/favorites");
      setFavorites(r.data);
    } catch { setFavorites([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const isFav = (type, id) => favorites.some((f) => f.target_type === type && f.target_id === id);

  const toggle = async (type, id) => {
    const token = localStorage.getItem("tt_token");
    if (!token) return { needAuth: true };
    if (isFav(type, id)) {
      await api.delete(`/favorites/${type}/${id}`);
    } else {
      await api.post("/favorites", { target_type: type, target_id: id });
    }
    await load();
    return { needAuth: false };
  };

  return { favorites, loading, isFav, toggle, refresh: load };
}
