"use client";

interface ArtifactCardProps {
  toolName: string;
  input: Record<string, unknown>;
}

export function ArtifactCard({ toolName, input }: ArtifactCardProps) {
  const isUpdate = toolName === "updateArtifact";
  const title = (input.title as string) ?? "Artifact";
  const description = input.description as string | undefined;

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
          {description && (
            <p className="text-xs text-gray-500">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
