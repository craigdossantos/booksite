"use client";

import type { UIMessage } from "ai";
import { ArtifactCard } from "./ArtifactCard";

interface ChatMessageProps {
  message: UIMessage;
  onArtifactSelect?: (artifactId: string) => void;
}

export function ChatMessage({ message, onArtifactSelect }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${
          isUser ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"
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
            case "dynamic-tool":
              if (
                part.toolName === "createArtifact" ||
                part.toolName === "updateArtifact"
              ) {
                return (
                  <ArtifactCard
                    key={i}
                    toolName={part.toolName}
                    input={part.input as Record<string, unknown>}
                    output={
                      "output" in part ? (part.output as string) : undefined
                    }
                    onSelect={onArtifactSelect}
                  />
                );
              }
              // Hide other tool calls (search, read, notes, etc.)
              return null;
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
