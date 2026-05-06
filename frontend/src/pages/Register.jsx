import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, pwd, name);
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.detail || "Inscription échouée");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center" data-testid="register-page">
      <form onSubmit={submit} className="tt-card p-8 w-full max-w-md space-y-5">
        <div>
          <div className="tt-overline mb-2 text-[#FF3B30]">Rejoignez TT Pro</div>
          <h1 className="font-heading text-4xl tracking-wider">CRÉER UN COMPTE</h1>
        </div>

        <div>
          <label className="tt-overline mb-1 block">Nom</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 px-3 py-2 focus:outline-none focus:border-[#FF3B30]"
            data-testid="register-name"
          />
        </div>

        <div>
          <label className="tt-overline mb-1 block">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 px-3 py-2 focus:outline-none focus:border-[#FF3B30]"
            data-testid="register-email"
          />
        </div>

        <div>
          <label className="tt-overline mb-1 block">Mot de passe (min. 6)</label>
          <input
            type="password"
            required
            minLength={6}
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="w-full bg-white/5 border border-white/10 px-3 py-2 focus:outline-none focus:border-[#FF3B30]"
            data-testid="register-password"
          />
        </div>

        {error && <div className="text-[#FF3B30] text-sm" data-testid="register-error">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#FF3B30] hover:bg-[#FF5C53] disabled:opacity-50 text-white px-4 py-3 font-bold uppercase tracking-wider text-sm transition-colors"
          data-testid="register-submit"
        >
          {loading ? "Création..." : "Créer mon compte"}
        </button>

        <p className="text-sm text-zinc-400 text-center">
          Déjà inscrit ? <Link to="/login" className="text-white underline" data-testid="register-to-login">Connectez-vous</Link>
        </p>
      </form>
    </div>
  );
}
