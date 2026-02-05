/**
 * Migration script to import existing filesystem books into the database
 * Assigns all books to the specified user email
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs-extra";
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

  // Create or get the owner user
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

  // Get existing books from filesystem
  if (!(await fs.pathExists(DATA_DIR))) {
    console.log("No books directory found. Nothing to migrate.");
    return;
  }

  const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
  const bookDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  console.log(`Found ${bookDirs.length} book(s) to migrate.\n`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const bookId of bookDirs) {
    const metadataPath = path.join(DATA_DIR, bookId, "metadata.json");

    if (!(await fs.pathExists(metadataPath))) {
      console.log(`  Skipping ${bookId}: No metadata.json found`);
      skipped++;
      continue;
    }

    try {
      // Check if book already exists in database
      const existingBook = await prisma.book.findUnique({
        where: { id: bookId },
      });

      if (existingBook) {
        console.log(`  Skipping ${bookId}: Already in database`);
        skipped++;
        continue;
      }

      // Read metadata from filesystem
      const metadata: BookMetadata = await fs.readJson(metadataPath);

      // Create book in database
      await prisma.book.create({
        data: {
          id: bookId,
          title: metadata.title,
          author: metadata.author,
          coverUrl: metadata.coverUrl,
          chapterCount: metadata.chapterCount || 0,
          status: metadata.status || "ready",
          isPublic: false, // Default to private
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
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
