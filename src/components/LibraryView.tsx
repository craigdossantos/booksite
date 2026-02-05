"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { LibraryTabs, LibraryTab } from "./LibraryTabs";
import { BookCard } from "./BookCard";
import { EmptyLibrary } from "./EmptyLibrary";
import { UploadDropzone } from "./UploadDropzone";
import type { Book } from "@/types/book";

interface LibraryViewProps {
  initialBooks: Book[];
}

export function LibraryView({ initialBooks }: LibraryViewProps) {
  const { data: session, status } = useSession();
  const isAuthenticated = !!session?.user;
  const [activeTab, setActiveTab] = useState<LibraryTab>("my-library");
  const [ownedBooks, setOwnedBooks] = useState<Book[]>([]);
  const [bookmarkedBooks, setBookmarkedBooks] = useState<Book[]>([]);
  const [communityBooks, setCommunityBooks] = useState<Book[]>(initialBooks);

  // Fetch library data when authentication status changes
  useEffect(() => {
    let cancelled = false;

    async function fetchUserLibrary() {
      try {
        const res = await fetch("/api/user/library");
        if (res.ok && !cancelled) {
          const data = await res.json();
          setOwnedBooks(data.owned);
          setBookmarkedBooks(data.bookmarked);
        }
      } catch (error) {
        console.error("Failed to fetch user library:", error);
      }
    }

    async function fetchCommunityBooks() {
      try {
        const res = await fetch("/api/books");
        if (res.ok && !cancelled) {
          const data = await res.json();
          setCommunityBooks(data.books.filter((b: Book) => b.isPublic));
        }
      } catch (error) {
        console.error("Failed to fetch community books:", error);
      }
    }

    if (isAuthenticated) {
      fetchUserLibrary();
      fetchCommunityBooks();
    } else {
      fetchCommunityBooks();
    }

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleTabChange = (tab: LibraryTab) => {
    setActiveTab(tab);
  };

  const handleBookmarkToggle = (bookId: string, bookmarked: boolean) => {
    if (bookmarked) {
      const book = communityBooks.find((b) => b.id === bookId);
      if (book) {
        setBookmarkedBooks((prev) => [book, ...prev]);
      }
    } else {
      setBookmarkedBooks((prev) => prev.filter((b) => b.id !== bookId));
    }
  };

  // Get books to display based on current tab and auth status
  const getDisplayBooks = () => {
    if (!isAuthenticated) {
      return communityBooks;
    }
    if (activeTab === "my-library") {
      // Combine owned and bookmarked, remove duplicates
      const allMyBooks = [...ownedBooks];
      bookmarkedBooks.forEach((b) => {
        if (!allMyBooks.find((ob) => ob.id === b.id)) {
          allMyBooks.push(b);
        }
      });
      return allMyBooks;
    }
    return communityBooks;
  };

  const displayBooks = getDisplayBooks();
  const userId = session?.user?.id;

  // Check if a book is owned by current user
  const isOwnedBook = (book: Book) => book.ownerId === userId;

  // Check if a book is bookmarked
  const isBookmarkedBook = (book: Book) =>
    bookmarkedBooks.some((b) => b.id === book.id);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900" />
      </div>
    );
  }

  return (
    <div>
      {/* Tabs for authenticated users */}
      {isAuthenticated && (
        <div className="mb-8">
          <LibraryTabs activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      )}

      {/* Upload dropzone - only show on My Library tab or for unauthenticated */}
      {(activeTab === "my-library" || !isAuthenticated) && <UploadDropzone />}

      {/* Book grid */}
      {displayBooks.length === 0 ? (
        <div className="mt-12">
          {activeTab === "my-library" && isAuthenticated ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-stone-900">
                Your library is empty
              </h3>
              <p className="mt-2 text-stone-600">
                Upload a book or browse the community library to get started.
              </p>
            </div>
          ) : (
            <EmptyLibrary />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-12">
          {displayBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              showBookmarkButton={
                isAuthenticated &&
                activeTab === "community" &&
                !isOwnedBook(book)
              }
              showVisibilityBadge={isAuthenticated && isOwnedBook(book)}
              isBookmarked={isBookmarkedBook(book)}
              onBookmarkToggle={(bookmarked) =>
                handleBookmarkToggle(book.id, bookmarked)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
