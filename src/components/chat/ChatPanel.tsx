"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useMemo, type RefObject } from "react";
import { ChatMessage } from "./ChatMessage";

interface ChatPanelProps {
  bookId: string;
  activeView?: { type: "chapter" | "artifact"; id: string };
  onArtifactCreated?: (artifactId: string) => void;
  onArtifactSelect?: (artifactId: string) => void;
  chatInputRef?: RefObject<HTMLInputElement | null>;
  onInputReady?: (actions: {
    setInput: (text: string) => void;
    submit: (text: string) => void;
  }) => void;
}

function getSuggestions(
  activeView?: ChatPanelProps["activeView"],
): { label: string; icon: string }[] {
  if (!activeView || activeView.type === "chapter") {
    return [
      { label: "Summarize this chapter", icon: "visibility" },
      { label: "Create a quiz", icon: "quiz" },
      { label: "Extract key concepts", icon: "schema" },
    ];
  }
  // Artifact-context suggestions based on common patterns
  return [
    { label: "Generate a quiz from this", icon: "quiz" },
    { label: "Create a diagram", icon: "schema" },
    { label: "Write study notes", icon: "description" },
  ];
}

export function ChatPanel({
  bookId,
  activeView,
  onArtifactCreated,
  onArtifactSelect,
  chatInputRef,
  onInputReady,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const seenArtifactsRef = useRef<Set<string>>(new Set());

  const transport = useMemo(
    () => new DefaultChatTransport({ api: `/api/chat/${bookId}` }),
    [bookId],
  );

  const { messages, sendMessage, status } = useChat({ transport });

  const isLoading = status === "streaming" || status === "submitted";
  const suggestions = getSuggestions(activeView);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Detect artifact creation/update in tool results and auto-display
  useEffect(() => {
    if (!onArtifactCreated) return;
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      for (const part of msg.parts) {
        if (
          part.type === "dynamic-tool" &&
          (part.toolName === "createArtifact" ||
            part.toolName === "updateArtifact") &&
          "output" in part &&
          part.output
        ) {
          try {
            const raw = part.output;
            const result = typeof raw === "string" ? JSON.parse(raw) : raw;
            if (result.id && !seenArtifactsRef.current.has(part.toolCallId)) {
              seenArtifactsRef.current.add(part.toolCallId);
              onArtifactCreated(result.id);
            }
          } catch {
            // Non-JSON output, ignore
          }
        }
      }
    }
  }, [messages, onArtifactCreated]);

  const handleSubmit = (text: string) => {
    if (!text.trim() || isLoading) return;
    sendMessage({ text }, { body: { activeView } });
    setInput("");
  };

  // Keep a ref to handleSubmit so the exposed submit closure always calls the latest version
  const submitRef = useRef(handleSubmit);
  useEffect(() => {
    submitRef.current = handleSubmit;
  });

  // Expose input setter and submit action to parent
  useEffect(() => {
    onInputReady?.({
      setInput,
      submit: (text: string) => submitRef.current(text),
    });
  }, [onInputReady]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="size-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-xl">
            auto_awesome
          </span>
        </div>
        <div>
          <h3 className="font-bold text-sm text-slate-900">Book Companion</h3>
          <p className="text-xs text-slate-500">Workspace Assistant</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 text-sm mt-8 px-4">
            <p className="font-medium text-slate-500 mb-1">
              How can I help you learn?
            </p>
            <p>
              I can read chapters, search for themes, create concept maps, study
              guides, and more.
            </p>

            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {suggestions.map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleSubmit(s.label)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">
                    {s.icon}
                  </span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onArtifactSelect={onArtifactSelect}
          />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <span className="animate-pulse">●</span>
            <span>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(input);
        }}
        className="p-4 border-t border-slate-200 bg-slate-50"
      >
        <div className="relative">
          <input
            ref={chatInputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this book..."
            aria-label="Ask a question about this book"
            disabled={isLoading}
            className="w-full bg-white border border-slate-200 rounded-md pl-3 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent outline-none transition-shadow shadow-sm placeholder:text-slate-400 text-slate-700"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-1.5 top-1.5 p-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-500 transition-colors disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-lg">
              arrow_upward
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
