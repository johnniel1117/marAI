"use client"
import { useState, useRef, useEffect } from "react"
import type React from "react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mic, Volume2, VolumeX, Send, MessageCircle, X, Trash2, Paperclip } from "lucide-react"

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
  image?: string
  location?: string
}

interface Language {
  code: string
  name: string
  flag: string
}

interface SuggestedMessage {
  text: string
  icon: string
  shouldRedirect?: boolean
}

const languages: Language[] = [
  { code: "en-US", name: "English", flag: "🇺🇸" },
  { code: "ceb-PH", name: "Cebuano", flag: "🇵🇭" },
  { code: "fil-PH", name: "Filipino", flag: "🇵🇭" },
  { code: "es-ES", name: "Spanish", flag: "🇪🇸" },
  { code: "fr-FR", name: "French", flag: "🇫🇷" },
  { code: "de-DE", name: "German", flag: "🇩🇪" },
  { code: "ja-JP", name: "Japanese", flag: "🇯🇵" },
  { code: "ko-KR", name: "Korean", flag: "🇰🇷" },
  { code: "zh-CN", name: "Chinese", flag: "🇨🇳" },
]

const commissionSuggestions: SuggestedMessage[] = [
  { text: "What are your current commission rates?", icon: "💰", shouldRedirect: false }, // Only this stays in chat
  { text: "Hi! I'm interested in getting a portrait commission. Can you help me?", icon: "🎨", shouldRedirect: true },
  { text: "I'd like to order an A4 portrait, is there a slot available?", icon: "📝", shouldRedirect: true },
  { text: "Do you accept rush orders for portraits?", icon: "⚡", shouldRedirect: true },
]

function convertMarkdownLinksToHTML(text: string): string {
  return text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-emerald-300 hover:text-emerald-200 underline">$1</a>',
  )
}

export default function MarAIAssistant() {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [speechEnabled, setSpeechEnabled] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(languages[0])
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [currentMessage, setCurrentMessage] = useState(
    "Good day. I'm MAR, your personal AI assistant. I'm here to help you with anything you need - from answering questions to solving problems. How may I assist you today?",
  )

  const recognitionRef = useRef<any | null>(null)
  const synthRef = useRef<any | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    console.log("[v0] Initializing speech recognition...")
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognition) {
        console.log("[v0] Speech recognition available")
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang =
          selectedLanguage.code === "ceb-PH"
            ? "en-US"
            : selectedLanguage.code === "fil-PH"
              ? "en-US"
              : selectedLanguage.code

        recognitionRef.current.onresult = (event) => {
          console.log("[v0] Speech recognition result:", event.results[0][0].transcript)
          const transcript = event.results[0][0].transcript
          setIsListening(false)
          handleUserInput(transcript)
        }

        recognitionRef.current.onerror = (event) => {
          console.log("[v0] Speech recognition error:", event.error)
          setIsListening(false)
          setCurrentMessage("Speech recognition error. Please try again or use the chat.")
        }

        recognitionRef.current.onend = () => {
          console.log("[v0] Speech recognition ended")
          setIsListening(false)
        }
      } else {
        console.log("[v0] Speech recognition not available")
        setCurrentMessage("Voice recognition not available. Please use the chat below.")
      }
    }

    // Initialize speech synthesis
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis
    }
  }, [selectedLanguage])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (showChat) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [showChat])

  const getBestVoice = () => {
    if (!synthRef.current) return null

    const voices = synthRef.current.getVoices()
    let preferredVoices: string[] = []

    if (selectedLanguage.code.startsWith("en")) {
      preferredVoices = [
        "Google UK English Female",
        "Google US English Female",
        "Microsoft Zira Desktop - English (United States)",
        "Microsoft David Desktop - English (United States)",
        "Alex",
        "Samantha",
        "Karen",
        "Moira",
        "Daniel",
        "Fiona",
      ]
    } else if (selectedLanguage.code === "fil-PH") {
      preferredVoices = [
        "Google Filipino Female",
        "Google Filipino",
        "Microsoft Filipino Female",
        "Microsoft Filipino",
        "Google US English Female",
        "Microsoft Zira Desktop - English (United States)",
      ]
    } else if (selectedLanguage.code === "ceb-PH") {
      preferredVoices = [
        "Google Filipino Female",
        "Google Filipino",
        "Microsoft Filipino Female",
        "Microsoft Filipino",
        "Google US English Female",
        "Microsoft Zira Desktop - English (United States)",
      ]
    } else if (selectedLanguage.code === "es-ES") {
      preferredVoices = [
        "Google español Female",
        "Google español",
        "Microsoft Helena Desktop - Spanish (Spain)",
        "Monica",
        "Paulina",
      ]
    } else if (selectedLanguage.code === "fr-FR") {
      preferredVoices = [
        "Google français Female",
        "Google français",
        "Microsoft Hortense Desktop - French (France)",
        "Amelie",
        "Thomas",
      ]
    } else {
      const langCode = selectedLanguage.code.split("-")[0]
      const langVoices = voices.filter((voice) => voice.lang.startsWith(langCode))
      const femaleVoices = langVoices.filter(
        (voice) =>
          voice.name.toLowerCase().includes("female") ||
          voice.name.toLowerCase().includes("woman") ||
          voice.name.includes("Zira") ||
          voice.name.includes("Helena") ||
          voice.name.includes("Hortense"),
      )
      preferredVoices = [...femaleVoices.map((v) => v.name), ...langVoices.map((v) => v.name)]
    }

    for (const preferredName of preferredVoices) {
      const voice = voices.find((v) => v.name.includes(preferredName) || v.name === preferredName)
      if (voice) return voice
    }

    const langCode = selectedLanguage.code.split("-")[0]
    const fallbackVoice = voices.find((voice) => voice.lang.startsWith(langCode))
    return fallbackVoice || voices.find((voice) => voice.name.toLowerCase().includes("female")) || voices[0]
  }

  const preprocessTextForSpeech = (text: string): string => {
    let processedText = text

    if (selectedLanguage.code === "ceb-PH") {
      processedText = processedText
        .replace(/\bnga\b/gi, "ngah")
        .replace(/\bang\b/gi, "ahng")
        .replace(/\bsa\b/gi, "sah")
        .replace(/\bni\b/gi, "nee")
        .replace(/\bsi\b/gi, "see")
        .replace(/\bka\b/gi, "kah")
        .replace(/\bko\b/gi, "koh")
        .replace(/\bmo\b/gi, "moh")
        .replace(/\bta\b/gi, "tah")
        .replace(/\bto\b/gi, "toh")
        .replace(/\bay\b/gi, "ah-ee")
        .replace(/\bog\b/gi, "ohg")
        .replace(/\bug/g, "oog")
        .replace(/\bpag\b/gi, "pahg")
        .replace(/\bmag\b/gi, "mahg")
        .replace(/\bnag/g, "nahg")
        .replace(/\bkaayo\b/gi, "kah-ah-yoh")
        .replace(/\bmao\b/gi, "mah-oh")
        .replace(/\bjud\b/gi, "jood")
        .replace(/\bgyud\b/gi, "gyood")
    } else if (selectedLanguage.code === "fil-PH") {
      processedText = processedText
        .replace(/\bng\b/gi, "nahng")
        .replace(/\bsa\b/gi, "sah")
        .replace(/\bna\b/gi, "nah")
        .replace(/\bka\b/gi, "kah")
        .replace(/\bko\b/gi, "koh")
        .replace(/\bmo\b/gi, "moh")
        .replace(/\btayo\b/gi, "tah-yoh")
        .replace(/\bkayo\b/gi, "kah-yoh")
        .replace(/\bsila\b/gi, "see-lah")
    }

    processedText = processedText
      .replace(/[.]{2,}/g, ".")
      .replace(/[!]{2,}/g, "!")
      .replace(/[?]{2,}/g, "?")
      .replace(/\s+/g, " ")
      .trim()

    return processedText
  }

  const startListening = () => {
    console.log("[v0] Starting to listen...")
    if (recognitionRef.current && !isListening) {
      setIsListening(true)
      setCurrentMessage("Listening...")
      try {
        recognitionRef.current.start()
      } catch (error) {
        console.log("[v0] Error starting recognition:", error)
        setIsListening(false)
        setCurrentMessage("Could not start voice recognition. Please use the chat.")
      }
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const speak = (text: string) => {
    // Check if speech is enabled before speaking
    if (!speechEnabled || !synthRef.current) {
      console.log("[v0] Speech disabled or synthesis not available")
      return
    }

    console.log("[v0] Speaking:", text)
    synthRef.current.cancel()

    const processedText = preprocessTextForSpeech(text)
    const utterance = new SpeechSynthesisUtterance(processedText)

    const bestVoice = getBestVoice()
    if (bestVoice) {
      utterance.voice = bestVoice
    }

    utterance.rate = 1.0
    utterance.pitch = 0.95
    utterance.volume = 0.9

    // Language-specific natural settings
    if (selectedLanguage.code === "fil-PH") {
      utterance.rate = 0.95
      utterance.pitch = 0.92
    } else if (selectedLanguage.code === "ceb-PH") {
      utterance.rate = 0.9
      utterance.pitch = 0.88
    } else if (selectedLanguage.code.startsWith("es")) {
      utterance.rate = 1.05
      utterance.pitch = 0.96
    } else if (selectedLanguage.code.startsWith("fr")) {
      utterance.rate = 0.98
      utterance.pitch = 1.0
    } else if (selectedLanguage.code.startsWith("en")) {
      utterance.rate = 1.1
      utterance.pitch = 0.94
    }

    utterance.onstart = () => {
      console.log("[v0] Speech started")
      setIsSpeaking(true)
    }
    
    utterance.onend = () => {
      console.log("[v0] Speech ended")
      setIsSpeaking(false)
      setCurrentMessage("Ready to help you with anything...")
    }
    
    utterance.onerror = (error) => {
      console.log("[v0] Speech error:", error)
      setIsSpeaking(false)
    }

    synthRef.current.speak(utterance)
  }

  const stopSpeaking = () => {
    if (synthRef.current) {
      console.log("[v0] Stopping speech")
      synthRef.current.cancel()
      setIsSpeaking(false)
    }
  }

  // Function to redirect to MARQ Facebook page
  const redirectToMarqPage = () => {
    window.open('https://www.facebook.com/marqph', '_blank')
  }

  const handleSuggestedMessageClick = (suggestion: SuggestedMessage) => {
    if (suggestion.shouldRedirect) {
      // Redirect to MARQ Facebook page
      redirectToMarqPage()
      setCurrentMessage(`Redirecting to MARQ Facebook page for: "${suggestion.text}"`)
    } else {
      // Handle in chat (only for commission rates)
      setInputText("")
      handleUserInput(suggestion.text)
    }
  }

  const handleUserInput = async (transcript: string) => {
    if (!transcript.trim()) return

    console.log("[v0] Processing user input:", transcript)

    const userMessage: Message = {
      id: Date.now().toString(),
      text: transcript,
      isUser: true,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setCurrentMessage(`Processing: "${transcript}"`)
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: transcript,
          language: selectedLanguage.name,
          languageCode: selectedLanguage.code,
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] API response:", data)

      if (!data.message) {
        throw new Error("Invalid response format")
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.message,
        isUser: false,
        timestamp: new Date(),
        image: data.image,
        location: data.location,
      }
      setMessages((prev) => [...prev, aiMessage])
      setCurrentMessage(data.message)

      // Only speak if speech is enabled
      if (speechEnabled) {
        speak(data.message)
      }
    } catch (error) {
      console.error("[v0] Error:", error)
      const errorMsg = "I apologize, but I encountered a technical difficulty. Please try again."
      setCurrentMessage(errorMsg)
      
      // Only speak error if speech is enabled
      if (speechEnabled) {
        speak(errorMsg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputText.trim()) {
      handleUserInput(inputText.trim())
      setInputText("")
    }
  }

  const handleOrbClick = () => {
    if (isSpeaking) {
      stopSpeaking()
    } else if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const clearConversation = () => {
    setMessages([])
    setCurrentMessage("Conversation cleared. How can I help you today?")
  }

  // Handle speech toggle
  const toggleSpeech = () => {
    const newSpeechEnabled = !speechEnabled
    setSpeechEnabled(newSpeechEnabled)
    
    if (!newSpeechEnabled && isSpeaking) {
      // If turning off speech while speaking, stop current speech
      stopSpeaking()
    }
    
    setCurrentMessage(newSpeechEnabled ? "Speech enabled" : "Speech disabled")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex flex-col font-sans relative overflow-hidden">
      {showChat && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-black/40 via-emerald-950/30 to-black/40 backdrop-blur-xl rounded-3xl border border-emerald-400/20 shadow-2xl shadow-emerald-500/10 w-full max-w-2xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom-4 duration-500 overflow-hidden">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-6 border-b border-emerald-400/20 bg-gradient-to-r from-emerald-900/20 to-transparent">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold text-white drop-shadow-sm">Chat with MAR</h3>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearConversation}
                    className="text-white/70 hover:text-white hover:bg-red-500/20 rounded-full transition-all duration-300"
                    title="Clear conversation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowChat(false)}
                  className="text-white/70 hover:text-white hover:bg-emerald-500/20 rounded-full transition-all duration-300"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-emerald-500/30 hover:scrollbar-thumb-emerald-500/50 scrollbar-thumb-rounded-full">
              {messages.length === 0 ? (
                <div className="text-center text-emerald-200/60 py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-lg text-white font-light">Start a conversation with MAR!</p>
                  <p className="text-sm text-white/70 mt-2">Ask about portrait commission rates or try these:</p>
                  
                  <div className="mt-6 space-y-2">
                    {commissionSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestedMessageClick(suggestion)}
                        className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-emerald-400/20 text-white/90 text-sm text-left transition-all duration-300 flex items-center gap-2"
                      >
                        <span>{suggestion.icon}</span>
                        <span>{suggestion.text}</span>
                        {suggestion.shouldRedirect && (
                          <span className="ml-auto text-xs text-emerald-300/70">→ MARQ Page</span>
                        )}
                      </button>
                    ))}
                    
                    <button
                      onClick={redirectToMarqPage}
                      className="block w-full mt-4 p-3 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-xl border border-emerald-400/30 text-white text-sm text-center transition-all duration-300"
                    >
                      💬 Message MARQ directly on Facebook
                    </button>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-5 py-4 rounded-2xl font-light transition-all duration-300 ${
                        message.isUser
                          ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
                          : "bg-gradient-to-br from-white/10 to-white/5 text-white border border-emerald-400/20 backdrop-blur-md hover:bg-white/15 shadow-lg"
                      }`}
                    >
                      {message.image && (
                        <div className="mb-3 rounded-xl overflow-hidden">
                          <img
                            src={message.image || "/placeholder.svg"}
                            alt="Visual context"
                            className="w-full h-32 object-cover rounded-xl"
                          />
                        </div>
                      )}

                      {message.location && (
                        <div className="mb-2 flex items-center gap-2 text-xs opacity-75">
                          <span>📍</span>
                          <span>{message.location}</span>
                        </div>
                      )}

                      <p
                        className="text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: convertMarkdownLinksToHTML(message.text) }}
                      />

                      <p
                        className={`text-xs mt-2 opacity-60 ${message.isUser ? "text-emerald-100" : "text-emerald-200"}`}
                      >
                        {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 border-t border-emerald-400/20 bg-gradient-to-r from-emerald-900/10 to-transparent">
              <form onSubmit={handleTextSubmit} className="flex gap-3">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask MAR anything..."
                  className="flex-1 bg-gradient-to-r from-white/10 to-white/5 border-emerald-400/30 text-white placeholder:text-emerald-200/50 rounded-xl font-light focus:bg-white/20 focus:border-emerald-400/50 transition-all duration-300 backdrop-blur-sm"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  disabled={isLoading || !inputText.trim()}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-6 rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main Voice Interface */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="flex flex-col items-center space-y-8 max-w-2xl mx-auto text-center">
          {/* Language Selector */}
          {!showChat && (
            <div className="relative z-50">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 text-white hover:bg-white/20 transition-all duration-300 border border-white/20 cursor-pointer shadow-lg hover:shadow-xl"
              >
                <span className="text-xl">{selectedLanguage.flag}</span>
                <span className="font-medium">{selectedLanguage.name}</span>
                <div className={`transform transition-transform duration-300 ${showLanguageMenu ? "rotate-180" : ""}`}>
                  ▼
                </div>
              </button>

              {showLanguageMenu && (
                <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-black/90 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl z-50 min-w-48 animate-in slide-in-from-top-2 duration-300">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setSelectedLanguage(lang)
                        setShowLanguageMenu(false)
                        setCurrentMessage(`Language changed to ${lang.name}. Ready to assist you!`)
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-all duration-200 first:rounded-t-2xl last:rounded-b-2xl cursor-pointer ${
                        selectedLanguage.code === lang.code ? "bg-emerald-600/30 text-emerald-200" : "text-white"
                      }`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span className="font-medium">{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Voice Orb */}
          <div className="relative flex items-center justify-center">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`absolute rounded-full pointer-events-none transition-all duration-1000 ${
                  isListening
                    ? "bg-emerald-400/20 animate-ripple"
                    : isSpeaking
                      ? "bg-green-400/20 animate-breathe"
                      : "bg-emerald-500/5 animate-pulse"
                }`}
                style={{
                  width: `${300 + i * 50}px`,
                  height: `${300 + i * 50}px`,
                  animationDelay: `${i * 0.4}s`,
                  zIndex: 1,
                }}
              />
            ))}

            <button
              onClick={handleOrbClick}
              disabled={isLoading}
              className={`relative w-64 h-64 rounded-full flex items-center justify-center transition-all duration-700 transform hover:scale-105 cursor-pointer shadow-2xl ${
                isListening
                  ? "bg-gradient-to-br from-emerald-300 via-emerald-500 to-emerald-700 shadow-emerald-500/60 scale-110 animate-pulse"
                  : isSpeaking
                    ? "bg-gradient-to-br from-green-300 via-green-500 to-green-700 shadow-green-500/60 animate-pulse scale-110"
                    : isLoading
                      ? "bg-gradient-to-br from-teal-300 via-teal-500 to-teal-700 shadow-teal-500/60 animate-spin"
                      : "bg-gradient-to-br from-slate-600 via-slate-800 to-slate-900 shadow-slate-500/40 hover:from-emerald-400 hover:via-emerald-600 hover:to-emerald-800 hover:shadow-emerald-500/40"
              }`}
              style={{ zIndex: 10 }}
            >
              {/* Enhanced inner glow layers */}
              <div
                className={`absolute inset-8 rounded-full pointer-events-none transition-all duration-500 ${
                  isListening
                    ? "bg-gradient-to-br from-emerald-200/50 to-emerald-400/30 animate-pulse"
                    : isSpeaking
                      ? "bg-gradient-to-br from-green-200/50 to-green-400/30 animate-pulse"
                      : isLoading
                        ? "bg-gradient-to-br from-teal-200/50 to-teal-400/30"
                        : "bg-gradient-to-br from-white/20 to-white/5"
                }`}
              />

              <div
                className={`absolute inset-16 rounded-full pointer-events-none transition-all duration-300 ${
                  isListening
                    ? "bg-emerald-300/40 animate-pulse"
                    : isSpeaking
                      ? "bg-green-300/40 animate-pulse"
                      : isLoading
                        ? "bg-teal-300/40 animate-spin"
                        : "bg-white/10"
                }`}
              />

              {/* Icon */}
              <div className="relative z-10 pointer-events-none">
                {isLoading ? (
                  <div className="w-20 h-20 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isListening ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 bg-white rounded-full animate-pulse mx-1" />
                    <div
                      className="w-5 h-5 bg-white rounded-full animate-pulse mx-1"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <div
                      className="w-5 h-5 bg-white rounded-full animate-pulse mx-1"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                ) : (
                  <Mic className="w-20 h-20 text-white drop-shadow-lg" />
                )}
              </div>
            </button>
          </div>

          <div className="space-y-4 z-20 relative">
            <div className="flex items-center justify-center mb-4">
              <Image
                src="/images/marlogo.png"
                alt="MAR Logo"
                width={100}
                height={100}
                className="invert drop-shadow-lg"
              />
            </div>

            <div className="flex items-center justify-center">
              <a
                href="https://www.facebook.com/marqph"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-emerald-300/70 text-sm font-light"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Created by MARQ</span>
              </a>
            </div>

            {/* Current Message Display */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 max-w-2xl mx-auto border border-white/20 shadow-xl transition-all duration-500 hover:bg-white/15">
              <p className="text-white text-lg leading-relaxed font-light">{currentMessage}</p>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-6 z-20 relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSpeech}
              className={`w-14 h-14 rounded-full transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl ${
                speechEnabled 
                  ? "text-white/70 hover:text-white hover:bg-emerald-500/20" 
                  : "text-red-400/70 hover:text-red-400 hover:bg-red-500/20"
              }`}
              title={speechEnabled ? "Disable speech" : "Enable speech"}
            >
              {speechEnabled ? <Volume2 className="h-7 w-7" /> : <VolumeX className="h-7 w-7" />}
            </Button>

            <Button
              variant="default"
              size="icon"
              onClick={() => setShowChat(!showChat)}
              className="bg-white text-black/70 hover:text-white hover:bg-emerald-500/20 w-14 h-14 rounded-full transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl"
            >
              <MessageCircle className="h-7 w-7" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const input = document.createElement("input")
                input.type = "file"
                input.accept = "image/*,.pdf,.doc,.docx,.txt"
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) {
                    setCurrentMessage(`File "${file.name}" selected. File attachment feature coming soon!`)
                  }
                }
                input.click()
              }}
              className="text-white/70 hover:text-white hover:bg-emerald-500/20 w-14 h-14 rounded-full transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl"
            >
              <Paperclip className="h-7 w-7" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}