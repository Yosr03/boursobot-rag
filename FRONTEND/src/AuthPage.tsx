import { useState } from "react"

export interface AuthUser {
  id: number
  name: string
  email: string
  role: "user" | "admin"
}
interface Props { onLogin: (user: AuthUser) => void }
type View = "login" | "signup" | "forgot"

/* ── Toast ─────────────────────────────────────────────────────── */
interface ToastItem { id: string; msg: string; icon: string; type?: string }

function ToastLayer({ items, remove }: { items: ToastItem[]; remove: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-4 z-[300] flex flex-col items-end gap-2">
      {items.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto flex min-w-[220px] items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl"
          style={{ background: t.type === "error" ? "#EF4444" : "#003883", animation: "slideIn .22s ease-out" }}
        >
          <span className="text-base leading-none">{t.icon}</span>
          <span className="flex-1">{t.msg}</span>
          <button onClick={() => remove(t.id)} className="ml-1 opacity-60 hover:opacity-100 transition-opacity">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      ))}
    </div>
  )
}

/* ── Input field ───────────────────────────────────────────────── */
function Field({
  label, value, onChange, type = "text", placeholder, error, suffix, autoComplete, onKeyDown,
}: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; error?: string
  suffix?: React.ReactNode; autoComplete?: string
  onKeyDown?: (e: React.KeyboardEvent) => void
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[#1E293B]">{label}</label>
      <div
        className="flex items-center overflow-hidden rounded-xl border bg-white transition-all duration-200"
        style={{
          borderColor: error ? "#EF4444" : focused ? "#003883" : "#E2E8F0",
          boxShadow: error
            ? "0 0 0 3px rgba(239,68,68,0.1)"
            : focused
            ? "0 0 0 3px rgba(0,56,131,0.1)"
            : "none",
        }}
      >
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent px-4 py-3 text-sm text-[#1E293B] outline-none placeholder-gray-300"
        />
        {suffix}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-red-500">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </p>
      )}
    </div>
  )
}

/* ── Eye toggle ────────────────────────────────────────────────── */
function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mr-3 flex-shrink-0 text-gray-300 transition-colors hover:text-[#003883]"
    >
      {show ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  )
}

/* ── Checkbox ──────────────────────────────────────────────────── */
function Checkbox({ checked, onChange, label, error }: { checked: boolean; onChange: () => void; label: React.ReactNode; error?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex cursor-pointer items-start gap-2.5">
        <button
          type="button"
          onClick={onChange}
          className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition-all duration-150"
          style={{
            borderColor: error ? "#EF4444" : checked ? "#003883" : "#CBD5E1",
            background: checked ? "linear-gradient(135deg,#003883,#d20073)" : "white",
          }}
        >
          {checked && (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          )}
        </button>
        <span className="text-xs text-[#64748B] leading-relaxed">{label}</span>
      </label>
      {error && <p className="text-[11px] text-red-500 ml-6">{error}</p>}
    </div>
  )
}

/* ── Gradient button ───────────────────────────────────────────── */
function GradBtn({ children, onClick, loading, disabled }: { children: React.ReactNode; onClick?: () => void; loading?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
      style={{ background: "linear-gradient(135deg,#003883,#d20073)" }}
    >
      {loading ? (
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      ) : children}
    </button>
  )
}

/* ── Divider ───────────────────────────────────────────────────── */
function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-[#E2E8F0]" />
      <span className="text-xs text-gray-400 font-medium">ou</span>
      <div className="flex-1 h-px bg-[#E2E8F0]" />
    </div>
  )
}

/* ── Social button ─────────────────────────────────────────────── */
function SocialBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E2E8F0] bg-white py-2.5 text-sm font-medium text-[#1E293B] transition-all hover:border-[#003883]/30 hover:bg-[#F4F6F9] hover:shadow-sm active:scale-[0.98]"
    >
      {icon}
      {label}
    </button>
  )
}

/* ── Left decorative panel ─────────────────────────────────────── */
function LeftPanel() {
  const features = [
    { icon: "📊", text: "Analyse de portefeuille en temps réel" },
    { icon: "🤖", text: "Conseils IA disponibles 24h/24" },
    { icon: "🔒", text: "Données sécurisées par BoursoBank" },
  ]
  const stats = [
    { value: "2M+", label: "Clients actifs", delay: "0s" },
    { value: "⭐ 4.9", label: "Satisfaction", delay: "0.6s" },
  ]
  return (
    <div
      className="relative hidden overflow-hidden md:flex md:w-[44%] flex-col justify-between p-10 lg:p-14"
      style={{ background: "linear-gradient(145deg,#003883 0%,#1a1a6e 40%,#6b0035 75%,#d20073 100%)" }}
    >
      {/* Decorative circles */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-10" style={{ background: "radial-gradient(circle,#fff,transparent)" }} />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full opacity-10" style={{ background: "radial-gradient(circle,#fff,transparent)" }} />
      <div className="absolute right-10 bottom-32 h-32 w-32 rounded-full opacity-5" style={{ background: "radial-gradient(circle,#fff,transparent)" }} />

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
          <BotIconLeft />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">BoursoBot</span>
      </div>

      {/* Hero text */}
      <div className="relative z-10 my-10">
        <h2 className="mb-4 text-3xl font-bold leading-tight text-white lg:text-4xl">
          Votre assistant<br />financier IA
        </h2>
        <p className="mb-8 text-sm leading-relaxed text-white/70">
          Analysez, simulez et optimisez vos finances grâce à l'intelligence artificielle de BoursoBank.
        </p>
        <div className="space-y-3">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/15">
                <span className="text-sm">{f.icon}</span>
              </div>
              <span className="text-sm text-white/85 font-medium">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating stat cards */}
      <div className="relative z-10 flex flex-col gap-3">
        {stats.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm border border-white/10"
            style={{ animation: `float${i + 1} ${2.5 + i * 0.5}s ease-in-out infinite`, animationDelay: s.delay }}
          >
            <div>
              <p className="text-lg font-bold text-white leading-none">{s.value}</p>
              <p className="text-[11px] text-white/60 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════ */
/*  AuthPage                                                       */
/* ══════════════════════════════════════════════════════════════ */
export default function AuthPage({ onLogin }: Props) {
  const [view, setView] = useState<View>("login")
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [errs, setErrs] = useState<Record<string, string>>({})

  /* Login */
  const [lEmail, setLEmail] = useState("")
  const [lPwd, setLPwd] = useState("")
  const [lShowPwd, setLShowPwd] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  /* Signup */
  const [sFirst, setSFirst] = useState("")
  const [sLast, setSLast] = useState("")
  const [sEmail, setSEmail] = useState("")
  const [sPwd, setSPwd] = useState("")
  const [sShowPwd, setSShowPwd] = useState(false)
  const [sConfirm, setSConfirm] = useState("")
  const [sShowConfirm, setSShowConfirm] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)

  /* Forgot */
  const [fEmail, setFEmail] = useState("")

  const addToast = (msg: string, icon = "✓", type?: string) => {
    const id = Date.now().toString()
    setToasts(p => [...p, { id, msg, icon, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }
  const removeToast = (id: string) => setToasts(p => p.filter(t => t.id !== id))

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  const pwdStrength = (p: string) => {
    if (!p) return 0
    let s = p.length >= 8 ? 1 : 0
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return Math.min(s + (p.length >= 6 ? 1 : 0), 4)
  }

  const switchView = (v: View) => { setView(v); setErrs({}); setLoading(false) }

  /* ── Handlers ─ */
  const handleLogin = async () => {
  const e: Record<string, string> = {}

  if (!lEmail.trim()) {
    e.lEmail = "L'adresse email est requise"
  } else if (!isValidEmail(lEmail)) {
    e.lEmail = "Format d'email invalide"
  }

  if (!lPwd) {
    e.lPwd = "Le mot de passe est requis"
  } else if (lPwd.length < 6) {
    e.lPwd = "Minimum 6 caractères"
  }

  setErrs(e)

  if (Object.keys(e).length > 0) {
    return
  }

  setLoading(true)

  try {
    const response = await fetch(
      "http://127.0.0.1:8000/api/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: lEmail.trim().toLowerCase(),
          password: lPwd,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.detail || "Adresse email ou mot de passe incorrect."
      )
    }

    console.log("Utilisateur connecté :", data.user)

    addToast("Connexion réussie !", "✓")

    onLogin({
      id: data.user.id,
      name:
        data.user.username ||
        `${data.user.first_name || ""} ${data.user.last_name || ""}`.trim(),
      email: data.user.email,
      role: data.user.role === "admin" ? "admin" : "user",
    })

  } catch (error) {
    console.error("Erreur login :", error)

    addToast(
      error instanceof Error
        ? error.message
        : "Erreur lors de la connexion.",
      "!",
      "error"
    )

  } finally {
    setLoading(false)
  }
}

  const handleSignup = async () => {
  const e: Record<string, string> = {}

  if (!sFirst.trim()) e.sFirst = "Prénom requis"
  if (!sLast.trim()) e.sLast = "Nom requis"

  if (!sEmail.trim()) {
    e.sEmail = "Email requis"
  } else if (!isValidEmail(sEmail)) {
    e.sEmail = "Format d'email invalide"
  }

  if (!sPwd) {
    e.sPwd = "Mot de passe requis"
  } else if (sPwd.length < 8) {
    e.sPwd = "Minimum 8 caractères"
  }

  if (!sConfirm) {
    e.sConfirm = "Confirmez votre mot de passe"
  } else if (sConfirm !== sPwd) {
    e.sConfirm = "Les mots de passe ne correspondent pas"
  }

  if (!acceptTerms) {
    e.terms = "Vous devez accepter les conditions d'utilisation"
  }

  setErrs(e)

  if (Object.keys(e).length > 0) {
    return
  }

  setLoading(true)

  try {
    const response = await fetch("http://127.0.0.1:8000/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name: sFirst.trim(),
        last_name: sLast.trim(),
        email: sEmail.trim().toLowerCase(),
        password: sPwd,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.detail || "Erreur lors de la création du compte."
      )
    }

    addToast("Compte créé avec succès !", "✓")

    // Connexion automatique après inscription
    onLogin({
      id: data.user.id,
      name:
        data.user.username ||
        `${data.user.first_name || ""} ${data.user.last_name || ""}`.trim(),
      email: data.user.email,
      role: "user",
    })
  } catch (error) {
    console.error("Erreur signup :", error)

    addToast(
      error instanceof Error
        ? error.message
        : "Erreur lors de la création du compte.",
      "!",
      "error"
    )

  } finally {
    setLoading(false)
  }
}

  const handleForgot = () => {
    const e: Record<string, string> = {}
    if (!fEmail) e.fEmail = "Email requis"
    else if (!isValidEmail(fEmail)) e.fEmail = "Format d'email invalide"
    setErrs(e)
    if (Object.keys(e).length) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      addToast("Email de réinitialisation envoyé !", "📧")
      switchView("login")
      setFEmail("")
    }, 1300)
  }

  const strength = pwdStrength(sPwd)
  const strengthColor = ["", "#EF4444", "#F97316", "#EAB308", "#22C55E"][strength] || ""
  const strengthLabel = ["", "Très faible", "Faible", "Moyen", "Fort"][strength] || ""

  return (
    <div className="flex h-full w-full" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <ToastLayer items={toasts} remove={removeToast} />

      {/* Left panel */}
      <LeftPanel />

      {/* Right panel */}
      <div className="flex flex-1 flex-col overflow-y-auto bg-white">
        {/* Mobile header strip */}
        <div
          className="flex flex-shrink-0 items-center gap-3 px-6 py-5 md:hidden"
          style={{ background: "linear-gradient(135deg,#003883,#d20073)" }}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
            <BotIconLeft />
          </div>
          <span className="text-lg font-bold text-white">BoursoBot</span>
        </div>

        {/* Form container */}
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-[400px]">

            {/* Logo for desktop */}
            <div className="mb-8 hidden items-center gap-2 md:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg,#003883,#d20073)" }}>
                <BotIconSm />
              </div>
              <span className="font-bold text-[#003883]">BoursoBot</span>
            </div>

            {/* ══ LOGIN VIEW ══ */}
            {view === "login" && (
              <div>
                <h1 className="mb-1 text-2xl font-bold text-[#1E293B]">Bonjour 👋</h1>
                <p className="mb-7 text-sm text-gray-400">Connectez-vous à votre assistant financier</p>

                {/* Tabs */}
                <div className="mb-6 flex rounded-xl border border-[#E2E8F0] bg-[#F4F6F9] p-1">
                  <button
                    className="flex-1 rounded-lg py-2 text-sm font-semibold text-white transition-all"
                    style={{ background: "linear-gradient(135deg,#003883,#d20073)" }}
                  >
                    Connexion
                  </button>
                  <button
                    onClick={() => switchView("signup")}
                    className="flex-1 rounded-lg py-2 text-sm font-semibold text-gray-400 transition-all hover:text-[#003883]"
                  >
                    Inscription
                  </button>
                </div>

                <div className="space-y-4">
                  <Field
                    label="Adresse email"
                    value={lEmail}
                    onChange={v => { setLEmail(v); setErrs(p => ({ ...p, lEmail: "" })) }}
                    type="email"
                    placeholder="jean.dupont@email.com"
                    error={errs.lEmail}
                    autoComplete="email"
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                  />
                  <Field
                    label="Mot de passe"
                    value={lPwd}
                    onChange={v => { setLPwd(v); setErrs(p => ({ ...p, lPwd: "" })) }}
                    type={lShowPwd ? "text" : "password"}
                    placeholder="••••••••"
                    error={errs.lPwd}
                    autoComplete="current-password"
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    suffix={<EyeToggle show={lShowPwd} onToggle={() => setLShowPwd(p => !p)} />}
                  />
                  <div className="flex items-center justify-between">
                    <Checkbox checked={rememberMe} onChange={() => setRememberMe(p => !p)} label="Se souvenir de moi" />
                    <button
                      onClick={() => switchView("forgot")}
                      className="text-xs font-semibold text-[#003883] hover:text-[#d20073] transition-colors"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <GradBtn onClick={handleLogin} loading={loading}>Se connecter</GradBtn>
                </div>

                <p className="mt-6 text-center text-xs text-gray-400">
                  Pas encore de compte ?{" "}
                  <button onClick={() => switchView("signup")} className="font-semibold text-[#003883] hover:text-[#d20073] transition-colors">
                    Créer un compte
                  </button>
                </p>
              </div>
            )}

            {/* ══ SIGNUP VIEW ══ */}
            {view === "signup" && (
              <div>
                <h1 className="mb-1 text-2xl font-bold text-[#1E293B]">Créer un compte</h1>
                <p className="mb-7 text-sm text-gray-400">Rejoignez des milliers d'utilisateurs BoursoBank</p>

                {/* Tabs */}
                <div className="mb-6 flex rounded-xl border border-[#E2E8F0] bg-[#F4F6F9] p-1">
                  <button
                    onClick={() => switchView("login")}
                    className="flex-1 rounded-lg py-2 text-sm font-semibold text-gray-400 transition-all hover:text-[#003883]"
                  >
                    Connexion
                  </button>
                  <button
                    className="flex-1 rounded-lg py-2 text-sm font-semibold text-white transition-all"
                    style={{ background: "linear-gradient(135deg,#003883,#d20073)" }}
                  >
                    Inscription
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Prénom" value={sFirst} onChange={v => { setSFirst(v); setErrs(p => ({ ...p, sFirst: "" })) }} placeholder="Jean" error={errs.sFirst} autoComplete="given-name" />
                    <Field label="Nom" value={sLast} onChange={v => { setSLast(v); setErrs(p => ({ ...p, sLast: "" })) }} placeholder="Dupont" error={errs.sLast} autoComplete="family-name" />
                  </div>
                  <Field
                    label="Adresse email"
                    value={sEmail}
                    onChange={v => { setSEmail(v); setErrs(p => ({ ...p, sEmail: "" })) }}
                    type="email"
                    placeholder="jean.dupont@email.com"
                    error={errs.sEmail}
                    autoComplete="email"
                  />
                  <div className="flex flex-col gap-1.5">
                    <Field
                      label="Mot de passe"
                      value={sPwd}
                      onChange={v => { setSPwd(v); setErrs(p => ({ ...p, sPwd: "" })) }}
                      type={sShowPwd ? "text" : "password"}
                      placeholder="Minimum 8 caractères"
                      error={errs.sPwd}
                      autoComplete="new-password"
                      suffix={<EyeToggle show={sShowPwd} onToggle={() => setSShowPwd(p => !p)} />}
                    />
                    {sPwd && (
                      <div className="flex items-center gap-2">
                        <div className="flex flex-1 gap-1">
                          {[1, 2, 3, 4].map(i => (
                            <div
                              key={i}
                              className="h-1 flex-1 rounded-full transition-all duration-300"
                              style={{ background: i <= strength ? strengthColor : "#E2E8F0" }}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-semibold" style={{ color: strengthColor }}>{strengthLabel}</span>
                      </div>
                    )}
                  </div>
                  <Field
                    label="Confirmer le mot de passe"
                    value={sConfirm}
                    onChange={v => { setSConfirm(v); setErrs(p => ({ ...p, sConfirm: "" })) }}
                    type={sShowConfirm ? "text" : "password"}
                    placeholder="Répétez votre mot de passe"
                    error={errs.sConfirm}
                    autoComplete="new-password"
                    suffix={<EyeToggle show={sShowConfirm} onToggle={() => setSShowConfirm(p => !p)} />}
                  />
                  <Checkbox
                    checked={acceptTerms}
                    onChange={() => { setAcceptTerms(p => !p); setErrs(p => ({ ...p, terms: "" })) }}
                    error={errs.terms}
                    label={
                      <>
                        J'accepte les{" "}
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); addToast("Conditions d'utilisation ouvertes", "📄") }}
                          className="font-semibold text-[#003883] hover:underline"
                        >
                          conditions d'utilisation
                        </button>{" "}
                        et la{" "}
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); addToast("Politique de confidentialité ouverte", "🔒") }}
                          className="font-semibold text-[#003883] hover:underline"
                        >
                          politique de confidentialité
                        </button>
                      </>
                    }
                  />
                  <GradBtn onClick={handleSignup} loading={loading}>Créer mon compte</GradBtn>
                </div>

                <p className="mt-6 text-center text-xs text-gray-400">
                  Déjà un compte ?{" "}
                  <button onClick={() => switchView("login")} className="font-semibold text-[#003883] hover:text-[#d20073] transition-colors">
                    Se connecter
                  </button>
                </p>
              </div>
            )}

            {/* ══ FORGOT VIEW ══ */}
            {view === "forgot" && (
              <div>
                <button
                  onClick={() => switchView("login")}
                  className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-[#003883] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                  Retour à la connexion
                </button>

                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(135deg,#003883,#d20073)" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </div>

                <h1 className="mb-1 text-2xl font-bold text-[#1E293B]">Mot de passe oublié ?</h1>
                <p className="mb-7 text-sm text-gray-400 leading-relaxed">
                  Saisissez votre adresse email et nous vous enverrons un lien de réinitialisation.
                </p>

                <div className="space-y-4">
                  <Field
                    label="Adresse email"
                    value={fEmail}
                    onChange={v => { setFEmail(v); setErrs(p => ({ ...p, fEmail: "" })) }}
                    type="email"
                    placeholder="jean.dupont@email.com"
                    error={errs.fEmail}
                    autoComplete="email"
                    onKeyDown={e => e.key === "Enter" && handleForgot()}
                  />
                  <GradBtn onClick={handleForgot} loading={loading}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                    </svg>
                    Envoyer le lien
                  </GradBtn>
                </div>

                <p className="mt-6 text-center text-xs text-gray-400">
                  Vous vous souvenez de votre mot de passe ?{" "}
                  <button onClick={() => switchView("login")} className="font-semibold text-[#003883] hover:text-[#d20073] transition-colors">
                    Se connecter
                  </button>
                </p>
              </div>
            )}

            {/* Footer */}
            <p className="mt-10 text-center text-[10px] text-gray-300">
              © 2026 BoursoBank · Tous droits réservés ·{" "}
              <button onClick={() => addToast("Politique de confidentialité", "🔒")} className="hover:text-gray-400 transition-colors">
                Confidentialité
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Icons ─────────────────────────────────────────────────────── */
function BotIconLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="8" width="18" height="13" rx="3" stroke="white" strokeWidth="1.6"/>
      <path d="M8 8V6a4 4 0 0 1 8 0v2" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="9" cy="14" r="1.5" fill="white"/>
      <circle cx="15" cy="14" r="1.5" fill="white"/>
      <path d="M9.5 17.5s.833.5 2.5.5 2.5-.5 2.5-.5" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function BotIconSm() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="8" width="18" height="13" rx="3" stroke="white" strokeWidth="1.8"/>
      <path d="M8 8V6a4 4 0 0 1 8 0v2" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="9" cy="14" r="1.5" fill="white"/>
      <circle cx="15" cy="14" r="1.5" fill="white"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#1E293B]">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}