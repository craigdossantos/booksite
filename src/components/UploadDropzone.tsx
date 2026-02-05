"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

export function UploadDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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

        const response = await fetch("/api/books/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Upload failed");
        }

        // Refresh the page to show the new book
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [router],
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

      const file = e.dataTransfer.files[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload],
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
    fileInputRef.current?.click();
  }, []);

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragging ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-gray-400"}
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
          <div className="animate-spin w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full mb-3" />
          <p className="text-gray-600">Uploading...</p>
        </div>
      ) : (
        <>
          <div className="text-4xl mb-3">📤</div>
          <p className="text-gray-700 font-medium mb-1">
            Drop an EPUB file here or click to browse
          </p>
          <p className="text-sm text-gray-500">
            We&apos;ll process your book and generate summaries
          </p>
        </>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
