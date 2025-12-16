import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
    try {
        const booksDir = path.join(process.cwd(), '../data/books');

        // Check if directory exists
        try {
            await fs.access(booksDir);
        } catch {
            return NextResponse.json({ books: [] });
        }

        const entries = await fs.readdir(booksDir, { withFileTypes: true });
        const books = await Promise.all(
            entries
                .filter(entry => entry.isDirectory())
                .map(async (entry) => {
                    const id = entry.name;
                    try {
                        const metadataPath = path.join(booksDir, id, 'metadata.json');
                        const content = await fs.readFile(metadataPath, 'utf-8');
                        const metadata = JSON.parse(content);
                        return { id, title: metadata.title || id };
                    } catch (e) {
                        return { id, title: id };
                    }
                })
        );

        return NextResponse.json({ books });
    } catch (error) {
        console.error('Error listing books:', error);
        return NextResponse.json({ error: 'Failed to list books' }, { status: 500 });
    }
}
