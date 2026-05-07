import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth.jsx";
import { Search, Bell, User, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/", label: "Dashboard", testid: "nav-dashboard" },
  { to: "/live", label: "Live", testid: "nav-live" },
  { to: "/matches", label: "Matches", testid: "nav-matches" },
  { to: "/competitions", label: "Compétitions", testid: "nav-competitions" },
  { to: "/players", label: "Joueurs", testid: "nav-players" },
  { to: "/calendar", label: "Calendrier", testid: "nav-calendar" },
  { to: "/bracket-predictor", label: "Predictor", testid: "nav-bracket" },
];

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-2xl bg-[#0A0A0A]/85 border-b border-white/5"
      data-testid="app-header"
    >
      <div className="w-full max-w-screen-2xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group" data-testid="logo-link">
            <div className="w-8 h-8 bg-[#FF3B30] flex items-center justify-center font-heading text-xl">
              T
            </div>
            <span className="font-heading text-2xl tracking-wider hidden sm:block">
              TT <span className="text-[#FF3B30]">PRO</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1" data-testid="main-nav">
            {navItems.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === "/"}
                data-testid={it.testid}
                className={({ isActive }) =>
                  `px-3 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
                    isActive
                      ? "text-white border-b-2 border-[#FF3B30]"
                      : "text-zinc-400 hover:text-white"
                  }`
                }
              >
                {it.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/search")}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            data-testid="header-search-btn"
            aria-label="Search"
          >
            <Search size={18} />
          </button>
          <button
            onClick={() => navigate("/notifications")}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors relative"
            data-testid="header-notifications-btn"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#FF3B30] rounded-full" />
          </button>

          {user ? (
            <div className="hidden md:flex items-center gap-2 ml-2">
              <button
                onClick={() => navigate("/favorites")}
                className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                data-testid="header-favorites-btn"
              >
                Favoris
              </button>
              <div className="flex items-center gap-2 px-3 py-2 border border-white/10 bg-white/[0.02]">
                <User size={14} className="text-zinc-400" />
                <span className="text-xs font-bold uppercase tracking-wider" data-testid="header-user-name">{user.name}</span>
              </div>
              <button
                onClick={logout}
                className="p-2 text-zinc-400 hover:text-[#FF3B30] hover:bg-white/5 transition-colors"
                data-testid="header-logout-btn"
                aria-label="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 ml-2">
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/5 transition-colors"
                data-testid="header-login-btn"
              >
                Connexion
              </button>
              <button
                onClick={() => navigate("/register")}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#FF3B30] text-white hover:bg-[#FF5C53] transition-colors"
                data-testid="header-register-btn"
              >
                S'inscrire
              </button>
            </div>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden p-2 text-zinc-300"
            data-testid="header-mobile-toggle"
            aria-label="Menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-white/5 bg-[#0A0A0A]" data-testid="mobile-nav">
          <div className="flex flex-col py-2">
            {navItems.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === "/"}
                onClick={() => setOpen(false)}
                data-testid={`mobile-${it.testid}`}
                className={({ isActive }) =>
                  `px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
                    isActive ? "text-white bg-white/5 border-l-2 border-[#FF3B30]" : "text-zinc-400"
                  }`
                }
              >
                {it.label}
              </NavLink>
            ))}
            {!user && (
              <div className="flex gap-2 p-4 border-t border-white/5">
                <button onClick={() => { setOpen(false); navigate("/login"); }} className="flex-1 px-4 py-2 text-xs font-bold uppercase tracking-wider border border-white/10 text-white" data-testid="mobile-login-btn">Connexion</button>
                <button onClick={() => { setOpen(false); navigate("/register"); }} className="flex-1 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#FF3B30] text-white" data-testid="mobile-register-btn">S'inscrire</button>
              </div>
            )}
            {user && (
              <div className="flex gap-2 p-4 border-t border-white/5">
                <button onClick={() => { setOpen(false); navigate("/favorites"); }} className="flex-1 px-4 py-2 text-xs font-bold uppercase tracking-wider border border-white/10" data-testid="mobile-favorites-btn">Favoris</button>
                <button onClick={() => { setOpen(false); logout(); }} className="flex-1 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#FF3B30] text-white" data-testid="mobile-logout-btn">Déconnexion</button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
