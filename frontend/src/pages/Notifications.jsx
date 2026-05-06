import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Bell } from "lucide-react";

export default function Notifications() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/notifications").then((r) => setNotes(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 tt-fade-in" data-testid="notifications-page">
      <div className="flex items-center gap-3">
        <Bell className="text-[#FF3B30]" />
        <h1 className="font-heading text-5xl md:text-6xl tracking-wider">NOTIFICATIONS</h1>
      </div>
      {loading ? (
        <div className="text-zinc-500">Chargement...</div>
      ) : notes.length === 0 ? (
        <div className="tt-card p-12 text-center text-zinc-500">Aucune notification.</div>
      ) : (
        <div className="border border-white/5">
          {notes.map((n) => (
            <div key={n.id} className="px-4 py-4 border-b border-white/5 last:border-b-0 hover:bg-white/5" data-testid={`notif-${n.id}`}>
              <div className="flex items-start justify-between gap-3 mb-1">
                <span className="font-bold">{n.title}</span>
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">{new Date(n.created_at).toLocaleDateString("fr-FR")}</span>
              </div>
              <p className="text-sm text-zinc-400">{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
