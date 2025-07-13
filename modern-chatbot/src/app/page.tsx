"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Send, Plus, MessageCircle, Bot, User, Sparkles, MoreVertical, Trash2, Edit3, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Link from "next/link"
import { ReasoningDialog } from "@/components/reasoning-dialog"

interface ReasonChunk {
  text: string
  full_text?: string
  score: number
  source?: string
  source_document?: string
  page_range?: string
  page?: string | number
  chunk_index?: number
  upload_date?: string
  created_at?: string
  summary?: string
  tags?: string[]
  token_count?: number
  // Add other possible field variations
  document?: string
  document_name?: string
  file_name?: string
}

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: string
  reason?: ReasonChunk[]
}

interface Session {
  session_id: string
  title: string
  created_at?: string
}

// Prefer env var (e.g. https://api.example.com).
// Fallback to same-origin so preview works.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || ""

export default function ModernChatbot() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showReasonDialog, setShowReasonDialog] = useState(false)
  const [currentReason, setCurrentReason] = useState<ReasonChunk[]>([])
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [sessionToRename, setSessionToRename] = useState<Session | null>(null)
  const [newSessionTitle, setNewSessionTitle] = useState("")
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false)
  const [newConversationTitle, setNewConversationTitle] = useState("")

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    loadSessions()
  }, [])

  const handleApiError = (error: any, defaultMessage: string) => {
    console.error(error)
    const errorMessage = error.response?.data?.detail || error.message || defaultMessage
    setError(errorMessage)
    setTimeout(() => setError(null), 5000)
  }

  const loadSessions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions`, { credentials: "include" })
      if (!response.ok) throw new Error("Failed to load sessions")

      const sessionsData = await response.json()
      setSessions(sessionsData)

      if (sessionsData.length > 0 && !currentSessionId) {
        setCurrentSessionId(sessionsData[0].session_id)
        loadSession(sessionsData[0].session_id)
      }
    } catch (error) {
      handleApiError(error, "Failed to load sessions")
    }
  }

  const handleCreateSession = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/new-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: newConversationTitle.trim() || "New Conversation" }),
        credentials: "include",
      })

      if (!response.ok) throw new Error("Failed to create session")

      const data = await response.json()
      setCurrentSessionId(data.session_id)
      setMessages([])
      await loadSessions()
      setShowNewSessionDialog(false)
      setNewConversationTitle("")
    } catch (error) {
      handleApiError(error, "Failed to create new session")
    }
  }

  const loadSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId)
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/chat/${sessionId}`, { credentials: "include" })
      if (!response.ok) throw new Error("Failed to load chat history")

      const chats = await response.json()

      // 🔧 Ensure each message has a timestamp
      const enrichedChats: Message[] = chats.map((msg: any) => ({
        ...msg,
        timestamp: msg.timestamp || new Date().toISOString(), // fallback
      }))

      setMessages(enrichedChats)
    } catch (error) {
      handleApiError(error, "Failed to load chat history")
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!inputValue.trim() || !currentSessionId || isTyping) return

    const userMessage: Message = {
      role: "user",
      content: inputValue,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: currentSessionId,
          question: userMessage.content,
        }),
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to get response")
      }

      const data = await response.json()

      const aiMessage: Message = {
        role: "assistant",
        content: data.answer,
        timestamp: new Date().toISOString(),
        reason: data.reason || [],
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      handleApiError(error, "Failed to send message")

      // Add error message to chat
      const errorMessage: Message = {
        role: "assistant",
        content: "I'm sorry, I encountered an error while processing your request. Please try again.",
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const deleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/session/${sessionId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) throw new Error("Failed to delete session")

      await loadSessions()

      if (currentSessionId === sessionId) {
        setCurrentSessionId(null)
        setMessages([])
      }
    } catch (error) {
      handleApiError(error, "Failed to delete session")
    }
  }

  const handleRenameSession = async () => {
    if (!sessionToRename || !newSessionTitle.trim()) return

    try {
      const response = await fetch(`${API_BASE_URL}/session/${sessionToRename.session_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ new_title: newSessionTitle }),
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to rename session")
      }

      await loadSessions()
      setShowRenameDialog(false)
      setSessionToRename(null)
      setNewSessionTitle("")
    } catch (error) {
      handleApiError(error, "Failed to rename session")
    }
  }

  const openRenameDialog = (session: Session) => {
    setSessionToRename(session)
    setNewSessionTitle(session.title)
    setShowRenameDialog(true)
  }

  const showReason = (reasonChunks: ReasonChunk[]) => {
    setCurrentReason(reasonChunks)
    setCurrentSourceIndex(0)
    setShowReasonDialog(true)
  }

  const nextSource = () => {
    setCurrentSourceIndex((prev) => (prev + 1) % currentReason.length)
  }

  const prevSource = () => {
    setCurrentSourceIndex((prev) => (prev - 1 + currentReason.length) % currentReason.length)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (dateString?: string): string => {
    if (!dateString || typeof dateString !== "string") return "Unknown"

    try {
      const date = new Date(dateString.trim())
      if (isNaN(date.getTime())) return "Unknown"

      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    } catch {
      return "Unknown"
    }
  }

  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return "Unknown"
    try {
      const now = new Date()
      const date = new Date(dateString.trim())
      if (isNaN(date.getTime())) return "Unknown"

      const diff = now.getTime() - date.getTime()
      const minutes = Math.floor(diff / (1000 * 60))
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))

      if (minutes < 1) return "Just now"
      if (minutes < 60) return `${minutes}m ago`
      if (hours < 24) return `${hours}h ago`
      return `${days}d ago`
    } catch {
      return "Unknown"
    }
  }

  const currentChunk = currentReason[currentSourceIndex]

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in slide-in-from-top-2">
          {error}
        </div>
      )}

      {/* Sidebar */}
      <div className="w-80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI Assistant
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Your intelligent companion</p>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => setShowNewSessionDialog(true)}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Conversation
            </Button>

            <Link href="/upload" className="block">
              <Button
                variant="outline"
                className="w-full border-2 border-dashed border-blue-300 dark:border-blue-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 bg-transparent"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload PDF to Vector DB
              </Button>
            </Link>
          </div>
        </div>

        {/* Sessions List */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {sessions.map((session) => (
              <Card
                key={session.session_id}
                className={`p-4 cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.02] border-0 group ${
                  currentSessionId === session.session_id
                    ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 ring-2 ring-blue-200 dark:ring-blue-700"
                    : "bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-800/80"
                }`}
                onClick={() => loadSession(session.session_id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">{session.title}</h3>
                    {session.created_at && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                        {formatRelativeTime(session.created_at)}
                      </p>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          openRenameDialog(session)
                        }}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSession(session.session_id)
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">AI Assistant</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-slate-500 dark:text-slate-400">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="text-slate-500 dark:text-slate-400">Loading conversation...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <Bot className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                  <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">Start a conversation</h3>
                  <p className="text-slate-500 dark:text-slate-500">
                    Ask me anything and I'll help you find the information you need.
                  </p>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex gap-4 animate-in slide-in-from-bottom-4 duration-500 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div className={`max-w-[70%] ${message.role === "user" ? "order-1" : ""}`}>
                    <div
                      className={`p-4 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white ml-auto"
                          : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/50 dark:border-slate-700/50"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

                      {message.reason && message.reason.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-6 text-xs opacity-70 hover:opacity-100 transition-opacity"
                          onClick={() => showReason(message.reason!)}
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          Show reasoning ({message.reason.length} sources)
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {formatTime(message.timestamp)}
                      </span>
                      {message.role === "assistant" && (
                        <Badge variant="secondary" className="text-xs">
                          AI
                        </Badge>
                      )}
                    </div>
                  </div>

                  {message.role === "user" && (
                    <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex gap-4 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="pr-12 py-3 text-sm bg-white/50 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-700/50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300"
                disabled={isTyping || !currentSessionId}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <MessageCircle className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            <Button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isTyping || !currentSessionId}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
            Press Enter to send • Shift + Enter for new line
          </p>
        </div>
      </div>

      {/* New Session Dialog */}
      <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Start New Conversation</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="new-title" className="text-right">
                Title
              </label>
              <Input
                id="new-title"
                value={newConversationTitle}
                onChange={(e) => setNewConversationTitle(e.target.value)}
                placeholder="e.g., My Project Discussion"
                className="col-span-3"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowNewSessionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSession}>Create Conversation</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Session Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Session</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right">
                New Title
              </label>
              <Input
                id="name"
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameSession}>Save changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reasoning Dialog */}
      <ReasoningDialog
        open={showReasonDialog}
        onOpenChange={setShowReasonDialog}
        reasonChunks={currentReason}
        currentIndex={currentSourceIndex}
        onIndexChange={setCurrentSourceIndex}
      />
    </div>
  )
}
