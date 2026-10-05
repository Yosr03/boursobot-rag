import { useState, useMemo, useEffect } from "react"
import type { AuthUser } from "./AuthPage"

/* ── Types ───────────────────────────────────────────────────── */
type AdminView = "overview" | "documents" | "users" | "conversations" | "settings"

interface Doc {
  id: string; bank: string; product_family: string; source_url: string
  titre_page: string; groupe_offres: string; type_produit: string
  chunk_text: string; chunk_length: number; chunk_id: number
  addedAt: string; status: "active" | "draft"
}

interface AdminUser {
  id: string; name: string; email: string; role: "user" | "admin"
  status: "online" | "offline" | "away"; conversations: number
  joined: string; lastSeen: string; suspended: boolean; avatar: string
}

interface Convo {
  id: string; userName: string; userEmail: string; preview: string
  messages: number; date: string; duration: string; model: string; topic: string
}

interface Toast { id: string; msg: string; icon: string; type?: "success"|"info"|"warn"|"error" }

/* ── Mock data ───────────────────────────────────────────────── */

const USERS_DATA = [820,910,870,1020,1150,1080,1190,1260,1180,1310,1240,1380,1290,1420]
const FAM_COLORS: Record<string,string> = {
  credit:"#003883", placement_epargne:"#059669",
  placement_investissement:"#7c3aed", ouverture_compte:"#0891b2", other:"#94A3B8",
}
const FAM_LABELS: Record<string,string> = {
  credit:"Crédit", placement_epargne:"Épargne",
  placement_investissement:"Investissement", ouverture_compte:"Ouverture de compte", other:"Autre",
}
const normalizeFamily = (family:string) => {
  const value = (family || "").trim().toLowerCase()
  const aliases: Record<string,string> = {
    savings:"placement_epargne", insurance:"placement_epargne",
    investment:"placement_investissement", accounts:"ouverture_compte", autre:"other",
  }
  return aliases[value] || value
}
const STATUS_COLORS = { online:"#22C55E", away:"#F59E0B", offline:"#94A3B8" }
const STATUS_LABELS = { online:"En ligne", away:"Absent", offline:"Hors ligne" }

const EMPTY_DOC = (): Omit<Doc,"id"|"chunk_length"|"addedAt"> => ({
  bank:"BoursoBank", product_family:"credit", source_url:"",
  titre_page:"", groupe_offres:"", type_produit:"",
  chunk_text:"", chunk_id:0, status:"active",
})

/* ── Toast ───────────────────────────────────────────────────── */
function ToastLayer({ items, remove }: { items:Toast[]; remove:(id:string)=>void }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-4 z-[300] flex flex-col items-end gap-2">
      {items.map(t => (
        <div key={t.id} className="pointer-events-auto flex min-w-[220px] items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl"
          style={{ background: t.type==="error"?"#EF4444":t.type==="warn"?"#F59E0B":t.type==="info"?"#475569":"#003883", animation:"slideIn .22s ease-out" }}>
          <span className="text-base leading-none">{t.icon}</span>
          <span className="flex-1">{t.msg}</span>
          <button onClick={()=>remove(t.id)} className="opacity-60 hover:opacity-100"><XIcon size={13}/></button>
        </div>
      ))}
    </div>
  )
}

/* ── Modal ───────────────────────────────────────────────────── */
function Modal({ title, onClose, children, wide }: { title:string; onClose:()=>void; children:React.ReactNode; wide?:boolean }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className={`relative z-10 flex max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${wide?"w-full max-w-2xl":"w-full max-w-md"}`}>
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
          <h2 className="text-base font-bold text-[#1E293B]">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-[#F4F6F9] hover:text-[#1E293B] transition-colors"><XIcon size={16}/></button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}

/* ── Confirm modal ───────────────────────────────────────────── */
function Confirm({ msg, onOk, onClose, busy=false, autoClose=true }: { msg:string; onOk:()=>void; onClose:()=>void; busy?:boolean; autoClose?:boolean }) {
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>{if(!busy) onClose()}}/>
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
        </div>
        <p className="mb-6 text-center text-sm text-[#1E293B]">{msg}</p>
        <div className="flex gap-3">
          <button disabled={busy} onClick={()=>{if(!busy) onClose()}} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-semibold text-[#1E293B] hover:bg-[#F4F6F9] transition-colors">Annuler</button>
          <button disabled={busy} onClick={()=>{if(busy) return; onOk();if(autoClose) onClose()}} className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors">{busy ? "En cours..." : "Confirmer"}</button>
        </div>
      </div>
    </div>
  )
}

/* ── Charts ──────────────────────────────────────────────────── */
function BarChart({ data }: { data:{label:string;value:number}[] }) {
  const mx = Math.max(1, ...data.map(d=>d.value))
  return (
    <div className="flex h-36 items-end gap-1.5 w-full">
      {data.map((d,i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[9px] font-medium text-gray-400">{d.value>999?`${(d.value/1000).toFixed(1)}k`:d.value}</span>
          <div className="w-full rounded-t-md transition-all duration-700 hover:opacity-80 cursor-pointer"
            style={{ height:`${Math.max((d.value/mx)*110,4)}px`, background:i===data.length-1?"linear-gradient(to top,#003883,#d20073)":"#003883cc" }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-[9px] text-gray-400">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function AreaChart({ data, color="#003883" }: { data:number[]; color?:string }) {
  const values = data.map(v => Number.isFinite(v) ? v : 0)
  const mx = Math.max(...values), mn = Math.min(...values), rng = mx-mn||1
  const W=300, H=80
  const pts = values.map((v,i)=>({ x:(i/Math.max(1, values.length-1))*W, y:H-((v-mn)/rng)*H*0.75-8 }))
  const line = pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  if (!pts.length) return null
  const area = `${line} L${W},${H} L0,${H} Z`
  const gid = `ag${color.replace(/[^a-z0-9]/gi,"")}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{height:80}}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`}/>
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function DonutChart({ data }: { data:{label:string;value:number;color:string}[] }) {
  const total = data.reduce((s,d)=>s+d.value,0)
  const R=42, C=2*Math.PI*R
  let off=0
  return (
    <svg viewBox="0 0 120 120" style={{width:120,height:120}}>
      {data.map((d,i)=>{
        const pct=total ? d.value/total : 0, dash=pct*C, gap=C-dash
        const rot=(total ? off/total : 0)*360-90; off+=d.value
        return <circle key={i} cx="60" cy="60" r={R} fill="none" stroke={d.color} strokeWidth="16"
          strokeDasharray={`${dash.toFixed(2)} ${gap.toFixed(2)}`} transform={`rotate(${rot} 60 60)`}/>
      })}
      <circle cx="60" cy="60" r="32" fill="white"/>
      <text x="60" y="56" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1E293B">{total > 0 ? "100%" : "0%"}</text>
      <text x="60" y="70" textAnchor="middle" fontSize="8" fill="#94A3B8">total</text>
    </svg>
  )
}

/* ── Form field ──────────────────────────────────────────────── */
function FormField({ label, error, children }: { label:string; error?:string; children:React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[#1E293B]">{label}</label>
      {children}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}
function inp(focused:boolean,err?:string){ return `w-full rounded-xl border px-3 py-2.5 text-sm text-[#1E293B] outline-none transition-all placeholder-gray-300 ${err?"border-red-400 ring-1 ring-red-100":focused?"border-[#003883] ring-1 ring-[#003883]/10":"border-[#E2E8F0]"}` }

/* ── Stat card ───────────────────────────────────────────────── */
function StatCard({ label, value, trend, icon, sub, sparkline }:{label:string;value:string;trend:number;icon:string;sub:string;sparkline?:number[]}) {
  const up = trend>=0
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-[#1E293B]">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
      {sparkline && <AreaChart data={sparkline} color={up?"#22C55E":"#EF4444"}/>}
      <div className="flex items-center gap-2">
        <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${up?"bg-green-50 text-green-600":"bg-red-50 text-red-500"}`}>
          {up?"↑":"↓"} {Math.abs(trend)}%
        </span>
        <span className="text-[11px] text-gray-400">{sub}</span>
      </div>
    </div>
  )
}

/* ── Badge ───────────────────────────────────────────────────── */
function Badge({ color, label }: { color:string; label:string }) {
  return <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{backgroundColor:color}}>{label}</span>
}

/* ── Table search bar ────────────────────────────────────────── */
function SearchBar({ value, onChange, placeholder }: { value:string; onChange:(v:string)=>void; placeholder:string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 focus-within:border-[#003883] transition-colors">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="flex-1 bg-transparent text-sm text-[#1E293B] outline-none placeholder-gray-300"/>
      {value && <button onClick={()=>onChange("")} className="text-gray-300 hover:text-gray-500"><XIcon size={13}/></button>}
    </div>
  )
}

/* ── Action button ───────────────────────────────────────────── */
function ActBtn({ children, onClick, red, small, outline }: { children:React.ReactNode; onClick?:()=>void; red?:boolean; small?:boolean; outline?:boolean }) {
  if (outline) return (
    <button onClick={onClick} className={`flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white font-semibold text-[#1E293B] hover:border-[#003883] hover:text-[#003883] transition-all ${small?"px-3 py-1.5 text-xs":"px-4 py-2 text-sm"}`}>{children}</button>
  )
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] ${small?"px-3 py-1.5 text-xs":"px-4 py-2 text-sm"} ${red?"bg-red-500":""}`}
      style={!red?{background:"linear-gradient(135deg,#003883,#d20073)"}:{}}>{children}</button>
  )
}

/* ── Gradient button for submit ─────────────────────────────── */
function GradBtn({ children, onClick, loading }: { children:React.ReactNode; onClick:()=>void; loading?:boolean }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
      style={{background:"linear-gradient(135deg,#003883,#d20073)"}}>
      {loading ? <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> : children}
    </button>
  )
}

/* ── Toggle ─────────────────────────────────────────────────── */
function Toggle({ on, toggle }: { on:boolean; toggle:()=>void }) {
  return (
    <button onClick={toggle} className="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200"
      style={{background:on?"linear-gradient(135deg,#003883,#d20073)":"#CBD5E1"}}>
      <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{transform:on?"translateX(20px)":"translateX(0)"}}/>
    </button>
  )
}

/* ══════════════════════════════════════════════════════════════ */
/*  Admin Dashboard                                               */
/* ══════════════════════════════════════════════════════════════ */
export default function AdminDashboard({ user, onLogout, onSwitchToChat }: { user:AuthUser; onLogout:()=>void; onSwitchToChat:()=>void }) {
  const [view, setView] = useState<AdminView>("overview")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])

  /* Docs state */
  const [docs, setDocs] = useState<Doc[]>([])
  const [docSearch, setDocSearch] = useState("")
  const [docFamFilter, setDocFamFilter] = useState("all")
  const [docPage, setDocPage] = useState(1)
  const DOCS_PER_PAGE = 10
  const [showDocModal, setShowDocModal] = useState(false)
  const [editingDoc, setEditingDoc] = useState<Doc|null>(null)
  const [deletingDoc, setDeletingDoc] = useState<string|null>(null)
  const [confirmDocEdit, setConfirmDocEdit] = useState(false)
  const [deletingDocBusy, setDeletingDocBusy] = useState(false)
  const [showJsonPreview, setShowJsonPreview] = useState<Doc|null>(null)
  const [docForm, setDocForm] = useState(EMPTY_DOC())
  const [docErrors, setDocErrors] = useState<Record<string,string>>({})
  const [jsonPaste, setJsonPaste] = useState("")
  const [showJsonPaste, setShowJsonPaste] = useState(false)
  const [savingDoc, setSavingDoc] = useState(false)

  const [usageStats, setUsageStats] = useState<{topics:{label:string;value:number;color:string;count:number}[];models:{label:string;value:number;color:string;count:number}[];total_questions:number;total_answers:number}>({topics:[],models:[],total_questions:0,total_answers:0})
  const [usageError, setUsageError] = useState("")
  const [usageLoaded, setUsageLoaded] = useState(false)
  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const load = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/admin/usage-stats?admin_id=${user.id}`, {signal:controller.signal})
        if (!response.ok) throw new Error("Impossible de charger les statistiques.")
        const data = await response.json()
        if (!cancelled) {setUsageStats(data); setUsageError(""); setUsageLoaded(true)}
      } catch (error) {if (!cancelled) setUsageError(error instanceof Error ? error.message : "Erreur de chargement")}
    }
    load()
    const interval = setInterval(load, 10000)
    return () => {cancelled = true; controller.abort(); clearInterval(interval)}
  }, [user.id])
  const [messagesPerDay, setMessagesPerDay] = useState<{label:string;value:number;date:string}[]>([])
  const [messagesChartError, setMessagesChartError] = useState("")
  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const load = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/admin/messages-per-day?admin_id=${user.id}`, {signal:controller.signal})
        if (!response.ok) throw new Error("Impossible de charger les messages par jour.")
        const data = await response.json()
        if (!cancelled) { setMessagesPerDay(data); setMessagesChartError("") }
      } catch (error) {
        if (!cancelled) setMessagesChartError(error instanceof Error ? error.message : "Erreur de chargement")
      }
    }
    load()
    const interval = setInterval(load, 10000)
    return () => { cancelled = true; controller.abort(); clearInterval(interval) }
  }, [user.id])

  /* Users state */
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState({users: 0, conversations: 0, messages: 0,})
  const [userSearch, setUserSearch] = useState("")
  const [userFilter, setUserFilter] = useState<"all"|"online"|"admin"|"suspended">("all")
  const [userAction, setUserAction] = useState<{id:string;kind:"role"|"suspend"|"delete"}|null>(null)
  const [userActionBusy, setUserActionBusy] = useState(false)
  
    /* ── Charger les utilisateurs depuis le backend ── */
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/admin/users?admin_id=${user.id}`
        )

        if (!response.ok) {
          throw new Error("Impossible de récupérer les utilisateurs")
        }

        const data = await response.json()

        const now = Date.now()

        const realUsers: AdminUser[] = data.map((u: any) => {
          const lastSeenDate = u.last_seen
            ? new Date(u.last_seen).getTime()
            : 0

          const isOnline =
          u.role !== "admin" &&
          lastSeenDate > 0 &&
          now - lastSeenDate < 60000

          const fullName =
            `${u.first_name || ""} ${u.last_name || ""}`.trim()

          return {
            id: String(u.id),
            name: fullName || u.username || "Utilisateur",
            email: u.email,
            role: u.role === "admin" ? "admin" : "user",
            status: isOnline ? "online" : "offline",
            conversations: 0,
            joined: u.created_at || "",
            lastSeen: isOnline ? "Maintenant" : "Hors ligne",
            suspended: Boolean(u.suspended),
            avatar: fullName
              ? fullName
                  .split(" ")
                  .map((x: string) => x[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "U",
          }
        })

        setUsers(realUsers)
        const currentOnlineCount = realUsers.filter(
          u => u.status === "online"
        ).length
        setOnlineHistory(prev => [
          ...prev.slice(-7),
          currentOnlineCount
        ])
      } catch (error) {
        console.error(
          "Erreur chargement utilisateurs :",
          error
        )
      }
    }

    loadUsers()

    const interval = setInterval(
      loadUsers,
      2000
    )

    return () => clearInterval(interval)
  }, [user.id])

  const [onlineHistory, setOnlineHistory] = useState<number[]>([])
  /* Convos state */
  const [convoSearch, setConvoSearch] = useState("")
  const [expandedConvo, setExpandedConvo] = useState<string|null>(null)
  const [conversations, setConversations] = useState<Convo[]>([])

  useEffect(() => {
  const loadConversations = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/admin/conversations?admin_id=${user.id}`
      )

      if (!response.ok) {
        throw new Error("Impossible de récupérer les conversations")
      }

      const data = await response.json()

      const realConversations: Convo[] = data.conversations.map(
        (c: any) => ({
          id: String(c.id),
          userName:
            `${c.first_name || ""} ${c.last_name || ""}`.trim() ||
            "Utilisateur",
          userEmail: c.email || "",
          preview: c.title || "Nouveau chat",
          messages: Number(c.messages || 0),
          date: c.updated_at || c.created_at || "",
          duration: "—",
          model: "—",
          topic: "—",
        })
      )

      setConversations(realConversations)
    } catch (error) {
      console.error(
        "Erreur chargement conversations :",
        error
      )
    }
  }

  loadConversations()

  const interval = setInterval(
    loadConversations,
    1000
  )

  return () => clearInterval(interval)
}, [user.id])
  /* ── Toast helpers ── */
  const toast = (msg:string, icon="✓", type:Toast["type"]="success") => {
    const id = Date.now().toString()
    setToasts(p=>[...p,{id,msg,icon,type}])
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500)
  }
  const removeToast = (id:string) => setToasts(p=>p.filter(t=>t.id!==id))

  useEffect(() => {
    if (user.role === "admin") loadDocs()
  }, [user.id])

  /* ── Doc CRUD ── */
  const openAddDoc = () => { setDocForm(EMPTY_DOC()); setDocErrors({}); setEditingDoc(null); setJsonPaste(""); setShowJsonPaste(false); setShowDocModal(true) }
  const openEditDoc = (doc:Doc) => { setEditingDoc(doc); setDocForm({bank:doc.bank,product_family:normalizeFamily(doc.product_family),source_url:doc.source_url,titre_page:doc.titre_page,groupe_offres:doc.groupe_offres,type_produit:doc.type_produit,chunk_text:doc.chunk_text,chunk_id:doc.chunk_id,status:doc.status}); setDocErrors({}); setShowJsonPaste(false); setJsonPaste(""); setShowDocModal(true) }

  const parseJsonPaste = () => {
    try {
      const obj = JSON.parse(jsonPaste)
      setDocForm(p=>({...p,
        bank: obj.bank||p.bank, product_family: obj.product_family ? normalizeFamily(obj.product_family) : p.product_family,
        source_url: obj.source_url||p.source_url, titre_page: obj.titre_page||p.titre_page,
        groupe_offres: obj.groupe_offres||p.groupe_offres, type_produit: obj.type_produit||p.type_produit,
        chunk_text: obj.chunk_text||p.chunk_text,
      }))
      setShowJsonPaste(false); setJsonPaste("")
      toast("JSON analysé et formulaire rempli","📋")
    } catch { toast("JSON invalide, vérifiez la syntaxe","⚠️","error") }
  }

  const validateDoc = () => {
    const e:Record<string,string>={}
    if(!docForm.titre_page.trim()) e.titre_page="Titre requis"
    if(!docForm.type_produit.trim()) e.type_produit="Type de produit requis"
    if(!docForm.chunk_text.trim()) e.chunk_text="Contenu requis"
    if(docForm.source_url && !/^https?:\/\/.+/.test(docForm.source_url)) e.source_url="URL invalide (https://...)"
    setDocErrors(e)
    return Object.keys(e).length===0
  }

  const DOC_API = "http://127.0.0.1:8000/api/admin/documents"
  const loadDocs = async () => {
    try {
      const response = await fetch(`${DOC_API}?admin_id=${user.id}`)
      if (!response.ok) throw new Error("Impossible de charger les documents.")
      setDocs(await response.json())
    } catch (error) {
      toast(error instanceof Error ? error.message : "Erreur de chargement", "!", "error")
    }
  }

  const saveDoc = async () => {
    if (!validateDoc()) return
    if (savingDoc) return
    setSavingDoc(true)
    try {
      const response = await fetch(`${DOC_API}${editingDoc ? `/${encodeURIComponent(editingDoc.id)}` : ""}?admin_id=${user.id}`, {
        method: editingDoc ? "PUT" : "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({...docForm, chunk_id: undefined}),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || "Enregistrement impossible")
      await loadDocs()
      setShowDocModal(false)
      setConfirmDocEdit(false)
      toast(editingDoc ? "Document modifié avec succès" : "Document ajouté avec succès", "📄")
    } catch (error) {
      toast(error instanceof Error ? error.message : "Erreur d'enregistrement", "!", "error")
    } finally { setSavingDoc(false) }
  }

  const deleteDoc = async (id:string) => {
    if (deletingDocBusy) return
    setDeletingDocBusy(true)
    try {
      const response = await fetch(`${DOC_API}/${encodeURIComponent(id)}?admin_id=${user.id}`, {method:"DELETE"})
      if (!response.ok) throw new Error((await response.json()).detail || "Suppression impossible")
      setDocs(p=>p.filter(d=>d.id!==id))
      toast("Document supprimé", "🗑️", "info")
    } catch (error) { toast(error instanceof Error ? error.message : "Erreur", "!", "error") }
    finally { setDeletingDoc(null); setDeletingDocBusy(false) }
  }

  const toggleDocStatus = async (id:string) => {
    const doc = docs.find(d=>d.id===id)
    if (!doc) return
    try {
      const response = await fetch(`${DOC_API}/${encodeURIComponent(id)}?admin_id=${user.id}`, {
        method:"PUT", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...doc,status:doc.status==="active"?"draft":"active"}),
      })
      if (!response.ok) throw new Error((await response.json()).detail || "Modification impossible")
      const updated:Doc = await response.json()
      setDocs(p=>p.map(d=>d.id===id?updated:d))
      toast("Statut du document mis à jour", "🔄", "info")
    } catch (error) { toast(error instanceof Error ? error.message : "Erreur", "!", "error") }
  }

  /* ── User actions / SQLite API ── */
  const API_URL = "http://127.0.0.1:8000"

  const loadUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users?admin_id=${user.id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || "Impossible de charger les utilisateurs.")
      }

      const mappedUsers: AdminUser[] = data.map((u:any) => {
        const name = `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username || "Utilisateur"
        return {
          id: String(u.id),
          name,
          email: u.email,
          role: u.role === "admin" ? "admin" : "user",
          status: "offline",
          conversations: Number(u.conversations ?? 0),
          joined: u.created_at ? new Date(u.created_at).toLocaleDateString("fr-FR") : "—",
          lastSeen: "—",
          suspended: Boolean(u.suspended),
          avatar: name.split(" ").map((w:string) => w[0]).slice(0,2).join("").toUpperCase(),
        }
      })

      setUsers(mappedUsers)
    } catch (error) {
      console.error("Erreur chargement utilisateurs :", error)
      toast(error instanceof Error ? error.message : "Erreur lors du chargement des utilisateurs.", "!", "error")
    }
  }

  useEffect(() => {
    loadUsers()
  }, [user.id])

  const toggleUserRole = async (id:string) => {
    if (String(user.id) === id) {
      toast("Vous ne pouvez pas modifier votre propre rôle.", "🛡️", "warn")
      return
    }

    const target = users.find(u => u.id === id)
    if (!target) return

    const newRole = target.role === "admin" ? "user" : "admin"

    try {
      const response = await fetch(`${API_URL}/api/admin/users/${id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_id: user.id, role: newRole }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || "Impossible de modifier le rôle.")
      }

      setUsers(p => p.map(u => u.id === id ? { ...u, role: newRole } : u))
      toast(newRole === "admin" ? "Utilisateur promu administrateur" : "Utilisateur rétrogradé", "👤", "info")
    } catch (error) {
      console.error("Erreur rôle utilisateur :", error)
      toast(error instanceof Error ? error.message : "Erreur lors de la modification du rôle.", "!", "error")
    }
  }

  /* ── Charger les statistiques depuis SQLite ── */
useEffect(() => {
  const loadStats = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/admin/stats`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: user.id,
          }),
        }
      )

      if (!response.ok) {
        throw new Error("Impossible de récupérer les statistiques")
      }

      const data = await response.json()

      setStats({
        users: Number(data.users ?? 0),
        conversations: Number(data.conversations ?? 0),
        messages: Number(data.messages ?? 0),
      })
    } catch (error) {
      console.error(
        "Erreur chargement statistiques :",
        error
      )
    }
  }

  loadStats()

  const interval = setInterval(
    loadStats,
    2000
  )

  return () => clearInterval(interval)
}, [user.id])

  const toggleSuspend = async (id:string) => {
    if (String(user.id) === id) {
      toast("Vous ne pouvez pas suspendre votre propre compte.", "🛡️", "warn")
      return
    }

    const target = users.find(u => u.id === id)
    if (!target) return

    const newSuspended = !target.suspended

    try {
      const response = await fetch(`${API_URL}/api/admin/users/${id}/suspend`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_id: user.id, suspended: newSuspended }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || "Impossible de modifier le statut.")
      }

      setUsers(p => p.map(u => u.id === id ? { ...u, suspended: newSuspended } : u))
      toast(newSuspended ? "Utilisateur suspendu" : "Utilisateur réactivé", newSuspended ? "🚫" : "✅", "info")
    } catch (error) {
      console.error("Erreur suspension utilisateur :", error)
      toast(error instanceof Error ? error.message : "Erreur lors de la modification du statut.", "!", "error")
    }
  }

  const deleteUser = async (id:string) => {
    if (String(user.id) === id) {
      toast("Vous ne pouvez pas supprimer votre propre compte.", "🛡️", "warn")
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/users/${id}?admin_id=${user.id}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || "Impossible de supprimer l'utilisateur.")
      }

      setUsers(p => p.filter(u => u.id !== id))
      toast("Utilisateur supprimé", "🗑️", "warn")
    } catch (error) {
      console.error("Erreur suppression utilisateur :", error)
      toast(error instanceof Error ? error.message : "Erreur lors de la suppression de l'utilisateur.", "!", "error")
    }
  }

  /* ── Filtered lists ── */
  const filteredDocs = useMemo(() => {
    const normalizeSearch = (value:unknown) => String(value ?? "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
    const terms = normalizeSearch(docSearch).split(" ").filter(Boolean)
    return docs.filter(doc => {
      const family = normalizeFamily(doc.product_family)
      const searchable = normalizeSearch([
        doc.titre_page, doc.type_produit, doc.groupe_offres, doc.chunk_text,
        doc.bank, doc.source_url, doc.product_family, FAM_LABELS[family], doc.id,
      ].join(" "))
      const matchSearch = terms.every(term => searchable.includes(term))
      const matchFamily = docFamFilter === "all" || family === docFamFilter
      return matchSearch && matchFamily
    })
  }, [docs, docSearch, docFamFilter])

  const docPageCount = Math.max(1, Math.ceil(filteredDocs.length / DOCS_PER_PAGE))
  const currentDocPage = Math.min(docPage, docPageCount)
  const docStart = (currentDocPage - 1) * DOCS_PER_PAGE
  const paginatedDocs = filteredDocs.slice(docStart, docStart + DOCS_PER_PAGE)
  const docPageNumbers = Array.from(new Set([1, ...Array.from({length:5}, (_, i) => currentDocPage - 2 + i), docPageCount]))
    .filter(page => page >= 1 && page <= docPageCount).sort((a,b) => a-b)
  useEffect(() => { setDocPage(1) }, [docSearch, docFamFilter])
  useEffect(() => { setDocPage(page => Math.min(page, docPageCount)) }, [docPageCount])

  const filteredUsers = useMemo(()=>users.filter(u=>{
    const q=userSearch.toLowerCase()
    const matchQ=!q||u.name.toLowerCase().includes(q)||u.email.toLowerCase().includes(q)
    const matchF=userFilter==="all"||(userFilter==="online"&&u.status==="online")||(userFilter==="admin"&&u.role==="admin")||(userFilter==="suspended"&&u.suspended)
    return matchQ&&matchF
  }),[users,userSearch,userFilter])

  const filteredConvos = useMemo(()=>conversations.filter(c=>{

  const q=convoSearch.toLowerCase()

  return !q||c.userName.toLowerCase().includes(q)||c.preview.toLowerCase().includes(q)||c.topic.toLowerCase().includes(q)

}),[convoSearch, conversations])

  const onlineCount = users.filter(u=>u.status==="online").length

  const kpis = [
    { label:"Utilisateurs", value:stats.users.toString(), trend:0, icon:"👥", sub:"total", sparkline:[stats.users] },
    { label:"Conversations", value:stats.conversations.toString(), trend:0, icon:"💬", sub:"total", sparkline:[stats.conversations] },
    { label:"Messages envoyés", value:stats.messages.toLocaleString("fr-FR"), trend:0, icon:"📨", sub:"total", sparkline:[stats.messages] },
    { label:"Documents actifs", value:docs.filter(d=>d.status==="active").length.toString(), trend:3, icon:"📄", sub:"cette semaine", sparkline:[148,149,150,150,152,153,154,docs.filter(d=>d.status==="active").length] },
  ]

  const initials = user.name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase()

  const NAV = [
    { id:"overview", label:"Vue d'ensemble", icon:<OverviewIcon/> },
    { id:"documents", label:"Documents", icon:<DocIcon/> },
    { id:"users", label:"Utilisateurs", icon:<UsersIcon/> },
    { id:"conversations", label:"Conversations", icon:<ChatIcon/> },
    { id:"settings", label:"Paramètres", icon:<SettingsIcon/> },
  ] as const

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#F8FAFC]" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <ToastLayer items={toasts} remove={removeToast}/>
      {deletingDoc && <Confirm msg={`Êtes-vous sûr de vouloir supprimer définitivement « ${docs.find(d=>d.id===deletingDoc)?.titre_page || "ce document"} » ?`} onOk={()=>deleteDoc(deletingDoc)} onClose={()=>setDeletingDoc(null)} busy={deletingDocBusy} autoClose={false}/>}
      {confirmDocEdit && <Confirm msg={`Êtes-vous sûr de vouloir enregistrer les modifications de « ${docForm.titre_page} » ?`} onOk={()=>saveDoc()} onClose={()=>setConfirmDocEdit(false)} busy={savingDoc} autoClose={false}/>}
      {userAction && <Confirm
        msg={userAction.kind==="delete"
          ? `Supprimer définitivement ${users.find(u=>u.id===userAction.id)?.email || "cet utilisateur"} et ses conversations ?`
          : userAction.kind==="suspend"
            ? `${users.find(u=>u.id===userAction.id)?.suspended ? "Réactiver" : "Suspendre"} ce compte utilisateur ?`
            : `Modifier le rôle de ce compte en ${users.find(u=>u.id===userAction.id)?.role==="admin" ? "utilisateur" : "administrateur"} ?`}
        busy={userActionBusy} autoClose={false} onClose={()=>setUserAction(null)}
        onOk={async ()=>{
          if(userActionBusy) return
          setUserActionBusy(true)
          try {
            if(userAction.kind==="delete") await deleteUser(userAction.id)
            else if(userAction.kind==="suspend") await toggleSuspend(userAction.id)
            else await toggleUserRole(userAction.id)
          } finally { setUserActionBusy(false); setUserAction(null) }
        }}/>}

      {/* ── Doc modal ── */}
      {showDocModal && (
        <Modal title={editingDoc?"Modifier le document":"Ajouter un document"} onClose={()=>setShowDocModal(false)} wide>
          {/* JSON paste shortcut */}
          {!showJsonPaste?(
            <button onClick={()=>setShowJsonPaste(true)} className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#003883]/40 py-2.5 text-xs font-semibold text-[#003883] hover:bg-[#003883]/5 transition-colors">
              <CodeIcon/> Coller un JSON pour auto-remplir le formulaire
            </button>
          ):(
            <div className="mb-4 space-y-2">
              <label className="text-xs font-semibold text-[#1E293B]">Coller votre JSON ici</label>
              <textarea value={jsonPaste} onChange={e=>setJsonPaste(e.target.value)} rows={5} placeholder='{"bank":"BoursoBank","product_family":"credit",...}'
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 font-mono text-xs text-[#1E293B] outline-none focus:border-[#003883]"/>
              <div className="flex gap-2">
                <button onClick={parseJsonPaste} className="flex-1 rounded-xl py-2 text-xs font-semibold text-white" style={{background:"linear-gradient(135deg,#003883,#d20073)"}}>Analyser le JSON</button>
                <button onClick={()=>setShowJsonPaste(false)} className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-xs font-semibold text-gray-400 hover:text-[#1E293B] transition-colors">Annuler</button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Banque" error={docErrors.bank}>
                <input value={docForm.bank} onChange={e=>setDocForm(p=>({...p,bank:e.target.value}))} className={inp(false)} placeholder="BoursoBank"/>
              </FormField>
              <FormField label="Famille produit" error={docErrors.product_family}>
                <select value={docForm.product_family} onChange={e=>setDocForm(p=>({...p,product_family:e.target.value}))}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2.5 text-sm text-[#1E293B] outline-none focus:border-[#003883]">
                  {Object.entries(FAM_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="URL source" error={docErrors.source_url}>
              <input value={docForm.source_url} onChange={e=>setDocForm(p=>({...p,source_url:e.target.value}))} type="url" className={inp(false,docErrors.source_url)} placeholder="https://www.boursobank.com/..."/>
            </FormField>
            <FormField label="Titre de la page" error={docErrors.titre_page}>
              <input value={docForm.titre_page} onChange={e=>{setDocForm(p=>({...p,titre_page:e.target.value}));setDocErrors(p=>({...p,titre_page:""}))}} className={inp(false,docErrors.titre_page)} placeholder="Ex: Crédit immobilier BoursoBank..."/>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Groupe d'offres" error={docErrors.groupe_offres}>
                <input value={docForm.groupe_offres} onChange={e=>setDocForm(p=>({...p,groupe_offres:e.target.value}))} className={inp(false)} placeholder="Ex: Nos solutions de crédit"/>
              </FormField>
              <FormField label="Type de produit" error={docErrors.type_produit}>
                <input value={docForm.type_produit} onChange={e=>{setDocForm(p=>({...p,type_produit:e.target.value}));setDocErrors(p=>({...p,type_produit:""}))}} className={inp(false,docErrors.type_produit)} placeholder="Ex: Crédit immobilier"/>
              </FormField>
            </div>
            <FormField label={`Contenu (chunk_text) — ${docForm.chunk_text.length} caractères`} error={docErrors.chunk_text}>
              <textarea value={docForm.chunk_text} rows={5} onChange={e=>{setDocForm(p=>({...p,chunk_text:e.target.value}));setDocErrors(p=>({...p,chunk_text:""}))}}
                className={`${inp(false,docErrors.chunk_text)} resize-y`} placeholder="Contenu du document qui sera utilisé pour alimenter l'IA..."/>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <p className="text-xs text-gray-400 self-center">Le numéro du chunk est attribué automatiquement par le serveur.</p>
              <FormField label="Statut">
                <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] px-3 py-2.5">
                  <Toggle on={docForm.status==="active"} toggle={()=>setDocForm(p=>({...p,status:p.status==="active"?"draft":"active"}))}/>
                  <span className="text-sm font-medium text-[#1E293B]">{docForm.status==="active"?"Actif":"Brouillon"}</span>
                </div>
              </FormField>
            </div>
            <GradBtn onClick={()=>{
              if (!validateDoc()) return
              if (editingDoc) setConfirmDocEdit(true)
              else saveDoc()
            }} loading={savingDoc}>
              {editingDoc?"Enregistrer les modifications":"Ajouter le document"}
            </GradBtn>
          </div>
        </Modal>
      )}

      {/* ── JSON preview modal ── */}
      {showJsonPreview && (
        <Modal title="Aperçu JSON" onClose={()=>setShowJsonPreview(null)} wide>
          <div className="relative">
            <pre className="overflow-auto rounded-xl bg-[#0F1117] p-4 text-xs text-green-400 max-h-96">
              {JSON.stringify({bank:showJsonPreview.bank,product_family:showJsonPreview.product_family,source_url:showJsonPreview.source_url,titre_page:showJsonPreview.titre_page,groupe_offres:showJsonPreview.groupe_offres,type_produit:showJsonPreview.type_produit,chunk_text:showJsonPreview.chunk_text,chunk_length:showJsonPreview.chunk_length,chunk_id:showJsonPreview.chunk_id},null,2)}
            </pre>
            <button onClick={()=>{navigator.clipboard.writeText(JSON.stringify(showJsonPreview,null,2));toast("JSON copié","📋")}}
              className="absolute right-3 top-3 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/20 transition-colors">
              Copier
            </button>
          </div>
        </Modal>
      )}

      {/* ── Sidebar ── */}
      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/20 md:hidden" onClick={()=>setSidebarOpen(false)}/>}
      <aside className={`fixed md:relative z-30 flex h-full flex-col bg-white border-r border-[#E2E8F0] transition-all duration-300 flex-shrink-0 overflow-hidden ${sidebarOpen?"w-[220px]":"w-0 md:w-0"}`}>
        <div className="flex h-full w-[220px] flex-col">
          {/* Logo */}
          <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-[#E2E8F0] px-4 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{background:"linear-gradient(135deg,#003883,#d20073)"}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="8" width="18" height="13" rx="3" stroke="white" strokeWidth="1.6"/><path d="M8 8V6a4 4 0 0 1 8 0v2" stroke="white" strokeWidth="1.6" strokeLinecap="round"/><circle cx="9" cy="14" r="1.5" fill="white"/><circle cx="15" cy="14" r="1.5" fill="white"/></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-[#1E293B]">BoursoBot</p>
              <p className="text-[10px] font-medium text-[#d20073]">Administration</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
            {NAV.map(n=>(
              <button key={n.id} onClick={()=>setView(n.id as AdminView)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${view===n.id?"text-white":"text-[#64748B] hover:bg-[#F4F6F9] hover:text-[#1E293B]"}`}
                style={view===n.id?{background:"linear-gradient(135deg,#003883,#d20073)"}:{}}>
                <span className="flex-shrink-0">{n.icon}</span>
                {n.label}
                {n.id==="documents" && <span className="ml-auto rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">{docs.length}</span>}
                {n.id==="users" && <span className="ml-auto rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">{users.length}</span>}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-[#E2E8F0] px-3 py-3 space-y-1">
            <button onClick={onSwitchToChat}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#F4F6F9] hover:text-[#003883] transition-colors">
              <ChatIcon/> Mode Chat
            </button>
            <button onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
              <LogoutIcon/> Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex flex-shrink-0 items-center gap-3 border-b border-[#E2E8F0] bg-white px-4 py-3">
          <button onClick={()=>setSidebarOpen(p=>!p)} className="rounded-lg p-2 text-gray-400 hover:bg-[#F4F6F9] hover:text-[#003883] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div>
            <h1 className="text-base font-bold text-[#1E293B]">{NAV.find(n=>n.id===view)?.label}</h1>
            <p className="text-[11px] text-gray-400">BoursoBot Administration · {new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}</p>
          </div>
          <div className="flex-1"/>
          {/* User */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{background:"linear-gradient(135deg,#003883,#d20073)"}}>
              {initials}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-[#1E293B]">{user.name}</p>
              <p className="text-[10px] font-medium text-[#d20073]">Administrateur</p>
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">

          {/* ══ OVERVIEW ══ */}
          {view==="overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {kpis.map((k,i)=><StatCard key={i} {...k}/>)}
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Messages chart */}
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#1E293B]">Messages par jour</p>
                      <p className="text-[11px] text-gray-400">7 derniers jours</p>
                    </div>
                    <Badge color="#003883" label="7 derniers jours"/>
                  </div>
                  {messagesChartError ? (
                    <p className="text-sm text-red-500">{messagesChartError}</p>
                  ) : messagesPerDay.length === 0 ? (
                    <p className="text-sm text-gray-400">Chargement...</p>
                  ) : <BarChart data={messagesPerDay}/>}
                  <p className="mt-2 text-[10px] text-gray-400">Messages utilisateurs et réponses du chatbot enregistrés</p>
                </div>
                {/* Croissance utilisateurs */}
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#1E293B]">Croissance utilisateurs</p>
                      <p className="text-[11px] text-gray-400">14 derniers jours</p>
                    </div>
                    <Badge color="#22C55E" label="+{12}%"/>
                  </div>
                  <AreaChart data={USERS_DATA}/>
                  <div className="mt-3 flex justify-between text-[10px] text-gray-400">
                    <span>J-14</span><span>J-7</span><span>Aujourd'hui</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Topics donut */}
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
                  <p className="mb-4 text-sm font-bold text-[#1E293B]">Sujets populaires</p>
                  <p className="mb-3 text-xs text-[#64748B]">{usageError || (!usageLoaded ? "Chargement…" : `${usageStats.total_questions} questions · classement indicatif par mots-clés`)}</p>
                  <div className="flex items-center gap-4">
                    <DonutChart data={usageStats.topics}/>
                    <div className="space-y-2">
                      {usageStats.topics.map(t=>(
                        <div key={t.label} className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{backgroundColor:t.color}}/>
                          <span className="text-xs text-[#64748B]">{t.label}</span>
                          <span className="ml-auto text-xs font-bold text-[#1E293B]">{t.value}% ({t.count})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Model usage */}
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
                  <p className="mb-4 text-sm font-bold text-[#1E293B]">Utilisation des modèles</p>
                  <p className="mb-3 text-xs text-[#64748B]">{usageError || (!usageLoaded ? "Chargement…" : `${usageStats.total_answers} réponses enregistrées`)}</p>
                  <div className="space-y-3">
                    {usageStats.models.map(m=>(
                      <div key={m.label}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="font-medium text-[#1E293B]">{m.label}</span>
                          <span className="font-bold text-[#1E293B]">{m.value}% ({m.count})</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[#F4F6F9]">
                          <div className="h-full rounded-full transition-all duration-700" style={{width:`${m.value}%`,background:m.color}}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Recent docs + Recent convos */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-bold text-[#1E293B]">Documents récents</p>
                    <ActBtn small outline onClick={()=>setView("documents")}>Voir tout</ActBtn>
                  </div>
                  <div className="space-y-2">
                    {docs.slice(0,4).map(d=>(
                      <div key={d.id} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-[#F8FAFC] transition-colors">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{backgroundColor:`${FAM_COLORS[normalizeFamily(d.product_family)]}15`}}>
                          <span className="text-sm">📄</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-[#1E293B]">{d.type_produit}</p>
                          <p className="text-[10px] text-gray-400">{d.addedAt} · {d.chunk_length} car.</p>
                        </div>
                        <Badge color={d.status==="active"?"#22C55E":"#94A3B8"} label={d.status==="active"?"Actif":"Draft"}/>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-bold text-[#1E293B]">Utilisateurs en ligne</p>
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-green-600">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-green-500"/>
                      {onlineCount} actifs
                    </span>
                  </div>
                  <div className="space-y-2">
                    {users.filter(u=>u.status==="online").slice(0,5).map(u=>(
                      <div key={u.id} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-[#F8FAFC] transition-colors">
                        <div className="relative flex-shrink-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{background:"linear-gradient(135deg,#003883,#d20073)"}}>{u.avatar}</div>
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white" style={{backgroundColor:STATUS_COLORS[u.status]}}/>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-[#1E293B]">{u.name}</p>
                          <p className="text-[10px] text-gray-400">{u.conversations} conv. · {u.lastSeen}</p>
                        </div>
                        {u.role==="admin"&&<Badge color="#d20073" label="Admin"/>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ DOCUMENTS ══ */}
          {view==="documents" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <SearchBar value={docSearch} onChange={setDocSearch} placeholder="Rechercher par titre, produit ou contenu..."/>
                <select value={docFamFilter} onChange={e=>setDocFamFilter(e.target.value)}
                  className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] outline-none focus:border-[#003883] transition-colors">
                  <option value="all">Toutes les familles</option>
                  {Object.entries(FAM_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
                <div className="ml-auto">
                  <ActBtn onClick={openAddDoc}><PlusIcon/> Ajouter un document</ActBtn>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                        {["Type de produit","Famille","Groupe d'offres","Longueur","Statut","Date","Actions"].map(h=>(
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocs.length===0?(
                        <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-400">Aucun document trouvé</td></tr>
                      ):paginatedDocs.map(d=>(
                        <tr key={d.id} className="border-b border-[#F4F6F9] hover:bg-[#F8FAFC] transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-[#1E293B]">{d.type_produit}</p>
                            <p className="text-[10px] text-gray-400 truncate max-w-[180px]" title={d.titre_page}>{d.titre_page}</p>
                          </td>
                          <td className="px-4 py-3"><Badge color={FAM_COLORS[normalizeFamily(d.product_family)]||"#94A3B8"} label={FAM_LABELS[normalizeFamily(d.product_family)]||d.product_family}/></td>
                          <td className="px-4 py-3 text-xs text-[#64748B] max-w-[140px]"><span className="truncate block">{d.groupe_offres}</span></td>
                          <td className="px-4 py-3 text-xs text-[#64748B]">{d.chunk_length} car.</td>
                          <td className="px-4 py-3">
                            <button onClick={()=>toggleDocStatus(d.id)} className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full" style={{backgroundColor:d.status==="active"?"#22C55E":"#94A3B8"}}/>
                              <span className="text-xs font-medium" style={{color:d.status==="active"?"#22C55E":"#94A3B8"}}>{d.status==="active"?"Actif":"Draft"}</span>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#64748B]">{d.addedAt}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={()=>setShowJsonPreview(d)} title="Aperçu JSON" className="rounded-lg p-1.5 text-gray-400 hover:bg-[#F4F6F9] hover:text-[#003883] transition-colors"><CodeIcon/></button>
                              <button onClick={()=>openEditDoc(d)} title="Modifier" className="rounded-lg p-1.5 text-gray-400 hover:bg-[#F4F6F9] hover:text-[#003883] transition-colors"><EditIcon/></button>
                              <button onClick={()=>setDeletingDoc(d.id)} title="Supprimer" className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"><TrashIcon/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] px-4 py-3">
                  <p className="text-xs text-gray-400">
                    {filteredDocs.length ? docStart + 1 : 0}–{Math.min(docStart + DOCS_PER_PAGE, filteredDocs.length)} sur {filteredDocs.length} documents
                  </p>
                  <div className="flex flex-wrap items-center gap-1" aria-label="Pagination des documents">
                    <button disabled={currentDocPage===1} onClick={()=>setDocPage(currentDocPage-1)} className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40">Précédent</button>
                    {docPageNumbers.map((page,index)=>(
                      <span key={page} className="flex items-center gap-1">
                        {index>0 && page-docPageNumbers[index-1]>1 && <span className="px-1 text-gray-400">…</span>}
                        <button onClick={()=>setDocPage(page)} aria-current={currentDocPage===page?"page":undefined}
                          className={`rounded-lg border px-3 py-1.5 text-xs ${currentDocPage===page?"bg-[#003883] text-white":"text-[#64748B] hover:bg-[#F8FAFC]"}`}>{page}</button>
                      </span>
                    ))}
                    <button disabled={currentDocPage===docPageCount} onClick={()=>setDocPage(currentDocPage+1)} className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40">Suivant</button>
                  </div>
                  <p className="text-xs text-gray-400">Page {currentDocPage} sur {docPageCount}</p>
                </div>
              </div>
            </div>
          )}

          {/* ══ USERS ══ */}
          {view==="users" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <SearchBar value={userSearch} onChange={setUserSearch} placeholder="Rechercher un utilisateur..."/>
                <div className="flex rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
                  {(["all","online","admin","suspended"] as const).map(f=>(
                    <button key={f} onClick={()=>setUserFilter(f)}
                      className={`px-3 py-2 text-xs font-semibold transition-colors ${userFilter===f?"text-white":"text-gray-400 hover:text-[#1E293B]"}`}
                      style={userFilter===f?{background:"linear-gradient(135deg,#003883,#d20073)"}:{}}>
                      {f==="all"?"Tous":f==="online"?"En ligne":f==="admin"?"Admins":"Suspendus"}
                    </button>
                  ))}
                </div>
                <p className="ml-auto text-xs text-gray-400">{filteredUsers.length} utilisateur{filteredUsers.length!==1?"s":""}</p>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px]">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                        {["Utilisateur","Statut","Rôle","Conversations","Inscrit le","Dernière activité","Actions"].map(h=>(
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u=>(
                        <tr key={u.id} className={`border-b border-[#F4F6F9] transition-colors ${u.suspended?"bg-red-50/30":"hover:bg-[#F8FAFC]"}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="relative flex-shrink-0">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{background:u.suspended?"#94A3B8":"linear-gradient(135deg,#003883,#d20073)"}}>{u.avatar}</div>
                                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white" style={{backgroundColor:u.suspended?"#EF4444":STATUS_COLORS[u.status]}}/>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-[#1E293B]">{u.name}</p>
                                <p className="text-[10px] text-gray-400">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1.5 text-xs font-medium" style={{color:u.suspended?"#EF4444":STATUS_COLORS[u.status]}}>
                              <span className={`h-2 w-2 rounded-full ${u.status==="online"&&!u.suspended?"animate-pulse":""}`} style={{backgroundColor:u.suspended?"#EF4444":STATUS_COLORS[u.status]}}/>
                              {u.suspended?"Suspendu":STATUS_LABELS[u.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3"><Badge color={u.role==="admin"?"#d20073":"#94A3B8"} label={u.role==="admin"?"Admin":"Utilisateur"}/></td>
                          <td className="px-4 py-3 text-xs text-[#64748B]">{u.conversations}</td>
                          <td className="px-4 py-3 text-xs text-[#64748B]">{u.joined}</td>
                          <td className="px-4 py-3 text-xs text-[#64748B]">{u.lastSeen}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button disabled={userActionBusy || String(user.id)===u.id} onClick={()=>setUserAction({id:u.id,kind:"role"})} title={u.role==="admin"?"Rétrograder":"Promouvoir admin"} className="rounded-lg p-1.5 text-gray-400 hover:bg-[#F4F6F9] hover:text-[#003883] transition-colors"><ShieldIcon/></button>
                              <button disabled={userActionBusy || String(user.id)===u.id} onClick={()=>setUserAction({id:u.id,kind:"suspend"})} title={u.suspended?"Réactiver":"Suspendre"} className={`rounded-lg p-1.5 transition-colors ${u.suspended?"text-green-500 hover:bg-green-50":"text-gray-400 hover:bg-amber-50 hover:text-amber-500"}`}>{u.suspended?<CheckIcon/>:<BanIcon/>}</button>
                              <button disabled={userActionBusy || String(user.id)===u.id} onClick={()=>setUserAction({id:u.id,kind:"delete"})} title="Supprimer" className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"><TrashIcon/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ CONVERSATIONS ══ */}
          {view==="conversations" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <SearchBar value={convoSearch} onChange={setConvoSearch} placeholder="Rechercher une conversation..."/>
                <p className="ml-auto text-xs text-gray-400">{filteredConvos.length} conversations</p>
              </div>
              <div className="space-y-2">
                {filteredConvos.map(c=>(
                  <div key={c.id} className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden">
                    <button onClick={()=>setExpandedConvo(expandedConvo===c.id?null:c.id)}
                      className="flex w-full items-center gap-4 px-5 py-4 hover:bg-[#F8FAFC] transition-colors text-left">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{background:"linear-gradient(135deg,#003883,#d20073)"}}>
                        {c.userName.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#1E293B]">{c.userName}</p>
                          <Badge color={FAM_COLORS[c.topic.toLowerCase()]||"#003883"} label={c.topic}/>
                          <Badge color="#94A3B8" label={c.model}/>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-gray-400">{c.preview}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs font-medium text-[#1E293B]">{c.messages} messages</p>
                        <p className="text-[10px] text-gray-400">{c.date} · {c.duration}</p>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" className={`flex-shrink-0 transition-transform ${expandedConvo===c.id?"rotate-180":""}`}><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                    {expandedConvo===c.id && (
                      <div className="border-t border-[#F4F6F9] px-5 py-4 bg-[#F8FAFC]">
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-4">
                          {[["Utilisateur",c.userName],["Email",c.userEmail],["Modèle IA",c.model],["Durée",c.duration]].map(([k,v])=>(
                            <div key={k}><p className="text-[10px] text-gray-400">{k}</p><p className="text-xs font-semibold text-[#1E293B]">{v}</p></div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <ActBtn small outline onClick={()=>toast(`Conversation ${c.id} exportée`,"📤")}>Exporter</ActBtn>
                          <ActBtn small outline onClick={()=>toast("Conversation archivée","🗄️","info")}>Archiver</ActBtn>
                          <ActBtn small red onClick={()=>toast("Conversation supprimée","🗑️","warn")}>Supprimer</ActBtn>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paramètres généraux */}
          {view==="settings" && (
            <div className="max-w-2xl space-y-4">
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
                <p className="mb-4 text-sm font-bold text-[#1E293B]">Mon compte</p>
                <dl className="space-y-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2"><dt className="text-[#64748B]">Nom</dt><dd className="font-medium text-[#1E293B]">{user.name}</dd></div>
                  <div className="flex flex-wrap justify-between gap-2"><dt className="text-[#64748B]">Rôle</dt><dd className="font-medium text-[#1E293B]">{user.role === "admin" ? "Administrateur" : "Utilisateur"}</dd></div>
                </dl>
              </div>
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
                <p className="mb-2 text-sm font-bold text-[#1E293B]">Mon espace</p>
                <p className="mb-4 text-xs text-[#64748B]">Accédez au chatbot ou déconnectez-vous de la plateforme.</p>
                <div className="flex flex-wrap gap-3">
                  <ActBtn onClick={onSwitchToChat}>Ouvrir le chatbot</ActBtn>
                  <ActBtn outline onClick={onLogout}>Se déconnecter</ActBtn>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Icons ───────────────────────────────────────────────────── */
function XIcon({size=16}:{size?:number}){return<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>}
function PlusIcon(){return<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>}
function OverviewIcon(){return<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}
function DocIcon(){return<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>}
function UsersIcon(){return<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
function ChatIcon(){return<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
function ChartIcon(){return<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
function SettingsIcon(){return<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>}
function LogoutIcon(){return<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>}
function EditIcon(){return<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>}
function TrashIcon(){return<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>}
function CodeIcon(){return<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>}
function ShieldIcon(){return<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
function BanIcon(){return<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>}
function CheckIcon(){return<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>}