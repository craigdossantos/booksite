"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

export function UploadDropzone() {
  const { data: session, status } = useSession();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const isAuthenticated = !!session?.user;
  const isLoading = status === "loading";

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".epub")) {
        setError("Please upload an EPUB file");
        return;
      }

      setError(null);
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("isPublic", isPublic.toString());

        const response = await fetch("/api/books/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Upload failed");
        }

        // Navigate to the book page to show processing status
        router.push(`/book/${data.bookId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [router, isPublic],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (!isAuthenticated) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload, isAuthenticated],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload],
  );

  const handleClick = useCallback(() => {
    if (!isAuthenticated) {
      signIn("google");
      return;
    }
    fileInputRef.current?.click();
  }, [isAuthenticated]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
        <div className="animate-pulse">
          <div className="h-12 w-12 bg-slate-200 rounded-full mx-auto mb-3" />
          <div className="h-4 bg-slate-200 rounded w-48 mx-auto" />
        </div>
      </div>
    );
  }

  // Show sign-in prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="w-full border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors"
      >
        <span
          className="material-symbols-outlined text-4xl text-slate-400 mb-3 block"
          aria-hidden="true"
        >
          lock
        </span>
        <p className="text-slate-700 font-medium mb-1">
          Sign in to upload your books
        </p>
        <p className="text-sm text-slate-500">
          Click here to sign in with Google and start building your library
        </p>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragging ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:border-slate-400"}
          ${isUploading ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".epub"
          onChange={handleFileSelect}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full mb-3" />
            <p className="text-slate-600">Uploading...</p>
          </div>
        ) : (
          <>
            <span
              className="material-symbols-outlined text-4xl text-slate-400 mb-3 block"
              aria-hidden="true"
            >
              upload_file
            </span>
            <p className="text-slate-700 font-medium mb-1">
              Drop an EPUB file here or click to browse
            </p>
            <p className="text-sm text-slate-500">
              We&apos;ll process your book and generate summaries
            </p>
          </>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {/* Visibility toggle */}
      <div className="flex items-center justify-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
          />
          <span className="text-sm text-slate-600">
            Share with community (public)
          </span>
        </label>
        <span className="text-xs text-slate-400">
          {isPublic
            ? "Anyone can view this book"
            : "Only you can view this book"}
        </span>
      </div>
    </div>
  );
}
