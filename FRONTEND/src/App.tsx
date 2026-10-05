import { useState, useRef, useEffect } from "react"
import AuthPage, { type AuthUser } from "./AuthPage"
import { sendMessage, type Source } from "./api"
import AdminDashboard from "./AdminDashboard"

/* ── Types ───────────────────────────────────────────────────── */
interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  liked: boolean | null
  sources?: Source[]
}

interface ChatItem {
  id: string
  title: string
  group: "today" | "week" | "month"
}

interface BackendConversation {
  id: number | string
  title: string
  created_at?: string
  updated_at?: string
}

interface BackendMessage {
  id: number | string
  role: "user" | "assistant"
  content: string
  created_at?: string
}

interface Toast {
  id: string
  message: string
  icon: string
  type: "success" | "info" | "warn" | "error"
}

/* ── Constants ───────────────────────────────────────────────── */

const API_URL = "http://127.0.0.1:8000"

const SESSION_KEY = "bourso_user"

const INITIAL_CHATS: ChatItem[] = []

const MODELS = [
  {
    label: "Llama 3.1 8B",
    provider: "OpenRouter",
    // // description: "Llama 3.1 8B via OpenRouter",
  },
  {
    label: "Gemma2:2b",
    provider: "Ollama",
    // description: "Modèle local ",
  },
] as const

const SUGGESTIONS = [
  {
    emoji: "📊",
    title: "Analyser mon portefeuille",
    desc: "Obtenez une vue d'ensemble de vos investissements",
  },
  {
    emoji: "🏠",
    title: "Simuler un crédit immobilier",
    desc: "Calculez vos mensualités et capacité d'emprunt",
  },
  {
    emoji: "💰",
    title: "Optimiser mon épargne",
    desc: "Découvrez les meilleures stratégies adaptées à votre profil",
  },
  {
    emoji: "📈",
    title: "Comprendre les marchés",
    desc: "Analysez les tendances et actualités financières",
  },
]

/* ── Helpers API ─────────────────────────────────────────────── */

async function getConversations(
  userId: number | string
): Promise<BackendConversation[]> {
  const response = await fetch(
    `${API_URL}/api/conversations/${userId}`
  )

  if (!response.ok) {
    throw new Error(
      "Impossible de récupérer les conversations."
    )
  }

  const data = await response.json()

  return Array.isArray(data) ? data : (data.conversations ?? [])
}

async function getConversationMessages(
  conversationId: number | string
): Promise<BackendMessage[]> {
  const user = JSON.parse(
    localStorage.getItem(SESSION_KEY) || "null"
  )

  if (!user?.id) {
    throw new Error("Utilisateur non connecté.")
  }

  const response = await fetch(
    `${API_URL}/api/conversations/${conversationId}/messages?user_id=${user.id}`
  )

  if (!response.ok) {
    let message =
      "Impossible de récupérer les messages."

    try {
      const data = await response.json()

      if (data.detail) {
        message = data.detail
      }
    } catch {
      // message par défaut
    }

    throw new Error(message)
  }

  const data = await response.json()

  return Array.isArray(data) ? data : (data.messages ?? [])
}

async function createConversation(
  userId: number | string,
  title: string
): Promise<BackendConversation> {
  const response = await fetch(
    `${API_URL}/api/conversations`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        title,
      }),
    }
  )

  if (!response.ok) {
    throw new Error(
      "Impossible de créer la conversation."
    )
  }
const data = await response.json()

console.log("📥 CONVERSATION CRÉÉE :", data)

return data
}

async function saveMessage(
  conversationId: number,
  role: "user" | "assistant",
  content: string,
  sourcesJson?: string,
  modelProvider?: string
) {
  const user = JSON.parse(
  localStorage.getItem(SESSION_KEY) || "null"
)

  if (!user) {
    throw new Error("Utilisateur non connecté.")
  }

  console.log("📤 SAVE MESSAGE :", {
    conversation_id: conversationId,
    role,
    content,
    sources_json: sourcesJson ?? null,
    user_id: user.id,
  })

  const response = await fetch(
    `${API_URL}/api/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        role,
        content,
        sources_json: sourcesJson ?? null,
        model_provider: role === "assistant" ? modelProvider ?? null : null,
        user_id: user.id,
      }),
    }
  )

  if (!response.ok) {
    throw new Error(
      "Impossible de sauvegarder le message."
    )
  }

  return response.json()
}

async function renameConversation(
  conversationId: number | string,
  title: string
) {
  const user = JSON.parse(
    localStorage.getItem(SESSION_KEY) || "null"
  )

  if (!user?.id) {
    throw new Error("Utilisateur non connecté.")
  }

  const response = await fetch(
    `${API_URL}/api/conversations/${conversationId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: Number(user.id),
        title,
      }),
    }
  )

  if (!response.ok) {
    let message =
      "Impossible de renommer la conversation."

    try {
      const data = await response.json()

      if (data.detail) {
        message = data.detail
      }
    } catch {
      // message par défaut
    }

    throw new Error(message)
  }

  return response.json()
}

async function removeConversation(
  conversationId: number | string
) {
  const user = JSON.parse(
    localStorage.getItem(SESSION_KEY) || "null"
  )

  if (!user?.id) {
    throw new Error("Utilisateur non connecté.")
  }

  const response = await fetch(
    `${API_URL}/api/conversations/${conversationId}?user_id=${user.id}`,
    {
      method: "DELETE",
    }
  )

  if (!response.ok) {
    let message =
      "Impossible de supprimer la conversation."

    try {
      const data = await response.json()

      if (data.detail) {
        message = data.detail
      }
    } catch {
      // message par défaut
    }

    throw new Error(message)
  }

  return response.json()
}
/* ── Markdown parser ─────────────────────────────────────────── */

function bold(s: string) {
  return s.replace(
    /\*\*(.+?)\*\*/g,
    "<strong>$1</strong>"
  )
}

function parseContent(text: string) {
  const nodes: React.ReactNode[] = []
  let list: string[] = []

  const flush = (k: string) => {
    if (!list.length) return

    nodes.push(
      <ul
        key={`ul${k}`}
        className="my-2 space-y-1 pl-1"
      >
        {list.map((item, i) => (
          <li
            key={i}
            className="flex gap-2 text-sm leading-relaxed"
          >
            <span className="mt-[5px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#d20073]" />

            <span
              dangerouslySetInnerHTML={{
                __html: bold(item),
              }}
            />
          </li>
        ))}
      </ul>
    )

    list = []
  }

  text.split("\n").forEach((line, i) => {
    if (line.startsWith("- ")) {
      list.push(line.slice(2))
      return
    }

    flush(String(i))

    if (line.trim()) {
      nodes.push(
        <p
          key={i}
          className="text-sm leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: bold(line),
          }}
        />
      )
    } else if (nodes.length) {
      nodes.push(
        <div
          key={`s${i}`}
          className="h-1"
        />
      )
    }
  })

  flush("e")

  return nodes
}

/* ── Toast system ────────────────────────────────────────────── */

function Toasts({
  items,
  remove,
}: {
  items: Toast[]
  remove: (id: string) => void
}) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-4 z-[300] flex flex-col items-end gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl"
          style={{
            background:
              t.type === "error"
                ? "#EF4444"
                : t.type === "warn"
                  ? "#F59E0B"
                  : t.type === "info"
                    ? "#475569"
                    : "#003883",
            animation: "slideIn .22s ease-out",
            minWidth: 220,
          }}
        >
          <span className="text-base leading-none">
            {t.icon}
          </span>

          <span className="flex-1">
            {t.message}
          </span>

          <button
            onClick={() => remove(t.id)}
            className="opacity-60 transition-opacity hover:opacity-100"
          >
            <XIcon size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

/* ── Settings modal ──────────────────────────────────────────── */

function SettingsModal({
  dark,
  onClose,
  onToggleDark,
}: {
  dark: boolean
  onClose: () => void
  onToggleDark: () => void
}) {
  const [notifs, setNotifs] = useState(true)
  const [sounds, setSounds] = useState(false)
  const [lang, setLang] = useState("fr")

  const bg = dark ? "#161B27" : "#ffffff"
  const text = dark ? "#E2E8F0" : "#1E293B"
  const border = dark ? "#2D3748" : "#E2E8F0"
  const input = dark ? "#1C2033" : "#F4F6F9"

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative z-10 w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{
          background: bg,
          color: text,
        }}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            Paramètres
          </h2>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 opacity-50 transition-opacity hover:opacity-100"
          >
            <XIcon size={16} />
          </button>
        </div>

        <div className="space-y-5">
          <Row
            label="Mode sombre"
            desc="Basculer vers le thème sombre"
          >
            <Toggle
              on={dark}
              toggle={onToggleDark}
            />
          </Row>

          <Row
            label="Notifications"
            desc="Recevoir des alertes et mises à jour"
          >
            <Toggle
              on={notifs}
              toggle={() => setNotifs((p) => !p)}
            />
          </Row>

          <Row
            label="Effets sonores"
            desc="Jouer un son à l'envoi de message"
          >
            <Toggle
              on={sounds}
              toggle={() => setSounds((p) => !p)}
            />
          </Row>

          <div>
            <p className="mb-1 text-sm font-semibold">
              Langue de l'interface
            </p>

            <select
              value={lang}
              onChange={(e) =>
                setLang(e.target.value)
              }
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{
                background: input,
                borderColor: border,
                color: text,
              }}
            >
              <option value="fr">
                Français
              </option>

              <option value="en">
                English
              </option>

              <option value="es">
                Español
              </option>
            </select>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{
            background:
              "linear-gradient(135deg,#003883,#d20073)",
          }}
        >
          Enregistrer
        </button>
      </div>
    </div>
  )
}

function Row({
  label,
  desc,
  children,
}: {
  label: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold">
          {label}
        </p>

        <p className="text-xs opacity-50">
          {desc}
        </p>
      </div>

      {children}
    </div>
  )
}

function Toggle({
  on,
  toggle,
}: {
  on: boolean
  toggle: () => void
}) {
  return (
    <button
      onClick={toggle}
      className="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200"
      style={{
        background: on
          ? "linear-gradient(135deg,#003883,#d20073)"
          : "#CBD5E1",
      }}
    >
      <span
        className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{
          transform: on
            ? "translateX(20px)"
            : "translateX(0)",
        }}
      />
    </button>
  )
}

/* ── Logout modal ────────────────────────────────────────────── */

function LogoutModal({
  dark,
  onClose,
  onConfirm,
}: {
  dark: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const bg = dark ? "#161B27" : "#ffffff"
  const text = dark ? "#E2E8F0" : "#1E293B"
  const cancelBg = dark ? "#1C2033" : "#F4F6F9"

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{
          background: bg,
          color: text,
        }}
      >
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#EF4444"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </div>
        </div>

        <h2 className="mb-2 text-center text-lg font-bold">
          Se déconnecter ?
        </h2>

        <p className="mb-6 text-center text-sm opacity-50">
          Vous serez redirigé vers la page de connexion.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{
              background: cancelBg,
              color: text,
            }}
          >
            Annuler
          </button>

          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════ */
/* Main App */
/* ══════════════════════════════════════════════════════════════ */

export default function App() {
  const [isAuthenticated, setIsAuthenticated] =
    useState(false)

  const [currentUser, setCurrentUser] =
    useState<AuthUser | null>(null)

  const [loadingSession, setLoadingSession] =
    useState(true)

  /* ── Restaurer la session après F5 ─ */

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(SESSION_KEY)

      if (saved) {
        const user = JSON.parse(
          saved
        ) as AuthUser

        if (
          user &&
          user.id !== undefined &&
          user.email
        ) {
          const restoredUser: AuthUser = {
            id: user.id,
            name: user.name || "",
            email: user.email,
            role:
              user.role === "admin"
                ? "admin"
                : "user",
          }

          setCurrentUser(restoredUser)
          setIsAuthenticated(true)
        }
      }
    } catch (error) {
      console.error(
        "Erreur restauration session :",
        error
      )

      localStorage.removeItem(
        SESSION_KEY
      )
    } finally {
      setLoadingSession(false)
    }
  }, [])

  /* ── HEARTBEAT UTILISATEUR ─ */

  useEffect(() => {
    if (!currentUser?.id) return

    const sendHeartbeat = async () => {
      try {
        await fetch(
          `${API_URL}/api/users/${currentUser.id}/heartbeat`,
          {
            method: "POST",
          }
        )
      } catch (error) {
        console.error(
          "Erreur heartbeat :",
          error
        )
      }
    }

    // Premier heartbeat immédiatement
    sendHeartbeat()

    // Puis toutes les 30 secondes
    const interval = setInterval(
      sendHeartbeat,
      30000
    )

    // Arrêter le heartbeat quand l'utilisateur
    // se déconnecte ou change de compte
    return () =>
      clearInterval(interval)
  }, [currentUser?.id])

  /* ── Login ─ */

  const handleLogin = (
    user: AuthUser
  ) => {
    setCurrentUser(user)
    setIsAuthenticated(true)

    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify(user)
    )
  }

  /* ── Logout réel ─ */

  const handleLogout = () => {
    localStorage.removeItem(
      SESSION_KEY
    )

    setCurrentUser(null)
    setIsAuthenticated(false)
  }

  if (loadingSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#003883]"
        />
      </div>
    )
  }

  if (
    !isAuthenticated ||
    !currentUser
  ) {
    return (
      <AuthPage
        onLogin={handleLogin}
      />
    )
  }

  /* ── Dashboard administrateur ── */

  if (currentUser.role === "admin") {
    return (
      <AdminDashboard
        user={currentUser}
        onLogout={handleLogout}
        onSwitchToChat={() => {
          const updatedUser: AuthUser = {
            ...currentUser,
            role: "user",
          }

          setCurrentUser(updatedUser)

          localStorage.setItem(
            SESSION_KEY,
            JSON.stringify(updatedUser)
          )
        }}
      />
    )
  }

  /* ── Chat utilisateur ── */

  return (
    <ChatApp
      user={currentUser}
      onLogout={handleLogout}
    />
  )
}

/* ══════════════════════════════════════════════════════════════ */
/* Chat App */
/* ══════════════════════════════════════════════════════════════ */

function ChatApp({
  user,
  onLogout,
}: {
  user: AuthUser
  onLogout: () => void
}) {
  /* layout */
  const [sidebarOpen, setSidebarOpen] =
    useState(true)

  const [darkMode, setDarkMode] =
    useState(false)

  /* data */
  const [chats, setChats] =
    useState<ChatItem[]>(
      INITIAL_CHATS
    )

  const [activeChat, setActiveChat] =
    useState("")

  const [messages, setMessages] =
    useState<Message[]>([])

  const [loadingChats, setLoadingChats] =
    useState(true)

  /* input */
  const [input, setInput] =
    useState("")

  const [isTyping, setIsTyping] =
    useState(false)

  const [isRecording, setIsRecording] =
    useState(false)

  /* UI */
  const [model, setModel] =
    useState<
      (typeof MODELS)[number]
    >(MODELS[0])

  const [modelOpen, setModelOpen] =
    useState(false)

  const [copiedId, setCopiedId] =
    useState<string | null>(null)

  const [speakingId, setSpeakingId] =
    useState<string | null>(null)

  const [hoveredChat, setHoveredChat] =
    useState<string | null>(null)

  const [renamingId, setRenamingId] =
    useState<string | null>(null)

  const [renameVal, setRenameVal] =
    useState("")

  const [showSettings, setShowSettings] =
    useState(false)

  const [showLogout, setShowLogout] =
    useState(false)

  /* toasts */
  const [toasts, setToasts] =
    useState<Toast[]>([])

  /* refs */
  const textareaRef =
    useRef<HTMLTextAreaElement>(null)

  const renameRef =
    useRef<HTMLInputElement>(null)

  const fileRef =
    useRef<HTMLInputElement>(null)

  const bottomRef =
    useRef<HTMLDivElement>(null)

  const modelRef =
    useRef<HTMLDivElement>(null)

  /* ═══════════════════════════════════════════════ */
  /* LOAD USER CONVERSATIONS */
  /* ═══════════════════════════════════════════════ */

  useEffect(() => {
    const loadChats = async () => {
      setLoadingChats(true)

      try {
        const data =
          await getConversations(
            user.id
          )

        const converted: ChatItem[] =
          data.map((chat) => ({
            id: String(chat.id),
            title:
              chat.title ||
              "Nouvelle conversation",
            group: getChatGroup(
              chat.updated_at ||
                chat.created_at
            ),
          }))

        setChats(converted)

        // Ouvrir un chat vierge à chaque ouverture de l'espace utilisateur.
        // La conversation sera enregistrée à l'envoi de la première question.
        setActiveChat("")
        setMessages([])
      } catch (error) {
        console.error(
          "Erreur chargement conversations :",
          error
        )

        toast(
          "Impossible de charger votre historique.",
          "⚠️",
          "error"
        )
      } finally {
        setLoadingChats(false)
      }
    }

    loadChats()
  }, [user.id])

  /* ═══════════════════════════════════════════════ */
  /* LOAD ACTIVE CONVERSATION */
  /* ═══════════════════════════════════════════════ */

    
  useEffect(() => {
    if (!activeChat) {
      setMessages([])
      return
    }

    const loadMessages = async () => {
  if (
    activeChat === undefined ||
    activeChat === null ||
    activeChat === ""
  ) {
    setMessages([])
    return
  }

  try {
    const data =
      await getConversationMessages(
        activeChat
      )

    const converted: Message[] =
      data.map((message) => ({
        id: String(message.id),
        role: message.role,
        content: message.content,
        liked: null,
      }))

    setMessages(converted)
  } catch (error) {
    console.error(
      "Erreur chargement messages :",
      error
    )

    toast(
      "Impossible de charger cette conversation.",
      "⚠️",
      "error"
    )
  }
}

loadMessages()
  }, [activeChat])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    })
  }, [messages, isTyping])

  useEffect(() => {
    if (renamingId) {
      renameRef.current?.focus()
    }
  }, [renamingId])

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (
        modelRef.current &&
        !modelRef.current.contains(
          e.target as Node
        )
      ) {
        setModelOpen(false)
      }
    }

    document.addEventListener(
      "mousedown",
      fn
    )

    return () =>
      document.removeEventListener(
        "mousedown",
        fn
      )
  }, [])

  /* ── toast helpers ─ */

  const toast = (
    message: string,
    icon = "✓",
    type: Toast["type"] = "success"
  ) => {
    const id =
      Date.now().toString()

    setToasts((p) => [
      ...p,
      {
        id,
        message,
        icon,
        type,
      },
    ])

    setTimeout(
      () =>
        setToasts((p) =>
          p.filter(
            (t) => t.id !== id
          )
        ),
      3500
    )
  }

  const removeToast = (
    id: string
  ) =>
    setToasts((p) =>
      p.filter(
        (t) => t.id !== id
      )
    )

  /* ═══════════════════════════════════════════════ */
  /* CREATE CHAT IF NECESSARY */
  /* ═══════════════════════════════════════════════ */

  const ensureConversation =
    async (
      firstMessage?: string
    ): Promise<string> => {
      if (activeChat) {
        return activeChat
      }

      const title =
        firstMessage?.trim()
          ? firstMessage
              .trim()
              .slice(0, 60)
          : "Nouveau chat"

      const conversation =
        await createConversation(
          user.id,
          title
        )

      const id = String(
        conversation.id
      )

      const chat: ChatItem = {
        id,
        title:
          conversation.title ||
          title,
        group: "today",
      }

      setChats((p) => [
        chat,
        ...p,
      ])

      setActiveChat(id)

      return id
    }

  /* ═══════════════════════════════════════════════ */
  /* SEND MESSAGE → RAG API */
  /* ═══════════════════════════════════════════════ */

  const send = async (
    text = input
  ) => {
    const cleanText =
      text.trim()

    if (
      !cleanText ||
      isTyping
    ) {
      return
    }

    let conversationId =
      activeChat

    try {
      /* Créer une conversation si nécessaire */
      if (!conversationId) {
        conversationId =
          await ensureConversation(
            cleanText
          )
      }

      /* Nommer la conversation dès la première question et persister le titre. */
      const currentChat = chats.find(chat => chat.id === conversationId)
      const defaultTitles = ["", "Nouveau chat", "Nouvelle conversation"]
      if (
        !messages.some(message => message.role === "user") &&
        defaultTitles.includes(currentChat?.title.trim() || "")
      ) {
        const title = cleanText.replace(/\s+/g, " ").slice(0, 60)
        setChats(previous => previous.map(chat =>
          chat.id === conversationId ? {...chat, title} : chat
        ))
        try {
          await renameConversation(conversationId, title)
        } catch (error) {
          console.error("Erreur enregistrement du titre :", error)
          toast("Le titre n'a pas pu être enregistré.", "⚠️")
        }
      }

      /* Message utilisateur */
      const tempUserId =
        `user-${Date.now()}`

      const userMsg: Message = {
        id: tempUserId,
        role: "user",
        content: cleanText,
        liked: null,
      }

      setMessages((p) => [
        ...p,
        userMsg,
      ])

      setInput("")

      if (textareaRef.current) {
        textareaRef.current.style.height =
          "auto"
      }

      /* Sauvegarder le message utilisateur */
      try {
        const savedUser =
          await saveMessage(
            conversationId,
            "user",
            cleanText
          )

        setMessages((p) =>
          p.map((m) =>
            m.id === tempUserId
              ? {
                  ...m,
                  id: String(
                    savedUser.id
                  ),
                }
              : m
          )
        )
      } catch (error) {
        console.error(
          "Erreur sauvegarde message utilisateur :",
          error
        )
      }

      setIsTyping(true)

      const selectedProvider = model.provider
      const response =
        await sendMessage(
          cleanText,
          selectedProvider,
          5
        )

      const aiContent =
        response.answer ||
        "Je n'ai pas pu générer de réponse."

      const aiMsg: Message = {
        id:
          `assistant-${Date.now()}`,
        role: "assistant",
        content: aiContent,
        liked: null,
        sources:
          response.sources || [],
      }

      setMessages((p) => [
        ...p,
        aiMsg,
      ])

      /* Sauvegarder réponse IA */
      try {
        const savedAI =
          await saveMessage(
            conversationId,
            "assistant",
            aiContent,
            undefined,
            selectedProvider
          )

        setMessages((p) =>
          p.map((m) =>
            m.id === aiMsg.id
              ? {
                  ...m,
                  id: String(
                    savedAI.id
                  ),
                }
              : m
          )
        )
      } catch (error) {
        console.error(
          "Erreur sauvegarde réponse IA :",
          error
        )
      }


    } catch (error) {
      console.error(
        "Erreur RAG :",
        error
      )

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de la communication avec le serveur."

      setMessages((p) => [
        ...p,
        {
          id:
            `error-${Date.now()}`,
          role: "assistant",
          content:
            `Désolé, une erreur est survenue.\n\n${errorMessage}`,
          liked: null,
        },
      ])

      toast(
        "Erreur de communication avec le serveur RAG",
        "⚠️",
        "error"
      )
    } finally {
      setIsTyping(false)
    }
  }

  const onKey = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault()
      send()
    }
  }

  const resize = () => {
    const el =
      textareaRef.current

    if (!el) return

    el.style.height =
      "auto"

    el.style.height =
      Math.min(
        el.scrollHeight,
        160
      ) + "px"
  }


  const newChat = async () => {
    try {
      const conversation =
        await createConversation(
          user.id,
          "Nouveau chat"
        )

      const id = String(
        conversation.id
      )

      const fresh: ChatItem = {
        id,
        title:
          conversation.title ||
          "Nouveau chat",
        group: "today",
      }

      setChats((p) => [
        fresh,
        ...p,
      ])

      setActiveChat(id)
      setMessages([])

      if (
        window.innerWidth < 768
      ) {
        setSidebarOpen(false)
      }
    } catch (error) {
      console.error(
        "Erreur nouveau chat :",
        error
      )

      toast(
        "Impossible de créer une nouvelle conversation.",
        "⚠️",
        "error"
      )
    }
  }

  const selectChat = (
    id: string
  ) => {
    setActiveChat(id)

    if (
      window.innerWidth < 768
    ) {
      setSidebarOpen(false)
    }
  }

  const startRename = (
    chat: ChatItem
  ) => {
    setRenamingId(chat.id)
    setRenameVal(chat.title)
  }

  const saveRename = async (
    id: string
  ) => {
    const title =
      renameVal.trim()

    if (!title) {
      setRenamingId(null)
      return
    }

    try {
      await renameConversation(
        id,
        title
      )

      setChats((p) =>
        p.map((c) =>
          c.id === id
            ? {
                ...c,
                title,
              }
            : c
        )
      )

      toast(
        "Conversation renommée",
        "✏️"
      )
    } catch (error) {
      console.error(
        "Erreur renommage :",
        error
      )

      toast(
        "Impossible de renommer la conversation.",
        "⚠️",
        "error"
      )
    }

    setRenamingId(null)
  }

  const deleteChat = async (
    id: string
  ) => {
    try {
      await removeConversation(
        id
      )

      const remaining =
        chats.filter(
          (c) => c.id !== id
        )

      setChats(remaining)

      if (
        activeChat === id
      ) {
        const next =
          remaining[0]

        if (next) {
          setActiveChat(next.id)
        } else {
          setActiveChat("")
          setMessages([])
        }
      }

      toast(
        "Conversation supprimée",
        "🗑️",
        "info"
      )
    } catch (error) {
      console.error(
        "Erreur suppression :",
        error
      )

      toast(
        "Impossible de supprimer la conversation.",
        "⚠️",
        "error"
      )
    }
  }

  /* ── message actions ─ */

  const toggleLike = (
    id: string,
    val: boolean
  ) => {
    setMessages((p) =>
      p.map((m) =>
        m.id === id
          ? {
              ...m,
              liked:
                m.liked === val
                  ? null
                  : val,
            }
          : m
      )
    )
  }

  const copy = (
    content: string,
    id: string
  ) => {
    navigator.clipboard
      .writeText(content)
      .catch(() => {})

    setCopiedId(id)

    setTimeout(
      () => setCopiedId(null),
      2000
    )

    toast(
      "Copié dans le presse-papiers",
      "📋"
    )
  }

  /* ── regenerate ─ */

  const regenerate = async () => {
    const lastUser = [
      ...messages,
    ]
      .reverse()
      .find(
        (m) =>
          m.role === "user"
      )

    const lastAI = [
      ...messages,
    ]
      .reverse()
      .find(
        (m) =>
          m.role === "assistant"
      )

    if (!lastUser) {
      return
    }

    if (lastAI) {
      setMessages((p) =>
        p.filter(
          (m) =>
            m.id !== lastAI.id
        )
      )
    }

    setIsTyping(true)

    toast(
      "Régénération en cours…",
      "🔄",
      "info"
    )

    try {
      const selectedProvider = model.provider
      const response =
        await sendMessage(
          lastUser.content,
          selectedProvider,
          5
        )

      const content =
        response.answer

      setMessages((p) => [
        ...p,
        {
          id:
            Date.now().toString(),
          role: "assistant",
          content,
          liked: null,
          sources:
            response.sources || [],
        },
      ])

      if (activeChat) {
        await saveMessage(
          activeChat,
          "assistant",
          content,
          undefined,
          selectedProvider
        )
      }
    } catch (error) {
      console.error(
        "Erreur régénération :",
        error
      )

      setMessages((p) => [
        ...p,
        {
          id:
            Date.now().toString(),
          role: "assistant",
          content:
            "Impossible de régénérer la réponse. Vérifiez que le backend RAG est bien démarré.",
          liked: null,
        },
      ])

      toast(
        "Erreur lors de la régénération",
        "⚠️",
        "error"
      )
    } finally {
      setIsTyping(false)
    }
  }

  /* ── speak ─ */

  const speak = (
    text: string,
    id: string
  ) => {
    if (
      speakingId === id
    ) {
      window.speechSynthesis.cancel()
      setSpeakingId(null)
      return
    }

    window.speechSynthesis.cancel()

    const utt =
      new SpeechSynthesisUtterance(
        text
          .replace(/\*\*/g, "")
          .replace(
            /^- /gm,
            ""
          )
      )

    utt.lang = "fr-FR"

    utt.onend = () =>
      setSpeakingId(null)

    setSpeakingId(id)

    window.speechSynthesis.speak(
      utt
    )

    toast(
      "Lecture vocale démarrée",
      "🔊"
    )
  }

  /* ── toolbar actions ─ */

  const share = () => {
    navigator.clipboard
      .writeText(
        window.location.href
      )
      .catch(() => {})

    toast(
      "Lien copié dans le presse-papiers",
      "🔗"
    )
  }

  const exportPDF = () =>
    toast(
      "Export PDF en cours de préparation…",
      "📄",
      "info"
    )

  const clearChat = () => {
    setMessages([])

    toast(
      "Conversation effacée de l'affichage",
      "🧹",
      "info"
    )
  }

  /* ── mic ─ */

  const toggleMic =
    async () => {
      if (isRecording) {
        setIsRecording(false)

        toast(
          "Dictée terminée",
          "🎤"
        )

        return
      }

      try {
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
          }
        )

        setIsRecording(true)

        toast(
          "Dictée en cours… (Cliquez à nouveau pour arrêter)",
          "🎙️",
          "info"
        )
      } catch {
        toast(
          "Accès au microphone refusé",
          "🚫",
          "error"
        )
      }
    }

  /* ── logout ─ */

  const confirmLogout = () => {
    setShowLogout(false)

    toast(
      "Déconnexion en cours…",
      "👋",
      "info"
    )

    setTimeout(
      () => onLogout(),
      500
    )
  }

  /* ── dark mode colors ─ */

  const dk = darkMode

  const sidebar = dk
    ? "#161B27"
    : "#ffffff"

  const mainBg = dk
    ? "#0F1117"
    : "#ffffff"

  const border = dk
    ? "#2D3748"
    : "#E2E8F0"

  const cardBg = dk
    ? "#1C2033"
    : "#F4F6F9"

  const msgAiBg = dk
    ? "#1A1F2E"
    : "#F8FAFC"

  const textPrimary = dk
    ? "#E2E8F0"
    : "#1E293B"

  const textMuted = "#94A3B8"

  const hoverBg = dk
    ? "#1C2033"
    : "#F4F6F9"

  const inputBg = dk
    ? "#161B27"
    : "#ffffff"

  const headerBg = dk
    ? "rgba(22,27,39,0.9)"
    : "rgba(255,255,255,0.85)"

  const grouped = {
    today: chats.filter(
      (c) => c.group === "today"
    ),
    week: chats.filter(
      (c) => c.group === "week"
    ),
    month: chats.filter(
      (c) => c.group === "month"
    ),
  }

  /* ── sidebar ─ */

  const SidebarInner = () => (
    <>
      <div
        className="flex flex-shrink-0 items-center gap-3 border-b px-4 py-3.5"
        style={{
          borderColor: border,
        }}
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm"
          style={{
            background:
              "linear-gradient(135deg,#003883,#d20073)",
          }}
        >
          <BotIcon />
        </div>

        <span
          className="text-base font-bold tracking-tight"
          style={{
            background:
              "linear-gradient(135deg,#003883,#d20073)",
            WebkitBackgroundClip:
              "text",
            WebkitTextFillColor:
              "transparent",
          }}
        >
          BoursoBot
        </span>

        <button
          className="ml-auto rounded-lg p-1.5 opacity-40 transition-opacity hover:opacity-100"
          style={{
            color: textPrimary,
          }}
          onClick={() =>
            setSidebarOpen(false)
          }
        >
          <PanelClose />
        </button>
      </div>

      <div className="flex-shrink-0 px-3 pb-2 pt-3">
        <button
          onClick={newChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg active:scale-[0.98]"
          style={{
            background:
              "linear-gradient(135deg,#003883,#d20073)",
          }}
        >
          <PlusIcon />
          Nouveau Chat
        </button>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-2 py-1">
        {loadingChats ? (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-[#003883]" />
          </div>
        ) : chats.length === 0 ? (
          <div
            className="px-3 py-6 text-center text-xs"
            style={{
              color: textMuted,
            }}
          >
            Aucune conversation
          </div>
        ) : (
          [
            {
              label: "Aujourd'hui",
              items: grouped.today,
            },
            {
              label: "7 derniers jours",
              items: grouped.week,
            },
            {
              label: "Ce mois-ci",
              items: grouped.month,
            },
          ].map(
            ({
              label,
              items,
            }) =>
              items.length === 0
                ? null
                : (
                  <div
                    key={label}
                    className="mb-4"
                  >
                    <p
                      className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest"
                      style={{
                        color:
                          textMuted,
                      }}
                    >
                      {label}
                    </p>

                    {items.map(
                      (chat) => {
                        const isActive =
                          chat.id ===
                          activeChat

                        const isHovered =
                          hoveredChat ===
                          chat.id

                        const isRenaming =
                          renamingId ===
                          chat.id

                        return (
                          <div
                            key={
                              chat.id
                            }
                            onClick={() =>
                              !isRenaming &&
                              selectChat(
                                chat.id
                              )
                            }
                            onMouseEnter={() =>
                              setHoveredChat(
                                chat.id
                              )
                            }
                            onMouseLeave={() =>
                              setHoveredChat(
                                null
                              )
                            }
                            className="group relative flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 transition-all duration-150"
                            style={
                              isActive
                                ? {
                                    backgroundColor:
                                      dk
                                        ? "rgba(74,127,212,0.12)"
                                        : "rgba(0,56,131,0.08)",
                                    borderLeft:
                                      "2px solid #d20073",
                                    paddingLeft: 6,
                                  }
                                : {
                                    borderLeft:
                                      "2px solid transparent",
                                  }
                            }
                          >
                            <ChatBubble
                              className="h-3.5 w-3.5 flex-shrink-0 opacity-40"
                              style={{
                                color:
                                  isActive
                                    ? "#003883"
                                    : textPrimary,
                              }}
                            />

                            {isRenaming ? (
                              <input
                                ref={
                                  renameRef
                                }
                                value={
                                  renameVal
                                }
                                onChange={(
                                  e
                                ) =>
                                  setRenameVal(
                                    e
                                      .target
                                      .value
                                  )
                                }
                                onKeyDown={(
                                  e
                                ) => {
                                  if (
                                    e.key ===
                                    "Enter"
                                  ) {
                                    saveRename(
                                      chat.id
                                    )
                                  }

                                  if (
                                    e.key ===
                                    "Escape"
                                  ) {
                                    setRenamingId(
                                      null
                                    )
                                  }
                                }}
                                onBlur={() =>
                                  saveRename(
                                    chat.id
                                  )
                                }
                                className="flex-1 rounded bg-transparent text-xs outline-none"
                                style={{
                                  color:
                                    textPrimary,
                                  borderBottom:
                                    "1px solid #003883",
                                }}
                                onClick={(
                                  e
                                ) =>
                                  e.stopPropagation()
                                }
                              />
                            ) : (
                              <span
                                className="flex-1 truncate text-xs"
                                style={{
                                  color:
                                    isActive
                                      ? "#003883"
                                      : textPrimary,
                                  fontWeight:
                                    isActive
                                      ? 600
                                      : 400,
                                }}
                              >
                                {
                                  chat.title
                                }
                              </span>
                            )}

                            {(isHovered ||
                              isActive) &&
                              !isRenaming && (
                                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                  <button
                                    onClick={(
                                      e
                                    ) => {
                                      e.stopPropagation()
                                      startRename(
                                        chat
                                      )
                                    }}
                                    className="rounded p-1 transition-colors hover:text-[#003883]"
                                    style={{
                                      color:
                                        textMuted,
                                    }}
                                    title="Renommer"
                                  >
                                    <PencilIcon />
                                  </button>

                                  <button
                                    onClick={(
                                      e
                                    ) => {
                                      e.stopPropagation()
                                      deleteChat(
                                        chat.id
                                      )
                                    }}
                                    className="rounded p-1 transition-colors hover:text-red-500"
                                    style={{
                                      color:
                                        textMuted,
                                    }}
                                    title="Supprimer"
                                  >
                                    <TrashIcon />
                                  </button>
                                </div>
                              )}
                          </div>
                        )
                      }
                    )}
                  </div>
                )
          )
        )}
      </div>

      <div
        className="flex-shrink-0 border-t px-3 py-3"
        style={{
          borderColor: border,
        }}
      >
        <div
          className="flex cursor-pointer items-center gap-3 rounded-xl p-2 transition-colors hover:opacity-80"
          style={{
            background: hoverBg,
          }}
        >
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{
              background:
                "linear-gradient(135deg,#003883,#d20073)",
            }}
          >
            {user.name
              .split(" ")
              .map(
                (w) => w[0]
              )
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p
                className="truncate text-xs font-semibold"
                style={{
                  color:
                    textPrimary,
                }}
              >
                {user.name}
              </p>

              <span
                className="flex-shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white"
                style={{
                  backgroundColor:
                    "#d20073",
                }}
              >
                PRO
              </span>
            </div>

            <p
              className="truncate text-[10px]"
              style={{
                color:
                  textMuted,
              }}
            >
              {user.email}
            </p>
          </div>
        </div>

        <div className="mt-1 flex items-center justify-around">
          <SbBtn
            title="Paramètres"
            onClick={() =>
              setShowSettings(true)
            }
            style={{
              color: textMuted,
            }}
          >
            <SettingsIcon />
          </SbBtn>

          <SbBtn
            title={
              dk
                ? "Mode clair"
                : "Mode sombre"
            }
            onClick={() => {
              setDarkMode(
                (p) => !p
              )

              toast(
                dk
                  ? "Mode clair activé"
                  : "Mode sombre activé",
                dk
                  ? "☀️"
                  : "🌙"
              )
            }}
            style={{
              color: dk
                ? "#F59E0B"
                : textMuted,
            }}
          >
            {dk ? (
              <SunIcon />
            ) : (
              <MoonIcon />
            )}
          </SbBtn>

          <SbBtn
            title="Déconnexion"
            onClick={() =>
              setShowLogout(true)
            }
            style={{
              color: textMuted,
            }}
            hoverRed
          >
            <LogoutIcon />
          </SbBtn>
        </div>
      </div>
    </>
  )

  /* ═══════════════════════════════════════════════ */
  /* RENDER */
  /* ═══════════════════════════════════════════════ */

  return (
    <div
      className={
        dk ? "dark" : ""
      }
      style={{
        fontFamily:
          "'Plus Jakarta Sans', sans-serif",
        height: "100%",
      }}
    >
      <div
        className="flex h-full w-full overflow-hidden"
        style={{
          background: mainBg,
          color: textPrimary,
        }}
      >
        <Toasts
          items={toasts}
          remove={removeToast}
        />

        {showSettings && (
          <SettingsModal
            dark={dk}
            onClose={() =>
              setShowSettings(false)
            }
            onToggleDark={() =>
              setDarkMode(
                (p) => !p
              )
            }
          />
        )}

        {showLogout && (
          <LogoutModal
            dark={dk}
            onClose={() =>
              setShowLogout(false)
            }
            onConfirm={
              confirmLogout
            }
          />
        )}

        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f =
              e.target.files?.[0]

            if (f) {
              toast(
                `Fichier joint : ${f.name}`,
                "📎"
              )
            }

            e.target.value = ""
          }}
        />

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/20 backdrop-blur-sm md:hidden"
            onClick={() =>
              setSidebarOpen(false)
            }
          />
        )}

        <div
          className="hidden flex-shrink-0 flex-col overflow-hidden border-r transition-[width] duration-300 md:flex"
          style={{
            width: sidebarOpen
              ? 280
              : 0,
            background: sidebar,
            borderColor: border,
          }}
        >
          <div className="flex h-full w-[280px] flex-col">
            <SidebarInner />
          </div>
        </div>

        <div
          className={`fixed left-0 top-0 z-30 flex h-full w-[280px] flex-col border-r transition-transform duration-300 md:hidden ${
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }`}
          style={{
            background: sidebar,
            borderColor: border,
          }}
        >
          <SidebarInner />
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <header
            className="flex flex-shrink-0 items-center gap-2 border-b px-3 py-2.5 backdrop-blur-sm"
            style={{
              background: headerBg,
              borderColor: border,
            }}
          >
            {!sidebarOpen && (
              <button
                className="rounded-lg p-2 opacity-50 transition-opacity hover:opacity-100"
                style={{
                  color:
                    textPrimary,
                }}
                onClick={() =>
                  setSidebarOpen(
                    true
                  )
                }
              >
                <MenuIcon />
              </button>
            )}

            <div
              className="relative"
              ref={modelRef}
            >
              <button
                onClick={() =>
                  setModelOpen(
                    (p) => !p
                  )
                }
                className="flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all hover:shadow-sm"
                style={{
                  borderColor:
                    border,
                  background:
                    inputBg,
                  color:
                    textPrimary,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      "#d20073",
                  }}
                />

                {model.label}

                <ChevronDown
                  className={`transition-transform ${
                    modelOpen
                      ? "rotate-180"
                      : ""
                  }`}
                />
              </button>

              {modelOpen && (
                <div
                  className="absolute left-0 top-full z-50 mt-1.5 min-w-[190px] overflow-hidden rounded-xl border shadow-xl"
                  style={{
                    background:
                      sidebar,
                    borderColor:
                      border,
                  }}
                >
                  {MODELS.map(
                    (m) => (
                      <button
                        key={
                          m.provider
                        }
                        onClick={() => {
                          setModel(
                            m
                          )
                          setModelOpen(
                            false
                          )

                          toast(
                            `Modèle : ${m.label}`,
                            "🤖"
                          )
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:opacity-80"
                        style={{
                          background:
                            m.provider ===
                            model.provider
                              ? cardBg
                              : "transparent",
                          color:
                            m.provider ===
                            model.provider
                              ? "#003883"
                              : textPrimary,
                          fontWeight:
                            m.provider ===
                            model.provider
                              ? 600
                              : 400,
                        }}
                      >
                        <CheckIcon
                          className={
                            m.provider ===
                            model.provider
                              ? "opacity-100"
                              : "opacity-0"
                          }
                        />

                        <div className="flex flex-col">
                          <span>
                            {
                              m.label
                            }
                          </span>

                          <span className="text-[10px] opacity-60">
                            {
                              m.description
                            }
                          </span>
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-0.5">
              <HdrBtn
                label="Partager"
                color={textMuted}
                hoverBg={hoverBg}
                onClick={
                  share
                }
              >
                <ShareIcon />
              </HdrBtn>

              <HdrBtn
                label="Exporter PDF"
                color={textMuted}
                hoverBg={hoverBg}
                onClick={
                  exportPDF
                }
              >
                <DownloadIcon />
              </HdrBtn>

              <HdrBtn
                label="Nettoyer le chat"
                color={textMuted}
                hoverBg={hoverBg}
                onClick={
                  clearChat
                }
              >
                <EraserIcon />
              </HdrBtn>
            </div>
          </header>

          <div className="scrollbar-thin flex-1 overflow-y-auto">
            {messages.length ===
              0 &&
            !isTyping ? (
              <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
                <div
                  className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
                  style={{
                    background:
                      "linear-gradient(135deg,#003883,#d20073)",
                  }}
                >
                  <BotIconLg />
                </div>

                <h1
                  className="mb-2 text-center text-2xl font-bold"
                  style={{
                    color:
                      textPrimary,
                  }}
                >
                  Bonjour, comment puis-je vous aider ?
                </h1>

                <p
                  className="mb-10 max-w-sm text-center text-sm"
                  style={{
                    color:
                      textMuted,
                  }}
                >
                  Votre assistant financier intelligent BoursoBank est prêt à vous accompagner.
                </p>

                <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                  {SUGGESTIONS.map(
                    (s, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setInput(
                            s.title
                          )

                          textareaRef.current?.focus()
                        }}
                        className="group flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 hover:shadow-md"
                        style={{
                          background:
                            cardBg,
                          borderColor:
                            border,
                        }}
                      >
                        <span className="mt-0.5 flex-shrink-0 text-xl">
                          {
                            s.emoji
                          }
                        </span>

                        <div className="min-w-0 flex-1">
                          <p
                            className="text-sm font-semibold transition-colors group-hover:text-[#003883]"
                            style={{
                              color:
                                textPrimary,
                            }}
                          >
                            {
                              s.title
                            }
                          </p>

                          <p
                            className="mt-0.5 text-xs leading-relaxed"
                            style={{
                              color:
                                textMuted,
                            }}
                          >
                            {
                              s.desc
                            }
                          </p>
                        </div>

                        <ArrowRight className="mt-0.5 flex-shrink-0 text-[#d20073] opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    )
                  )}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
                {messages.map(
                  (msg) =>
                    msg.role ===
                    "user" ? (
                      <div
                        key={
                          msg.id
                        }
                        className="flex justify-end"
                      >
                        <div
                          className="max-w-[75%] rounded-[18px] rounded-tr-sm px-4 py-3 text-sm leading-relaxed text-white"
                          style={{
                            backgroundColor:
                              "#003883",
                          }}
                        >
                          {
                            msg.content
                          }
                        </div>
                      </div>
                    ) : (
                      <div
                        key={
                          msg.id
                        }
                        className="group flex gap-3"
                      >
                        <div
                          className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl shadow-sm"
                          style={{
                            background:
                              "linear-gradient(135deg,#003883,#d20073)",
                          }}
                        >
                          <BotIconSm />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div
                            className="max-w-[88%] rounded-2xl rounded-tl-sm px-4 py-3"
                            style={{
                              background:
                                msgAiBg,
                              color:
                                textPrimary,
                            }}
                          >
                            <div className="space-y-1">
                              {parseContent(
                                msg.content
                              )}
                            </div>


                          </div>

                          <div className="mt-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <MsgBtn
                              label="Copier"
                              active={
                                copiedId ===
                                msg.id
                              }
                              onClick={() =>
                                copy(
                                  msg.content,
                                  msg.id
                                )
                              }
                              hoverBg={
                                hoverBg
                              }
                            >
                              {copiedId ===
                              msg.id ? (
                                <CheckSmIcon />
                              ) : (
                                <CopyIcon />
                              )}
                            </MsgBtn>

                            <MsgBtn
                              label="Régénérer"
                              onClick={
                                regenerate
                              }
                              hoverBg={
                                hoverBg
                              }
                            >
                              <RefreshIcon />
                            </MsgBtn>

                            <MsgBtn
                              label="J'aime"
                              active={
                                msg.liked ===
                                true
                              }
                              onClick={() =>
                                toggleLike(
                                  msg.id,
                                  true
                                )
                              }
                              hoverBg={
                                hoverBg
                              }
                            >
                              <ThumbUpIcon />
                            </MsgBtn>

                            <MsgBtn
                              label="Je n'aime pas"
                              active={
                                msg.liked ===
                                false
                              }
                              onClick={() =>
                                toggleLike(
                                  msg.id,
                                  false
                                )
                              }
                              hoverBg={
                                hoverBg
                              }
                            >
                              <ThumbDownIcon />
                            </MsgBtn>

                            <MsgBtn
                              label={
                                speakingId ===
                                msg.id
                                  ? "Arrêter la lecture"
                                  : "Lire à voix haute"
                              }
                              active={
                                speakingId ===
                                msg.id
                              }
                              onClick={() =>
                                speak(
                                  msg.content,
                                  msg.id
                                )
                              }
                              hoverBg={
                                hoverBg
                              }
                            >
                              <VolumeIcon
                                pulse={
                                  speakingId ===
                                  msg.id
                                }
                              />
                            </MsgBtn>
                          </div>
                        </div>
                      </div>
                    )
                )}

                {isTyping && (
                  <div className="flex gap-3">
                    <div
                      className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl shadow-sm"
                      style={{
                        background:
                          "linear-gradient(135deg,#003883,#d20073)",
                      }}
                    >
                      <BotIconSm />
                    </div>

                    <div
                      className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm px-4 py-3.5"
                      style={{
                        background:
                          msgAiBg,
                      }}
                    >
                      {[0, 150, 300].map(
                        (d) => (
                          <div
                            key={d}
                            className="h-2 w-2 animate-bounce rounded-full bg-gray-300"
                            style={{
                              animationDelay: `${d}ms`,
                            }}
                          />
                        )
                      )}
                    </div>
                  </div>
                )}

                <div
                  ref={bottomRef}
                />
              </div>
            )}
          </div>

          <div
            className="flex-shrink-0 px-4 pb-4 pt-2"
            style={{
              background: mainBg,
            }}
          >
            <div className="mx-auto max-w-3xl">
              <div
                className="relative overflow-hidden rounded-2xl border transition-all duration-200"
                style={{
                  background:
                    inputBg,
                  borderColor:
                    border,
                  boxShadow:
                    "0 2px 20px rgba(0,0,0,0.07)",
                }}
              >
                <textarea
                  ref={
                    textareaRef
                  }
                  rows={1}
                  value={input}
                  onChange={(e) => {
                    setInput(
                      e.target.value
                    )
                    resize()
                  }}
                  onKeyDown={onKey}
                  placeholder="Posez votre question financière..."
                  className="block w-full resize-none bg-transparent px-4 pb-2 pt-4 text-sm outline-none"
                  style={{
                    minHeight: 52,
                    maxHeight: 160,
                    color:
                      textPrimary,
                  }}
                />

                <div className="flex items-center gap-2 px-3 pb-3">
                  <button
                    onClick={() =>
                      fileRef.current?.click()
                    }
                    title="Joindre un fichier"
                    className="rounded-lg p-1.5 transition-colors hover:text-[#003883]"
                    style={{
                      color:
                        textMuted,
                    }}
                  >
                    <PaperclipIcon />
                  </button>

                  <button
                    onClick={
                      toggleMic
                    }
                    title={
                      isRecording
                        ? "Arrêter la dictée"
                        : "Dictée vocale"
                    }
                    className="rounded-lg p-1.5 transition-colors hover:text-[#003883]"
                    style={{
                      color:
                        isRecording
                          ? "#d20073"
                          : textMuted,
                    }}
                  >
                    <MicIcon
                      pulse={
                        isRecording
                      }
                    />
                  </button>

                  <div className="flex-1" />

                  {input.length >
                    0 && (
                    <span
                      className="text-[10px]"
                      style={{
                        color:
                          textMuted,
                      }}
                    >
                      {
                        input.length
                      }
                    </span>
                  )}

                  <button
                    onClick={() =>
                      send()
                    }
                    disabled={
                      !input.trim() ||
                      isTyping
                    }
                    title="Envoyer"
                    className="flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
                    style={
                      input.trim() &&
                      !isTyping
                        ? {
                            background:
                              "linear-gradient(135deg,#003883,#d20073)",
                            color:
                              "white",
                            boxShadow:
                              "0 2px 8px rgba(0,56,131,0.3)",
                          }
                        : {
                            background:
                              cardBg,
                            color:
                              textMuted,
                          }
                    }
                  >
                    <SendIcon />
                  </button>
                </div>
              </div>

              <p
                className="mt-2 text-center text-[10px]"
                style={{
                  color:
                    textMuted,
                }}
              >
                L'IA peut générer des informations inexactes. Vérifiez toujours les informations importantes.
              </p>
            </div>
          </div>
        </main>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(110%);
            opacity: 0;
          }

          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }

          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  )
}

/* ── Date grouping ───────────────────────────────────────────── */

function getChatGroup(
  dateString?: string
): "today" | "week" | "month" {
  if (!dateString) {
    return "month"
  }

  const date =
    new Date(dateString)

  if (Number.isNaN(date.getTime())) {
    return "month"
  }

  const now = new Date()

  const startToday =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    )

  const diff =
    startToday.getTime() -
    date.getTime()

  const oneDay =
    24 * 60 * 60 * 1000

  if (
    date >= startToday
  ) {
    return "today"
  }

  if (
    diff <=
    7 * oneDay
  ) {
    return "week"
  }

  return "month"
}

/* ── Small helper components ─────────────────────────────────── */

function SbBtn({
  children,
  title,
  onClick,
  style,
  hoverRed,
}: {
  children: React.ReactNode
  title: string
  onClick?: () => void
  style?: React.CSSProperties
  hoverRed?: boolean
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={style}
      className={`rounded-lg p-2 opacity-60 transition-all hover:opacity-100 ${
        hoverRed
          ? "hover:text-red-500"
          : "hover:text-[#003883]"
      }`}
    >
      {children}
    </button>
  )
}

function HdrBtn({
  children,
  label,
  onClick,
  color,
  hoverBg,
}: {
  children: React.ReactNode
  label: string
  onClick?: () => void
  color: string
  hoverBg: string
}) {
  const [hov, setHov] =
    useState(false)

  return (
    <button
      title={label}
      onClick={onClick}
      onMouseEnter={() =>
        setHov(true)
      }
      onMouseLeave={() =>
        setHov(false)
      }
      className="rounded-lg p-2 transition-colors"
      style={{
        color,
        background:
          hov
            ? hoverBg
            : "transparent",
      }}
    >
      {children}
    </button>
  )
}

function MsgBtn({
  children,
  label,
  active = false,
  onClick,
  hoverBg,
}: {
  children: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
  hoverBg: string
}) {
  const [hov, setHov] =
    useState(false)

  return (
    <button
      title={label}
      onClick={onClick}
      onMouseEnter={() =>
        setHov(true)
      }
      onMouseLeave={() =>
        setHov(false)
      }
      className="rounded-lg p-1.5 transition-colors"
      style={{
        background: active
          ? "rgba(0,56,131,0.1)"
          : hov
            ? hoverBg
            : "transparent",
        color: active
          ? "#003883"
          : "#94A3B8",
      }}
    >
      {children}
    </button>
  )
}

/* ── SVG icons ───────────────────────────────────────────────── */

function BotIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="8" width="18" height="13" rx="3" stroke="white" strokeWidth="1.6" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="9" cy="14" r="1.5" fill="white" />
      <circle cx="15" cy="14" r="1.5" fill="white" />
      <path d="M9.5 17.5s.833.5 2.5.5 2.5-.5 2.5-.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function BotIconLg() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="8" width="18" height="13" rx="3" stroke="white" strokeWidth="1.5" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9" cy="14" r="1.5" fill="white" />
      <circle cx="15" cy="14" r="1.5" fill="white" />
      <path d="M9.5 17.5s.833.5 2.5.5 2.5-.5 2.5-.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function BotIconSm() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="8" width="18" height="13" rx="3" stroke="white" strokeWidth="1.8" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="14" r="1.5" fill="white" />
      <circle cx="15" cy="14" r="1.5" fill="white" />
    </svg>
  )
}

function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function PanelClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 9l-3 3 3 3" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function ChatBubble({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="3,6 5,6 21,6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  )
}

function ChevronDown({
  className,
}: {
  className?: string
}) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function CheckIcon({
  className,
}: {
  className?: string
}) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <path d="M9 15l3 3 3-3" />
    </svg>
  )
}

function EraserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M20 20H7L3 16l10-10 7 7-3.5 3.5" />
      <path d="M6.5 17.5 16 8" />
    </svg>
  )
}

function ArrowRight({
  className,
}: {
  className?: string
}) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckSmIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="23,4 23,10 17,10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}

function ThumbUpIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  )
}

function ThumbDownIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
      <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    </svg>
  )
}

function VolumeIcon({
  pulse,
}: {
  pulse?: boolean
}) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      style={
        pulse
          ? {
              animation:
                "pulse 1s ease-in-out infinite",
            }
          : {}
      }
    >
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

function PaperclipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}

function MicIcon({
  pulse,
}: {
  pulse?: boolean
}) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      style={
        pulse
          ? {
              animation:
                "pulse 0.8s ease-in-out infinite",
            }
          : {}
      }
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  )
}