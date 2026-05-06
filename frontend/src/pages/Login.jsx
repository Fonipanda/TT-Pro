import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, pwd);
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.detail || "Connexion échouée");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center" data-testid="login-page">
      <form onSubmit={submit} className="tt-card p-8 w-full max-w-md space-y-5">
        <div>
          <div className="tt-overline mb-2 text-[#FF3B30]">Espace membre</div>
          <h1 className="font-heading text-4xl tracking-wider">CONNEXION</h1>
        </div>

        <div>
          <label className="tt-overline mb-1 block">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 px-3 py-2 focus:outline-none focus:border-[#FF3B30]"
            data-testid="login-email"
          />
        </div>

        <div>
          <label className="tt-overline mb-1 block">Mot de passe</label>
          <input
            type="password"
            required
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="w-full bg-white/5 border border-white/10 px-3 py-2 focus:outline-none focus:border-[#FF3B30]"
            data-testid="login-password"
          />
        </div>

        {error && <div className="text-[#FF3B30] text-sm" data-testid="login-error">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#FF3B30] hover:bg-[#FF5C53] disabled:opacity-50 text-white px-4 py-3 font-bold uppercase tracking-wider text-sm transition-colors"
          data-testid="login-submit"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>

        <p className="text-sm text-zinc-400 text-center">
          Pas de compte ? <Link to="/register" className="text-white underline" data-testid="login-to-register">Inscrivez-vous</Link>
        </p>
      </form>
    </div>
  );
}
