// Book types for the clean slate rebuild
// Simplified data model focused on reading experience

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  voiceProfile?: VoiceProfile;
  chapterCount: number;
  createdAt: string;
  processedAt?: string;
  status: BookStatus;
}

export type BookStatus =
  | "uploading"
  | "extracting"
  | "analyzing"
  | "summarizing"
  | "ready"
  | "error";

export interface VoiceProfile {
  tone: string; // "conversational" | "academic" | "storytelling" | etc.
  style: string; // "first-person" | "third-person" | "instructional"
  complexity: string; // "simple" | "moderate" | "complex"
  characteristics: string[];
}

export interface Chapter {
  number: number;
  title: string;
  markdownPath: string;
  wordCount: number;
  summary?: ChapterSummary;
}

export interface ChapterSummary {
  content: string;
  wordCount: number;
  generatedAt: string;
}

export interface ProcessingStatus {
  bookId: string;
  status: BookStatus;
  progress: number; // 0-100
  currentStep: string; // Human-readable step name
  chaptersProcessed: number;
  totalChapters: number;
  error?: string;
  startedAt: string;
  updatedAt: string;
}

// Book with chapters loaded (for detail views)
export interface BookWithChapters extends Book {
  chapters: Chapter[];
}

// API response types
export interface BookListResponse {
  books: Book[];
}

export interface BookDetailResponse {
  book: BookWithChapters;
}

export interface UploadResponse {
  bookId: string;
  status: BookStatus;
}
