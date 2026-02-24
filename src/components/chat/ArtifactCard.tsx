"use client";

interface ArtifactCardProps {
  toolName: string;
  input: Record<string, unknown>;
  output?: string;
  onSelect?: (artifactId: string) => void;
}

export function ArtifactCard({
  toolName,
  input,
  output,
  onSelect,
}: ArtifactCardProps) {
  const isUpdate = toolName === "updateArtifact";
  const title = (input.title as string) ?? "Artifact";
  const description = input.description as string | undefined;

  // Parse artifact ID from structured JSON output
  let artifactId: string | undefined;
  if (output) {
    try {
      const parsed = JSON.parse(output);
      artifactId = parsed.id;
    } catch {
      // Legacy string format — try regex
      const match = output.match(/\(id: ([a-f0-9]+)\)/);
      if (match) artifactId = match[1];
    }
  }
  // For updates, the input has the artifactId
  if (!artifactId && isUpdate) {
    artifactId = input.artifactId as string;
  }

  const handleClick = () => {
    if (artifactId && onSelect) {
      onSelect(artifactId);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!artifactId || !onSelect}
      className="my-2 p-3 bg-white border border-slate-200 rounded-lg shadow-sm w-full text-left hover:border-slate-400 hover:shadow-md transition-all disabled:hover:border-slate-200 disabled:hover:shadow-sm cursor-pointer disabled:cursor-default"
    >
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-lg text-slate-500">
          {isUpdate ? "edit_note" : "description"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900">
            {isUpdate ? "Updated" : "Created"}: {title}
          </p>
          {description && (
            <p className="text-xs text-slate-500 truncate">{description}</p>
          )}
        </div>
        {artifactId && onSelect && (
          <span className="text-xs text-slate-600 font-medium shrink-0 flex items-center gap-0.5">
            View
            <span className="material-symbols-outlined text-sm">
              arrow_forward
            </span>
          </span>
        )}
      </div>
    </button>
  );
}
