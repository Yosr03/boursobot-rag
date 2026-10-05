const API_URL = "http://127.0.0.1:8000"
const SESSION_KEY = "bourso_user"

export interface Source {
  document: string
  metadata: Record<string, any>
  distance?: number | null
}

export interface ChatResponse {
  question: string
  answer: string
  sources: Source[]
}

export async function sendMessage(
  message: string,
  provider: string = "OpenRouter",
  nResults: number = 5
): Promise<ChatResponse> {

  const response = await fetch(
    `${API_URL}/api/chat`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        message,
        provider,
        n_results: nResults,
      }),
    }
  )

  if (!response.ok) {
    let errorMessage = "Erreur lors de la communication avec le serveur."

    try {
      const errorData = await response.json()

      if (errorData.detail) {
        errorMessage = errorData.detail
      }
    } catch {
      // On conserve le message d'erreur par défaut
    }

    throw new Error(errorMessage)
  }

  return response.json()
}

export interface Conversation {
  id: number
  title: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: number
  role: "user" | "assistant"
  content: string
  sources_json?: string | null
  created_at: string
}

export async function getConversations(
  userId: number
): Promise<Conversation[]> {

  const response = await fetch(
    `${API_URL}/api/conversations/${userId}`
  )

  if (!response.ok) {
    throw new Error(
      "Impossible de charger les conversations."
    )
  }

  const data = await response.json()

  return Array.isArray(data) ? data : (data.conversations ?? [])
}

export async function getMessages(
  conversationId: number,
  userId: number
): Promise<Message[]> {

  const response = await fetch(
    `${API_URL}/api/conversations/${conversationId}/messages?user_id=${userId}`
  )

  if (!response.ok) {
    throw new Error(
      "Impossible de charger les messages."
    )
  }

  const data = await response.json()

  return Array.isArray(data) ? data : (data.messages ?? [])
}

export interface SavedMessage {
  id: number
  role: "user" | "assistant"
  content: string
  sources_json?: string | null
  created_at: string
}

export async function saveMessage(
  conversationId: number,
  role: "user" | "assistant",
  content: string,
  sources?: any[]
): Promise<SavedMessage> {

  // Récupérer l'utilisateur actuellement connecté
const storedUser = localStorage.getItem(SESSION_KEY)

  if (!storedUser) {
    throw new Error("Utilisateur non connecté.")
  }

  const user = JSON.parse(storedUser)

  const response = await fetch(
    `${API_URL}/api/messages`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        conversation_id: conversationId,
        user_id: user.id,
        role,
        content,
        sources_json: sources
          ? JSON.stringify(sources)
          : null,
      }),
    }
  )

  if (!response.ok) {

    let message =
      "Impossible de sauvegarder le message."

    try {
      const data = await response.json()

      if (data.detail) {
        message = data.detail
      }

    } catch {
      // Message par défaut
    }

    throw new Error(message)
  }

  return response.json()
}