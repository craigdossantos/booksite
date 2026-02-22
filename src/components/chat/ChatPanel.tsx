"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useMemo } from "react";
import { ChatMessage } from "./ChatMessage";

interface ChatPanelProps {
  bookId: string;
  activeView?: { type: "chapter" | "artifact"; id: string };
  onArtifactCreated?: () => void;
}

export function ChatPanel({
  bookId,
  activeView,
  onArtifactCreated,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const transport = useMemo(
    () => new DefaultChatTransport({ api: `/api/chat/${bookId}` }),
    [bookId],
  );

  const { messages, sendMessage, status } = useChat({ transport });

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Detect artifact creation in tool results and notify parent
  useEffect(() => {
    if (!onArtifactCreated) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    const hasArtifactTool = last.parts.some(
      (p) =>
        p.type === "dynamic-tool" &&
        (p.toolName === "createArtifact" || p.toolName === "updateArtifact"),
    );
    if (hasArtifactTool) onArtifactCreated();
  }, [messages, onArtifactCreated]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <h3 className="text-sm font-medium text-gray-700">Chat</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-8">
            <p>Ask me anything about this book.</p>
            <p className="mt-1">
              I can read chapters, search for themes, create concept maps, study
              guides, and more.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
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
          if (!input.trim() || isLoading) return;
          sendMessage({ text: input }, { body: { activeView } });
          setInput("");
        }}
        className="p-4 border-t border-gray-200 bg-white"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this book..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
