import { getBooks } from "@/lib/books";
import { UploadDropzone } from "@/components/UploadDropzone";
import { BookCard } from "@/components/BookCard";
import { EmptyLibrary } from "@/components/EmptyLibrary";

export default async function LibraryPage() {
  const books = await getBooks();

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <header className="mb-12">
        <h1 className="text-4xl font-serif font-bold text-gray-900">
          Your Library
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Upload books and read AI-generated summaries
        </p>
      </header>

      <UploadDropzone />

      {books.length === 0 ? (
        <div className="mt-12">
          <EmptyLibrary />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-12">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </main>
  );
}
