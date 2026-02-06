import { getPublicBooks } from "@/lib/books";
import { auth } from "@/auth";
import { LibraryView } from "@/components/LibraryView";
import { AuthButton } from "@/components/AuthButton";
import { UserMenu } from "@/components/UserMenu";

export default async function LibraryPage() {
  const session = await auth();
  const isAuthenticated = !!session?.user;

  // Fetch initial books (public books for everyone)
  const initialBooks = await getPublicBooks();

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <header className="mb-12 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-gray-900">
            {isAuthenticated ? "Your Library" : "Community Library"}
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            {isAuthenticated
              ? "Your books and community discoveries"
              : "Browse books shared by the community"}
          </p>
        </div>
        {isAuthenticated ? <UserMenu /> : <AuthButton />}
      </header>

      <LibraryView initialBooks={initialBooks} />
    </main>
  );
}
