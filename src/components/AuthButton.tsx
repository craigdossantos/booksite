"use client";

import { useAuth } from "@/components/AuthProvider";

export function AuthButton() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return <div className="h-10 w-24 animate-pulse bg-slate-200 rounded" />;
  }

  if (user) {
    const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
    return (
      <button
        onClick={signOut}
        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
      >
        {avatarUrl && (
          <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full" />
        )}
        Sign out
      </button>
    );
  }

  return (
    <button
      onClick={signInWithGoogle}
      className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded hover:bg-slate-700 transition-colors"
    >
      Sign in with Google
    </button>
  );
}
