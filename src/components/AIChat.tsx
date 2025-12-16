"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat, UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { uiActionBus } from "@/lib/uiActions";
import type { UIAction } from "@/types/book";

interface AIChatProps {
  bookId: string;
  bookTitle: string;
  currentSection?: string;
  onClose: () => void;
  onUIAction?: (action: UIAction) => void;
}

export default function AIChat({
  bookId,
  bookTitle,
  currentSection,
  onClose,
  onUIAction,
}: AIChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        bookId,
        bookTitle,
        currentSection,
      },
    }),
    messages: [
      {
        id: "welcome",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: `Hi! I'm your AI learning assistant for **${bookTitle}**. I can help you:

• **Explain concepts** in simple terms
• **Go deeper** into any topic
• **Quiz you** to test understanding
• **Find connections** between ideas
• **Navigate** to relevant sections

What would you like to explore?`,
          },
        ],
      } as UIMessage,
    ],
    onFinish: ({ message }) => {
      // Check for UI actions in tool results
      try {
        const content = getMessageText(message);
        const uiActionMatch = content.match(/uiAction":\s*({[^}]+})/);
        if (uiActionMatch) {
          const action = JSON.parse(uiActionMatch[1]) as UIAction;
          uiActionBus.dispatch(action);
          onUIAction?.(action);
        }
      } catch (e) {
        // Ignore parsing errors - not all messages have UI actions
      }
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Helper to extract text from message parts
  const getMessageText = (msg: UIMessage): string => {
    if (!msg.parts) return "";
    return msg.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("");
  };

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Hide suggestions after first user message
  useEffect(() => {
    if (messages.length > 2) {
      setShowSuggestions(false);
    }
  }, [messages.length]);

  const suggestedQuestions = [
    { text: "Explain the main idea simply", icon: "💡" },
    { text: "What's the most important concept?", icon: "🎯" },
    { text: "Quiz me on this chapter", icon: "📝" },
    { text: "How can I apply this?", icon: "🔧" },
  ];

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  }, []);

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  }, [input, isLoading, sendMessage]);

  // Render message content with markdown-like formatting
  const renderContent = (content: string) => {
    // Simple markdown rendering
    const lines = content.split('\n');
    return lines.map((line, i) => {
      // Bold
      line = line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--color-snow)]">$1</strong>');
      // Bullet points
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return (
          <div key={i} className="flex items-start gap-2 my-1">
            <span className="text-[var(--color-electric-cyan)]">•</span>
            <span dangerouslySetInnerHTML={{ __html: line.slice(2) }} />
          </div>
        );
      }
      // Empty lines
      if (!line.trim()) {
        return <div key={i} className="h-2" />;
      }
      return (
        <p key={i} className="my-1" dangerouslySetInnerHTML={{ __html: line }} />
      );
    });
  };

  return (
    <div className="fixed bottom-24 right-6 w-[420px] h-[560px] glass rounded-2xl overflow-hidden shadow-2xl z-50 flex flex-col reveal-up border border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[var(--color-void)]/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-electric-blue)] to-[var(--color-electric-purple)] flex items-center justify-center text-xl shadow-lg">
            🤖
          </div>
          <div>
            <h3 className="font-semibold text-[var(--color-snow)] text-sm">
              AI Learning Assistant
            </h3>
            <p className="text-xs text-[var(--color-silver)]">
              {isLoading ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[var(--color-electric-emerald)] rounded-full animate-pulse" />
                  Thinking...
                </span>
              ) : (
                "Ask anything about this book"
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <button
              onClick={stop}
              className="px-2 py-1 text-xs rounded-lg bg-[var(--color-electric-rose)]/20 text-[var(--color-electric-rose)] hover:bg-[var(--color-electric-rose)]/30 transition-colors"
            >
              Stop
            </button>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-[var(--color-silver)] hover:text-[var(--color-snow)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] p-3 rounded-xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-[var(--color-electric-blue)] to-[var(--color-electric-blue)]/80 text-white rounded-br-sm shadow-lg"
                  : "bg-[var(--color-graphite)] text-[var(--color-cloud)] rounded-bl-sm border border-white/5"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose-sm prose-invert">
                  {renderContent(getMessageText(msg))}
                </div>
              ) : (
                getMessageText(msg)
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[var(--color-graphite)] p-3 rounded-xl rounded-bl-sm border border-white/5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--color-electric-blue)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[var(--color-electric-purple)] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[var(--color-electric-cyan)] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {status === "error" && (
          <div className="flex justify-center">
            <div className="px-4 py-2 rounded-lg bg-[var(--color-electric-rose)]/10 border border-[var(--color-electric-rose)]/20 text-sm">
              <p className="text-[var(--color-electric-rose)]">
                Something went wrong. Please try again.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {showSuggestions && (
        <div className="px-4 pb-2">
          <p className="text-xs text-[var(--color-steel)] mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(q.text)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[var(--color-graphite)] text-[var(--color-pearl)] hover:bg-[var(--color-slate)] hover:text-[var(--color-snow)] transition-all border border-white/5 hover:border-white/10"
              >
                <span>{q.icon}</span>
                <span>{q.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Depth Level Shortcuts */}
      <div className="px-4 py-2 border-t border-white/5 bg-[var(--color-void)]/30">
        <div className="flex items-center justify-between text-xs text-[var(--color-steel)]">
          <span>Depth:</span>
          <div className="flex gap-1">
            {["Summary", "Details", "Deep", "Apply"].map((level, i) => (
              <button
                key={level}
                onClick={() => handleSuggestionClick(`Give me the ${level.toLowerCase()} level explanation`)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  i === 0
                    ? "bg-[var(--color-electric-blue)]/20 text-[var(--color-electric-blue)]"
                    : "hover:bg-white/10"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleFormSubmit} className="p-4 border-t border-white/10 bg-[var(--color-void)]/50">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--color-graphite)] border border-white/5 text-[var(--color-snow)] placeholder-[var(--color-steel)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-electric-blue)]/50 focus:border-[var(--color-electric-blue)]/50 transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg ${
              input.trim() && !isLoading
                ? "bg-gradient-to-br from-[var(--color-electric-blue)] to-[var(--color-electric-purple)] text-white hover:shadow-[var(--color-electric-blue)]/25 hover:shadow-xl"
                : "bg-[var(--color-graphite)] text-[var(--color-steel)]"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
