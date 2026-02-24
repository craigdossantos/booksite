"use client";

export function EmptyLibrary() {
  return (
    <div className="text-center py-16">
      <span
        className="material-symbols-outlined text-5xl text-slate-300 mb-4 block"
        aria-hidden="true"
      >
        library_books
      </span>
      <h2 className="text-2xl font-semibold text-slate-900 mb-2">
        Your library is empty
      </h2>
      <p className="text-slate-600 max-w-md mx-auto">
        Upload your first EPUB book to get started. We&apos;ll generate
        voice-matched summaries for each chapter.
      </p>
    </div>
  );
}
