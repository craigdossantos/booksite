"use client";

import { useState, useEffect } from "react";

interface ConceptImage {
  concept_name: string;
  filename: string;
  url: string;
  style: string;
  prompt: string;
}

interface ImageGalleryProps {
  bookId: string;
}

export default function ImageGallery({ bookId }: ImageGalleryProps) {
  const [images, setImages] = useState<ConceptImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<ConceptImage | null>(null);

  useEffect(() => {
    async function fetchImages() {
      try {
        const response = await fetch(`/api/books/${bookId}/images`);
        const data = await response.json();
        setImages(data.images || []);
      } catch (error) {
        console.error("Failed to fetch images:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchImages();
  }, [bookId]);

  if (loading) {
    return (
      <div className="p-8 max-w-6xl">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--color-electric-blue)] border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="p-8 max-w-6xl">
        <div className="mb-8 reveal-up">
          <div className="inline-flex items-center gap-2 badge badge-rose mb-4">
            <span className="text-lg">🎨</span> Visual Metaphors
          </div>
          <h2 className="text-3xl font-bold text-[var(--color-snow)]">Concept Illustrations</h2>
          <p className="text-[var(--color-pearl)] mt-2">
            AI-generated visual metaphors for key concepts
          </p>
        </div>

        <div className="text-center py-12">
          <div className="text-6xl mb-4 opacity-50">🎨</div>
          <p className="text-[var(--color-silver)]">No images generated yet.</p>
          <p className="text-sm text-[var(--color-steel)] mt-2">
            Run the image generation script to create visual metaphors.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8 reveal-up">
        <div className="inline-flex items-center gap-2 badge badge-rose mb-4">
          <span className="text-lg">🎨</span> Visual Metaphors
        </div>
        <h2 className="text-3xl font-bold text-[var(--color-snow)]">Concept Illustrations</h2>
        <p className="text-[var(--color-pearl)] mt-2">
          {images.length} AI-generated visual metaphors for key concepts
        </p>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image, idx) => (
          <div
            key={idx}
            className="group relative overflow-hidden rounded-2xl bg-[var(--color-slate)] border border-white/5 card-hover cursor-pointer"
            onClick={() => setSelectedImage(image)}
          >
            <div className="aspect-square overflow-hidden">
              <img
                src={image.url}
                alt={image.concept_name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform">
              <h3 className="font-bold text-[var(--color-snow)] mb-1">{image.concept_name}</h3>
              <span className="badge badge-blue text-xs">{image.style}</span>
            </div>

            <div className="p-4">
              <h3 className="font-semibold text-[var(--color-snow)] line-clamp-1">{image.concept_name}</h3>
              <span className="text-xs text-[var(--color-silver)]">{image.style}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-[var(--color-obsidian)] rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              ✕
            </button>

            <div className="relative">
              <img
                src={selectedImage.url}
                alt={selectedImage.concept_name}
                className="w-full max-h-[70vh] object-contain"
              />
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h3 className="text-2xl font-bold text-[var(--color-snow)]">
                  {selectedImage.concept_name}
                </h3>
                <span className="badge badge-blue">{selectedImage.style}</span>
              </div>

              <p className="text-[var(--color-pearl)] text-sm leading-relaxed">
                {selectedImage.prompt}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
