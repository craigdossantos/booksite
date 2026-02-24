import type { ArtifactType } from "@/types/book";

export const ARTIFACT_TYPE_CONFIG: Record<
  ArtifactType,
  {
    icon: string;
    label: string;
    labelPlural: string;
    color: string;
    bgLight: string;
    activeColor: string;
  }
> = {
  summary: {
    icon: "visibility",
    label: "Summary",
    labelPlural: "Summaries",
    color: "text-emerald-500",
    bgLight: "bg-emerald-50",
    activeColor: "border-l-emerald-500",
  },
  quiz: {
    icon: "quiz",
    label: "Quiz",
    labelPlural: "Quizzes",
    color: "text-amber-500",
    bgLight: "bg-amber-50",
    activeColor: "border-l-amber-500",
  },
  diagram: {
    icon: "schema",
    label: "Diagram",
    labelPlural: "Diagrams",
    color: "text-blue-500",
    bgLight: "bg-blue-50",
    activeColor: "border-l-blue-500",
  },
  note: {
    icon: "description",
    label: "Note",
    labelPlural: "Notes",
    color: "text-purple-500",
    bgLight: "bg-purple-50",
    activeColor: "border-l-purple-500",
  },
};

export const ARTIFACT_TYPE_ORDER: ArtifactType[] = [
  "summary",
  "quiz",
  "diagram",
  "note",
];
