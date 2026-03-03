import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

/**
 * Get the authenticated user, upserting a Prisma User row.
 * Returns null if not authenticated.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const email = user.email ?? null;
  const name =
    (user.user_metadata?.full_name as string) ??
    (user.user_metadata?.name as string) ??
    null;
  const image =
    (user.user_metadata?.avatar_url as string) ??
    (user.user_metadata?.picture as string) ??
    null;

  // Upsert so the Prisma User row always exists
  await prisma.user.upsert({
    where: { id: user.id },
    update: { email, name, image },
    create: { id: user.id, email, name, image },
  });

  return { id: user.id, email, name, image };
}

/**
 * Lightweight variant — just returns the Supabase Auth user ID or null.
 * Does NOT upsert the Prisma User row.
 */
export async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}
