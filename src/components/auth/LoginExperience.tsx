"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import LanguageSelector from "@/i18n/LanguageSelector";
import { useI18n } from "@/i18n/LocaleProvider";
import { createClient } from "@/lib/supabase/client";

export default function LoginExperience({ signInFailed }: { signInFailed: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function callbackUrl() {
    return `${window.location.origin}/api/auth/callback?next=%2Fdashboard`;
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: callbackUrl() },
        });
        if (authError) throw authError;
        if (!data.session) {
          setNotice("Account created. Check your email to confirm your address, then sign in.");
          return;
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : t("login.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { error: authError } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl() },
      });
      if (authError) throw authError;
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : t("login.failed"));
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-7 shadow-soft sm:p-9">
        <div className="mb-7 flex justify-end"><LanguageSelector compact /></div>
        <Link href="/" className="flex items-center" aria-label={`FaidATech ${t("common.home")}`}>
          <Image src="/logo.webp" alt="FaidATech" width={661} height={354} priority className="h-auto w-[176px] rounded-lg bg-white p-1 object-contain" />
        </Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-faida-teal">{t("login.eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-faida-navy">{mode === "signup" ? "Create your account" : t("login.title")}</h1>
        <p className="mt-3 text-sm leading-6 text-faida-slate">{t("login.description")}</p>
        {signInFailed || error ? <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error || t("login.failed")}</p> : null}
        {notice ? <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p> : null}

        <form onSubmit={submitPassword} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-faida-navy">
            {t("settings.email")}
            <input type="email" name="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none transition focus:border-faida-teal focus:ring-4 focus:ring-teal-100" />
          </label>
          <label className="block text-sm font-semibold text-faida-navy">
            Password
            <input type="password" name="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none transition focus:border-faida-teal focus:ring-4 focus:ring-teal-100" />
          </label>
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center rounded-xl bg-faida-navy px-4 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60">
            {busy ? t("common.loading") : mode === "signup" ? "Create account" : t("login.submit")}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" /><span>or</span><span className="h-px flex-1 bg-slate-200" /></div>
        <button type="button" onClick={() => void signInWithGoogle()} disabled={busy} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-faida-navy transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60">
          <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full border border-slate-200 font-black text-blue-700">G</span>
          {t("common.continue")} with Google
        </button>
        <p className="mt-5 text-center text-sm text-faida-slate">
          {mode === "signin" ? "New to FaidATech?" : "Already have an account?"}{" "}
          <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setNotice(""); }} className="font-bold text-teal-800 underline underline-offset-2">
            {mode === "signin" ? "Create account" : t("common.signIn")}
          </button>
        </p>
        <p className="mt-5 text-center text-xs leading-5 text-slate-400">{t("login.securityNote")}</p>
      </section>
    </main>
  );
}
