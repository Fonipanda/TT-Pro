import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }

export default function CalendarPage() {
  const [matches, setMatches] = useState([]);
  const [comps, setComps] = useState([]);
  const [cursor, setCursor] = useState(new Date());

  useEffect(() => {
    api.get("/matches?limit=300").then((r) => setMatches(r.data)).catch(() => {});
    api.get("/competitions").then((r) => setComps(r.data)).catch(() => {});
  }, []);

  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const total = daysInMonth(cursor);
    const startDay = (first.getDay() + 6) % 7; // Monday=0
    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= total; d++) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    return cells;
  }, [cursor]);

  const matchesByDay = useMemo(() => {
    const map = {};
    for (const m of matches) {
      const d = new Date(m.scheduled_at);
      if (d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth()) {
        const k = d.getDate();
        map[k] = map[k] || [];
        map[k].push(m);
      }
    }
    return map;
  }, [matches, cursor]);

  const compsThisMonth = comps.filter((c) => {
    const s = new Date(c.start_date);
    const e = new Date(c.end_date);
    const ms = startOfMonth(cursor);
    const me = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    return e >= ms && s <= me;
  });

  return (
    <div className="space-y-6 tt-fade-in" data-testid="calendar-page">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-5xl md:text-6xl tracking-wider">CALENDRIER</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="p-2 border border-white/10 hover:bg-white/5"
            data-testid="cal-prev"
          ><ChevronLeft size={16} /></button>
          <span className="font-heading text-2xl tracking-wider min-w-[180px] text-center" data-testid="cal-month">
            {cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).toUpperCase()}
          </span>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="p-2 border border-white/10 hover:bg-white/5"
            data-testid="cal-next"
          ><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="border border-white/5">
        <div className="grid grid-cols-7 border-b border-white/5">
          {DAYS.map((d) => (
            <div key={d} className="px-3 py-2 tt-overline border-r border-white/5 last:border-r-0">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((cell, i) => {
            if (!cell) return <div key={i} className="min-h-[110px] border-r border-b border-white/5 last:border-r-0 bg-white/[0.01]" />;
            const dayMatches = matchesByDay[cell.getDate()] || [];
            const today = new Date();
            const isToday = cell.toDateString() === today.toDateString();
            return (
              <div
                key={i}
                className="min-h-[110px] p-2 border-r border-b border-white/5 last:border-r-0 hover:bg-white/[0.02]"
                data-testid={`cal-day-${cell.getDate()}`}
              >
                <div className={`text-xs font-mono mb-1 ${isToday ? "text-[#FF3B30] font-bold" : "text-zinc-500"}`}>
                  {cell.getDate()}
                </div>
                <div className="space-y-1">
                  {dayMatches.slice(0, 3).map((m) => (
                    <Link
                      key={m.id}
                      to={`/match/${m.id}`}
                      className={`block text-[11px] px-1.5 py-0.5 truncate ${
                        m.status === "live" ? "bg-[#FF3B30] text-white"
                          : m.status === "finished" ? "bg-white/5 text-zinc-500"
                          : "bg-white/5 text-zinc-300 hover:bg-white/10"
                      }`}
                    >
                      {m.player1_flag} vs {m.player2_flag} {m.player1_name.split(" ").pop()}
                    </Link>
                  ))}
                  {dayMatches.length > 3 && (
                    <div className="text-[10px] text-zinc-500">+{dayMatches.length - 3} autres</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {compsThisMonth.length > 0 && (
        <section data-testid="calendar-comps">
          <h2 className="font-heading text-3xl tracking-wider mb-4">COMPÉTITIONS DU MOIS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {compsThisMonth.map((c) => (
              <Link key={c.id} to={`/competition/${c.id}`} className="tt-card p-4">
                <div className="tt-overline mb-1">{c.category}</div>
                <div className="font-heading text-xl tracking-wider mb-1">{c.name}</div>
                <div className="text-xs font-mono text-zinc-500">
                  {new Date(c.start_date).toLocaleDateString("fr-FR")} → {new Date(c.end_date).toLocaleDateString("fr-FR")}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
