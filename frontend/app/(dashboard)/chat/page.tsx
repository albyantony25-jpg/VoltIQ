"use client"

import { useState, useEffect, useRef } from "react"
import { ChatInterface, Message } from "@/components/ai/ChatInterface"
import { SuggestedQuestions } from "@/components/ai/SuggestedQuestions"
import { MessageSquarePlus, MessageSquare, Trash2, X, ChevronLeft } from "lucide-react"

export default function ChatDashboardPage() {
    const MOCK_HOME_ID = "00000000-0000-0000-0000-000000000000"
    const MOCK_USER_ID = "11111111-1111-1111-1111-111111111111"

    const [sessions, setSessions] = useState<any[]>([])
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [isStreaming, setIsStreaming] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Load Sessions
    const loadSessions = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/chat/sessions/${MOCK_USER_ID}`)
            if (res.ok) {
                const data = await res.json()
                setSessions(data)
            }
        } catch (e) {
            console.error("Failed to load sessions")
        }
    }

    // Load specific session history
    const loadHistory = async (sessId: string) => {
        setActiveSessionId(sessId)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/chat/sessions/${MOCK_USER_ID}/messages/${sessId}`)
            if (res.ok) {
                const data = await res.json()
                // Convert to frontend model
                const formatted = data.messages.map((m: any, idx: number) => ({
                    id: `db_${idx}`,
                    role: m.role,
                    content: m.content || JSON.stringify(m.tool_calls) // Fallback for tool payloads
                })).filter((m: any) => m.role !== 'system') // Hide system prompts

                setMessages(formatted)
            }
        } catch (e) {
            console.error(e)
        }
    }

    useEffect(() => {
        loadSessions()
    }, [])

    const createNewChat = () => {
        setActiveSessionId(null)
        setMessages([])
        setError(null)
    }

    const deleteSession = async (sessId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/chat/sessions/${sessId}`, { method: 'DELETE' })
            setSessions(s => s.filter(x => x.id !== sessId))
            if (activeSessionId === sessId) createNewChat()
        } catch (e) { }
    }

    const sendMessage = async (text: string) => {
        if (!text.trim()) return;

        setError(null)

        // Optimistic UI update
        const userMsgId = Date.now().toString()
        const aimsgId = (Date.now() + 1).toString()

        setMessages(prev => [...prev, { id: userMsgId, role: "user", content: text }])
        setIsStreaming(true)

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/chat/stream`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    home_id: MOCK_HOME_ID,
                    message: text,
                    session_id: activeSessionId
                })
            })

            if (!response.body) throw new Error("No readable stream available")

            // Real SSE reader
            const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()

            setMessages(prev => [...prev, { id: aimsgId, role: "assistant", content: "", isStreaming: true }])

            let accumulatedResponse = ""

            while (true) {
                const { value, done } = await reader.read()
                if (done) break

                // Split multiple SSE chunks inside standard payload
                const lines = value.split('\n\n')
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const payload = line.replace('data: ', '').trim()
                        if (payload === '[DONE]') break

                        try {
                            const parsed = JSON.parse(payload)

                            if (parsed.type === "meta" && parsed.session_id && !activeSessionId) {
                                // Record the newly generated backend session UUID
                                setActiveSessionId(parsed.session_id)
                            }
                            else if (parsed.error) {
                                setError(parsed.error)
                            }
                            else if (parsed.token) {
                                // Important: We replace exact \n injected by json.dumps backend stream format
                                const tokenStr = parsed.token.replace(/\\n/g, '\n')
                                accumulatedResponse += tokenStr

                                setMessages(prev => prev.map(m =>
                                    m.id === aimsgId ? { ...m, content: accumulatedResponse } : m
                                ))
                            }
                        } catch (e) {
                            console.warn("Junk token:", payload)
                        }
                    }
                }
            }

            // End streaming state
            setMessages(prev => prev.map(m =>
                m.id === aimsgId ? { ...m, isStreaming: false } : m
            ))

            // Refresh sessions list if it was a new chat
            if (!activeSessionId) {
                loadSessions()
            }

        } catch (err: any) {
            setError(err.message || "Failed to reach AI Engine")
        } finally {
            setIsStreaming(false)
        }
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] w-full pb-6 relative z-10">

            {/* Left Panel: Sessions List */}
            <div className={`w-full lg:w-1/4 h-full bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col shadow-inner shrink-0 ${activeSessionId ? 'hidden lg:flex' : 'flex'}`}>
                <button
                    onClick={createNewChat}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-2 transition-all mb-4"
                >
                    <MessageSquarePlus className="w-4 h-4" /> New Chat
                </button>

                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-2">History</h4>

                <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-2">
                    {sessions.map(s => (
                        <div
                            key={s.id}
                            onClick={() => loadHistory(s.id)}
                            className={`group w-full text-left px-3 py-3 rounded-lg flex items-center justify-between cursor-pointer transition-colors border
                                ${activeSessionId === s.id ? 'bg-slate-800 border-slate-700' : 'bg-transparent border-transparent hover:bg-slate-800/50 hover:border-slate-700'}`}
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <MessageSquare className={`w-4 h-4 shrink-0 ${activeSessionId === s.id ? 'text-indigo-400' : 'text-slate-500'}`} />
                                <span className="text-sm font-medium text-slate-300 truncate">
                                    {new Date(s.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <button
                                onClick={(e) => deleteSession(s.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all shrink-0"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {sessions.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-6">No previous conversations.</p>
                    )}
                </div>
            </div>

            {/* Right Panel: Chat Interface */}
            <div className={`w-full lg:w-3/4 flex-1 h-full flex flex-col min-w-0 ${!activeSessionId ? 'hidden lg:flex' : 'flex'}`}>
                {activeSessionId && (
                    <div className="lg:hidden mb-4">
                        <button onClick={() => setActiveSessionId(null)} className="flex items-center gap-2 text-slate-400 hover:text-white">
                            <ChevronLeft className="w-4 h-4" /> Back to history
                        </button>
                    </div>
                )}
                <div className="flex-1 pb-4 min-h-0">
                    <ChatInterface
                        messages={messages}
                        isStreaming={isStreaming}
                        error={error}
                        onSend={sendMessage}
                        onRetry={() => { }} // Could replay last message
                    />
                </div>

                {/* Suggestions pinned below the chat interface (only visible explicitly if empty chat inside Interface, or can sit out here) */}
                {messages.length === 0 && (
                    <div className="px-2 pb-2">
                        <SuggestedQuestions onSelect={sendMessage} />
                    </div>
                )}
            </div>

        </div>
    )
}
