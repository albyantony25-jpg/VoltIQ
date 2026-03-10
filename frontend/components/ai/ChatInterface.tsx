"use client"

import { useState, useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Sparkles, User, Copy, CheckCircle2, ChevronDown, RefreshCw } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"

export type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
    isStreaming?: boolean;
}

interface ChatInterfaceProps {
    messages: Message[];
    isStreaming: boolean;
    error: string | null;
    onSend: (msg: string) => void;
    onRetry: () => void;
}

export function ChatInterface({ messages, isStreaming, error, onSend, onRetry }: ChatInterfaceProps) {
    const [input, setInput] = useState("")
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const endRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const prefersReducedMotion = useReducedMotion()

    // Auto-scroll to bottom of chat
    const scrollToBottom = () => {
        endRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isStreaming])

    // Dynamic resize of text area
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [input])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            const val = input.trim()
            if (val && !isStreaming) {
                onSend(val)
                setInput("")
            }
        }
    }

    const copyToClipboard = (id: string, text: string) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    return (
        <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative">

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto opacity-70">
                        <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 border border-indigo-500/20">
                            <Sparkles className="h-8 w-8 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">EnergyIQ Assistant</h3>
                        <p className="text-sm text-slate-400">Your AI-powered energy analyst. Ask about anomalies, appliance costs, or how to reduce your next bill.</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={prefersReducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className={`flex gap-4 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                        >
                            {/* Avatar */}
                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 border shadow-sm
                                ${msg.role === 'user' ? 'bg-slate-800 border-slate-700' : 'bg-indigo-600 border-indigo-500'}`}
                            >
                                {msg.role === 'user' ? <User className="h-4 w-4 text-slate-300" /> : <Sparkles className="h-4 w-4 text-white" />}
                            </div>

                            {/* Bubble */}
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                                <span className={`text-[10px] uppercase tracking-wider font-bold px-1 ${msg.role === 'user' ? 'text-right text-slate-500' : 'text-left text-indigo-400'}`}>
                                    {msg.role === 'user' ? 'You' : 'VoltIQ Insight'}
                                </span>

                                <div className={`relative group px-5 py-4 text-sm leading-relaxed rounded-2xl
                                    ${msg.role === 'user'
                                        ? 'bg-slate-800 text-slate-200 rounded-tr-sm self-end'
                                        : 'bg-slate-900 border border-slate-700 w-full text-slate-300 rounded-tl-sm'}`}
                                >
                                    {msg.role === 'user' ? (
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    ) : (
                                        <div className="prose prose-invert prose-indigo max-w-none text-sm font-medium prose-p:leading-relaxed prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    )}

                                    {/* Action row (Copy) */}
                                    {msg.role === 'assistant' && !msg.isStreaming && (
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => copyToClipboard(msg.id, msg.content)}
                                                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-400 border border-slate-700 transition-colors"
                                            >
                                                {copiedId === msg.id ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                            </button>
                                        </div>
                                    )}

                                    {msg.isStreaming && (
                                        <div className="inline-flex items-center gap-1 mt-1 align-middle ml-2">
                                            {[0, 1, 2].map(i => (
                                                <motion.div
                                                    key={i}
                                                    className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
                                                    animate={prefersReducedMotion ? {} : { y: [0, -4, 0] }}
                                                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}

                {/* Streaming Wait State */}
                {isStreaming && messages.length > 0 && !messages[messages.length - 1].isStreaming && (
                    <div className="flex gap-4 max-w-3xl animate-in fade-in zoom-in-95 duration-300">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 border-indigo-500 border flex items-center justify-center mt-1">
                            <Sparkles className="h-4 w-4 text-white animate-spin-slow" />
                        </div>
                        <div className="px-5 py-4 bg-slate-900 border border-slate-700 rounded-2xl rounded-tl-sm mt-5">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={onRetry} className="flex items-center gap-1 text-xs font-bold hover:underline">
                            <RefreshCw className="w-3 h-3" /> Retry
                        </button>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-950 border-t border-slate-800">
                <div className="relative flex items-end gap-2 max-w-3xl mx-auto">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isStreaming ? "Thinking..." : "Ask EnergyIQ anything..."}
                        disabled={isStreaming}
                        rows={1}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 pr-14 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all shadow-inner custom-scrollbar overflow-hidden"
                    />
                    <button
                        onClick={() => {
                            if (input.trim() && !isStreaming) {
                                onSend(input.trim())
                                setInput("")
                            }
                        }}
                        disabled={isStreaming || !input.trim()}
                        className={`absolute right-2 bottom-2 p-2 rounded-lg 
                                  ${(input.trim() && !isStreaming) ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-slate-800 text-slate-500'} 
                                  transition-colors flex-shrink-0`}
                    >
                        <ChevronDown className="h-4 w-4 transform -rotate-90" strokeWidth={3} />
                    </button>
                </div>
                <div className="text-center mt-2">
                    <span className="text-[10px] text-slate-600 font-medium">EnergyIQ can make mistakes. Check important numbers.</span>
                </div>
            </div>
        </div>
    )
}
