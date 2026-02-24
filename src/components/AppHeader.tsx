import Link from "next/link";

interface AppHeaderProps {
  bookTitle?: string;
  authorName?: string;
  avatarUrl?: string;
}

export function AppHeader({
  bookTitle,
  authorName,
  avatarUrl,
}: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shrink-0 z-50">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 text-slate-900">
          <div className="size-8 rounded bg-slate-800 flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">menu_book</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight">
            BookSite
            {bookTitle && (
              <>
                <span className="text-slate-400 font-normal mx-2">/</span>
                {bookTitle}
              </>
            )}
          </h2>
        </Link>
      </div>
      <div className="flex items-center gap-4">
        {authorName && (
          <>
            <span className="text-sm font-medium text-slate-600">
              {authorName}
            </span>
            <div className="h-6 w-px bg-slate-200" />
          </>
        )}
        <button className="flex items-center justify-center rounded-full h-8 w-8 bg-slate-200 overflow-hidden">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="User"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="material-symbols-outlined text-slate-500 text-lg">
              person
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
