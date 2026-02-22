"use client";

import type { UIMessage } from "ai";
import { ArtifactCard } from "./ArtifactCard";

interface ChatMessageProps {
  message: UIMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${
          isUser ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"
        }`}
      >
        {message.parts.map((part, i) => {
          switch (part.type) {
            case "text":
              return (
                <div key={i} className="whitespace-pre-wrap leading-relaxed">
                  {part.text}
                </div>
              );
            case "tool-createArtifact":
            case "tool-updateArtifact":
              return (
                <ArtifactCard key={i} toolName={part.type} args={part.args} />
              );
            default:
              // Hide other tool calls (search, read, notes, etc.)
              return null;
          }
        })}
      </div>
    </div>
  );
}
