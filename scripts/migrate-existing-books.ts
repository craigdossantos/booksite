/**
 * Migration script to import existing filesystem books into the database.
 * Run this locally to migrate books from data/books/ into Prisma DB.
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import path from "path";

const prisma = new PrismaClient();
const DATA_DIR = path.join(process.cwd(), "data", "books");
const OWNER_EMAIL = "craigmd@gmail.com";

interface BookMetadata {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  chapterCount: number;
  status: string;
  createdAt: string;
  processedAt?: string;
}

async function main() {
  console.log("Starting migration of existing books...\n");

  let user = await prisma.user.findUnique({
    where: { email: OWNER_EMAIL },
  });

  if (!user) {
    console.log(`Creating user: ${OWNER_EMAIL}`);
    user = await prisma.user.create({
      data: {
        email: OWNER_EMAIL,
        name: "Craig",
      },
    });
    console.log(`Created user with ID: ${user.id}\n`);
  } else {
    console.log(`Found existing user: ${user.email} (ID: ${user.id})\n`);
  }

  if (!existsSync(DATA_DIR)) {
    console.log("No books directory found. Nothing to migrate.");
    return;
  }

  const entries = readdirSync(DATA_DIR);
  const bookDirs = entries.filter((entry) =>
    statSync(path.join(DATA_DIR, entry)).isDirectory(),
  );

  console.log(`Found ${bookDirs.length} book(s) to migrate.\n`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const bookId of bookDirs) {
    const metadataPath = path.join(DATA_DIR, bookId, "metadata.json");

    if (!existsSync(metadataPath)) {
      console.log(`  Skipping ${bookId}: No metadata.json found`);
      skipped++;
      continue;
    }

    try {
      const existingBook = await prisma.book.findUnique({
        where: { id: bookId },
      });

      if (existingBook) {
        console.log(`  Skipping ${bookId}: Already in database`);
        skipped++;
        continue;
      }

      const metadata: BookMetadata = JSON.parse(
        readFileSync(metadataPath, "utf-8"),
      );

      await prisma.book.create({
        data: {
          id: bookId,
          title: metadata.title,
          author: metadata.author,
          coverUrl: metadata.coverUrl,
          chapterCount: metadata.chapterCount || 0,
          status: metadata.status || "ready",
          isPublic: false,
          ownerId: user.id,
          createdAt: new Date(metadata.createdAt),
          processedAt: metadata.processedAt
            ? new Date(metadata.processedAt)
            : null,
        },
      });

      console.log(`  Migrated: "${metadata.title}" by ${metadata.author}`);
      migrated++;
    } catch (error) {
      console.error(`  Failed to migrate ${bookId}:`, error);
      failed++;
    }
  }

  console.log("\n--- Migration Summary ---");
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Failed:   ${failed}`);
  console.log(`Total:    ${bookDirs.length}`);
}

main()
  .catch((e: Error) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
