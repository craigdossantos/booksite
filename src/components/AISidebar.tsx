"use client";

import { useState, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import VoiceInput from "./VoiceInput";
import { useAccordionState } from "@/contexts/AccordionStateContext";

interface AISidebarProps {
  bookId: string;
  bookTitle: string;
  currentSection?: string;
  sectionId?: string; // chapter or concept ID
  onClose?: () => void;
  className?: string;
}

export default function AISidebar({
  bookId,
  bookTitle,
  currentSection = "",
  sectionId = "",
  onClose,
  className = "",
}: AISidebarProps) {
  const [inputValue, setInputValue] = useState("");
  const { addAIContent, scrollToItem } = useAccordionState();

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        bookId,
        bookTitle,
        currentSection,
      },
    }),
    onFinish: ({ message }) => {
      // When AI finishes responding, extract and inject content into accordion
      const text = message.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");
      handleAIResponse(text, inputValue);
    },
  });

  const handleAIResponse = useCallback(
    (content: string, question: string) => {
      // Try to extract parentSectionId from AI response
      // AI tools should return this in their response
      const uiActionMatch = content.match(/"parentSectionId":\s*"([^"]+)"/);
      const parentId = uiActionMatch ? uiActionMatch[1] : sectionId;

      // Create AI content item
      const aiItem = {
        id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        parentId: parentId,
        depth: 4, // AI questions start at depth 4
        type: "question" as const,
        question: question,
        answer: content,
        createdAt: new Date().toISOString(),
      };

      // Add to accordion state
      addAIContent(aiItem);

      // Scroll to the new content
      setTimeout(() => {
        scrollToItem(aiItem.id);
      }, 500);
    },
    [addAIContent, scrollToItem, sectionId],
  );

  const handleSend = () => {
    if (!inputValue.trim()) return;

    sendMessage({ text: inputValue });
    setInputValue("");
  };

  const handleVoiceTranscript = (text: string) => {
    setInputValue(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isStreaming = status === "streaming" || status === "submitted";

  return (
    <aside
      className={`fixed right-0 top-0 h-screen w-96 bg-gray-900/90 backdrop-blur border-l border-gray-800 flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-cyan-500/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-lg shadow">
            💬
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">
              AI Learning Assistant
            </h3>
            <p className="text-xs text-gray-400">
              Ask questions to enhance content
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close AI sidebar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-950/30">
        <div className="text-center mb-4">
          <p className="text-xs text-gray-500">
            Questions you ask will nest into the content on the left
          </p>
        </div>

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "user" ? (
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%] shadow">
                <p className="text-sm">
                  {message.parts
                    .filter(
                      (p): p is { type: "text"; text: string } =>
                        p.type === "text",
                    )
                    .map((p) => p.text)
                    .join("")}
                </p>
              </div>
            ) : (
              <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-sm px-4 py-2 max-w-[80%] shadow-sm">
                <p className="text-sm text-emerald-400 font-medium mb-1">
                  ✓ Added to content
                </p>
                <p className="text-xs text-gray-400">
                  Check the accordion on the left
                </p>
              </div>
            )}
          </div>
        ))}

        {isStreaming && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-sm px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div
                    className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
                <span className="text-xs text-gray-400">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800 bg-gray-900">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about this chapter..."
            disabled={isStreaming}
            className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
          />

          {/* Voice Input Button */}
          <VoiceInput onTranscript={handleVoiceTranscript} />

          {/* Send Button */}
          <button
            onClick={isStreaming ? stop : handleSend}
            disabled={!inputValue.trim() && !isStreaming}
            className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={isStreaming ? "Stop" : "Send message"}
          >
            {isStreaming ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <rect x="6" y="6" width="8" height="8" />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <span>AI responses will be added to the accordion</span>
        </div>
      </div>
    </aside>
  );
}
