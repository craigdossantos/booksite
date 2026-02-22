"use client";

interface ArtifactCardProps {
  toolName: string;
  args: Record<string, unknown>;
}

export function ArtifactCard({ toolName, args }: ArtifactCardProps) {
  const isUpdate = toolName === "tool-updateArtifact";
  const title = (args.title as string) ?? "Artifact";

  return (
    <div className="my-2 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-lg">
          {isUpdate ? "\u270F\uFE0F" : "\uD83D\uDCC4"}
        </span>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {isUpdate ? "Updated" : "Created"}: {title}
          </p>
          {args.description && (
            <p className="text-xs text-gray-500">
              {args.description as string}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
