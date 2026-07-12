import { useState } from "react";
import { LogIn, Shield, MessageCircle } from "lucide-react";
import { supabase } from "./supabaseClient";

const isAdminRoute = new URLSearchParams(window.location.search).get("admin") === "true";

export default function AuthScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailFor = (u) => `${u.trim().toLowerCase()}@richuu.local`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Enter a username and password.");
      return;
    }
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailFor(username),
      password,
    });
    if (signInError) setError("Invalid username or password.");
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 font-sans"
      style={{ background: "radial-gradient(ellipse at top, #0f2a1a 0%, #081410 60%, #040a08 100%)" }}
    >
      <div
        className="w-full max-w-[320px] rounded-[28px] p-6"
        style={{
          background: "linear-gradient(180deg, rgba(34,197,94,0.08), rgba(4,10,8,0.4))",
          border: "1px solid rgba(34,197,94,0.25)",
          backdropFilter: "blur(10px)",
        }}
      >
        {isAdminRoute && (
          <div className="flex items-center justify-center gap-1.5 mb-3 text-green-300 text-[10px] tracking-widest uppercase font-bold">
            <Shield size={12} /> Admin Console
          </div>
        )}
        <h1 className="text-white text-xl font-bold text-center mb-1">Sign In</h1>
        <p className="text-white/40 text-xs text-center mb-6">Richuu</p>
        <p className="text-white/30 text-[11px] text-center mb-5">
          {isAdminRoute
            ? "Sign in with an admin account to continue."
            : "Accounts are created by an admin. Don't have one? Ask your admin."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoCapitalize="none"
            className="w-full bg-white/5 border border-white/15 rounded-full px-4 py-3 text-white text-sm placeholder-white/30 outline-none focus:border-green-400/60"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-white/5 border border-white/15 rounded-full px-4 py-3 text-white text-sm placeholder-white/30 outline-none focus:border-green-400/60"
          />

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-white font-bold text-sm py-3 rounded-full disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #22c55e, #84cc16)" }}
          >
            <LogIn size={15} />
            {loading ? "Please wait..." : "Sign In"}
          </button>
        </form>

        <a
          href="https://t.me/KINGRICHUUZ"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-1.5 text-white/40 text-[11px] border border-white/10 rounded-full py-1.5 hover:text-white/70 hover:border-white/25 transition-colors"
        >
          <MessageCircle size={11} /> Contact
        </a>
      </div>
    </div>
  );
}
