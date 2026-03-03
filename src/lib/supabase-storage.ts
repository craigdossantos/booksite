import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const BUCKETS = {
  EPUBS: "epubs",
  BOOKS: "books",
} as const;

export function getPublicBookUrl(bookId: string, filePath: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${BUCKETS.BOOKS}/${bookId}/${filePath}`;
}
