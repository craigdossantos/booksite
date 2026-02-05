"use client";

export function EmptyLibrary() {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">📚</div>
      <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-2">
        Your library is empty
      </h2>
      <p className="text-gray-600 max-w-md mx-auto">
        Upload your first EPUB book to get started. We&apos;ll generate
        voice-matched summaries for each chapter.
      </p>
    </div>
  );
}
