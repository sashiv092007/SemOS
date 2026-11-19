"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CloudCheck, CloudOff, FileText, LoaderCircle, LogOut, NotebookPen, Route } from "lucide-react";
import { authProviders, signIn, signInWithGoogle, signOut, signUp, useAccount } from "@/lib/account";
import { usePlan } from "@/lib/plan";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600";
const INPUT = `w-full rounded-xl border border-[#5b1065]/15 bg-white px-4 py-3 text-sm text-[#3b0a45] placeholder:text-slate-400 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-200`;
const BTN = `inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors duration-150 disabled:cursor-progress disabled:opacity-70 ${FOCUS}`;

const SAVED = [
  { icon: Route, title: "Your roadmap", text: "The plan, its deadline and every hour you log, on any device.", tint: "bg-yellow-200 text-yellow-900" },
  { icon: FileText, title: "Mastersheets", text: "Each sheet the AI builds is kept so you can reopen it later.", tint: "bg-pink-200 text-pink-900" },
  { icon: NotebookPen, title: "Notes", text: "Notes built from your photos and PDFs stay in your library.", tint: "bg-emerald-200 text-emerald-900" },
];

export default function AccountPanel() {
  const { status, user, sync } = useAccount();
  const plan = usePlan();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [google, setGoogle] = useState(false);

  useEffect(() => {
    let live = true;
    authProviders().then((p) => live && setGoogle(p.google));
    return () => {
      live = false;
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    setNotice("");
    if (!email.trim() || password.length < 6) {
      setError(password.length < 6 ? "Use a password of at least 6 characters." : "Enter your email.");
      return;
    }
    setBusy(true);
    const result = mode === "in" ? await signIn(email.trim(), password) : await signUp(email.trim(), password, name.trim());
    setBusy(false);
    if (result === "confirm") setNotice(`Almost done: open the link we sent to ${email.trim()} to confirm your account, then sign in.`);
    else if (result) setError(result);
    else setPassword("");
  };

  const google_ = async () => {
    setBusy(true);
    const err = await signInWithGoogle();
    if (err) {
      setBusy(false);
      setError(err);
    }
  };

  return (
    <div className="mx-auto mt-8 grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#5b1065] p-8 text-white shadow-[0_30px_60px_-30px_rgba(91,16,101,0.8)] sm:p-10">
        <span aria-hidden="true" className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-fuchsia-400/30 blur-2xl" />
        <span aria-hidden="true" className="absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-yellow-300/20 blur-2xl" />
        <p className="relative font-mono text-xs uppercase tracking-[0.2em] text-yellow-200">Your SemOS account</p>
        <h1 className="relative mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          {user ? `Hi, ${user.name}` : "Keep your semester in one place"}
        </h1>
        <p className="relative mt-3 max-w-md text-sm leading-relaxed text-fuchsia-100">
          {user
            ? "Everything below is saved to your account and follows you to every device you sign in on."
            : "Sign in to keep your roadmap, mastersheets and notes safe and open them on your phone, laptop or the lab computer."}
        </p>
        <ul className="relative mt-8 grid gap-3">
          {SAVED.map((s) => (
            <li key={s.title} className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${s.tint}`}>
                <s.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-semibold">{s.title}</span>
                <span className="block text-sm text-fuchsia-100">{s.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[2rem] bg-white p-8 shadow-[0_20px_50px_-30px_rgba(91,16,101,0.45)] ring-1 ring-[#5b1065]/10 sm:p-10">
        {status === "loading" ? (
          <p className="flex items-center gap-2 text-sm text-slate-500" role="status">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Checking your account…
          </p>
        ) : user ? (
          <div className="flex h-full flex-col">
            <h2 className="text-xl font-bold text-[#3b0a45]">Signed in</h2>
            <p className="mt-1 break-all text-sm text-slate-500">{user.email}</p>

            <div className="mt-6 rounded-2xl bg-[#faf5fb] p-5 ring-1 ring-[#5b1065]/10" role="status">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#3b0a45]">
                {sync === "error" ? (
                  <CloudOff className="h-4 w-4 text-red-500" aria-hidden="true" />
                ) : sync === "syncing" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin text-fuchsia-600" aria-hidden="true" />
                ) : (
                  <CloudCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                )}
                {sync === "error" ? "Could not reach your account" : sync === "syncing" ? "Saving…" : "All changes saved"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {plan
                  ? `Roadmap: ${plan.items.length} ${plan.items.length === 1 ? "assignment" : "assignments"} over ${plan.days} ${plan.days === 1 ? "day" : "days"}.`
                  : "No roadmap yet."}{" "}
                {sync === "error" ? "Your changes are kept in this browser and sent up when the connection is back." : ""}
              </p>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Link href="/roadmap" className={`${BTN} bg-yellow-200 text-yellow-900 hover:bg-yellow-300`}>Roadmap</Link>
              <Link href="/mastersheet" className={`${BTN} bg-pink-200 text-pink-900 hover:bg-pink-300`}>Mastersheets</Link>
              <Link href="/note-builder" className={`${BTN} bg-emerald-200 text-emerald-900 hover:bg-emerald-300`}>Notes</Link>
            </div>

            <button
              type="button"
              onClick={async () => {
                setBusy(true);
                await signOut();
                setBusy(false);
              }}
              disabled={busy}
              className={`${BTN} mt-auto bg-[#3b0a45] text-white hover:bg-[#5b1065] lg:mt-10`}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
            <p className="mt-2 text-center text-xs text-slate-500">Signing out removes your plan from this browser. It stays in your account.</p>
          </div>
        ) : (
          <>
            <div role="tablist" aria-label="Sign in or create an account" className="grid grid-cols-2 rounded-xl bg-[#faf5fb] p-1 ring-1 ring-[#5b1065]/10">
              {(["in", "up"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => {
                    setMode(m);
                    setError("");
                    setNotice("");
                  }}
                  className={`rounded-lg py-2.5 text-sm font-semibold transition-colors duration-150 ${FOCUS} ${
                    mode === m ? "bg-[#5b1065] text-white shadow-sm" : "text-slate-500 hover:text-[#5b1065]"
                  }`}
                >
                  {m === "in" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            {google ? (
              <>
                <button type="button" onClick={google_} disabled={busy} className={`${BTN} mt-6 bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50`}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
                    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z" />
                    <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.9l4-3.1z" />
                    <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
                  </svg>
                  Continue with Google
                </button>
                <p className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" /> or with email <span className="h-px flex-1 bg-slate-200" />
                </p>
              </>
            ) : (
              <div className="mt-6" />
            )}

            <form onSubmit={submit} className="grid gap-3" noValidate>
              {mode === "up" ? (
                <label className="grid gap-1.5 text-sm font-medium text-[#3b0a45]">
                  Your name
                  <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Asha" />
                </label>
              ) : null}
              <label className="grid gap-1.5 text-sm font-medium text-[#3b0a45]">
                Email
                <input
                  className={INPUT}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@college.edu"
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-[#3b0a45]">
                Password
                <input
                  className={INPUT}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "in" ? "current-password" : "new-password"}
                  placeholder={mode === "in" ? "Your password" : "At least 6 characters"}
                  minLength={6}
                  required
                />
              </label>

              {error ? (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
                  {error}
                </p>
              ) : null}
              {notice ? (
                <p role="status" className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">
                  {notice}
                </p>
              ) : null}

              <button type="submit" disabled={busy} className={`${BTN} mt-2 bg-[#5b1065] text-white hover:bg-[#3b0a45]`}>
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {mode === "in" ? "Sign in" : "Create account"}
              </button>
            </form>
            <p className="mt-4 text-center text-xs text-slate-500">
              {plan ? "When you sign in, the newer of this browser's roadmap and your account's is kept." : "You can use every tool without an account too."}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
