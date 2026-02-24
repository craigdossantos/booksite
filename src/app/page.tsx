import { getPublicBooks } from "@/lib/books";
import { auth } from "@/auth";
import { LibraryView } from "@/components/LibraryView";
import { AppHeader } from "@/components/AppHeader";

export default async function LibraryPage() {
  let session = null;
  let initialBooks: Awaited<ReturnType<typeof getPublicBooks>> = [];
  try {
    session = await auth();
    initialBooks = await getPublicBooks();
  } catch {
    // DB unreachable — render with empty state
  }
  const isAuthenticated = !!session?.user;

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader avatarUrl={session?.user?.image ?? undefined} />
      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900">
            {isAuthenticated ? "Your Library" : "Community Library"}
          </h1>
          <p className="mt-2 text-slate-500">
            {isAuthenticated
              ? "Your books and community discoveries"
              : "Browse books shared by the community"}
          </p>
        </header>
        <LibraryView initialBooks={initialBooks} />
      </main>
    </div>
  );
}
