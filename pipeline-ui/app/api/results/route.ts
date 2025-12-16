import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const bookId = searchParams.get('bookId');
        const type = searchParams.get('type');
        const chapter = searchParams.get('chapter');

        if (!bookId || !type) {
            return NextResponse.json({ error: 'Missing bookId or type' }, { status: 400 });
        }

        // Map type to filename
        const fileMap: Record<string, string> = {
            'concepts': 'concepts.json',
            'stories': 'stories.json',
            'priming': 'priming.json',
            'inquiry': 'inquiry.json',
            'schemas': 'schemas.json',
            'feynman': 'feynman.json',
            'audio_scripts': 'audio_scripts.json',
            'video_scripts': 'video_scripts.json',
            'quizzes': 'quizzes.json',
        };

        const filename = fileMap[type];
        if (!filename) {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

        const filePath = path.join(process.cwd(), `../data/books/${bookId}/${filename}`);

        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);

            // Filter by chapter if provided
            if (chapter) {
                // Remove extension and underscores for matching
                const chapterTitle = chapter.replace(".md", "").replace(/_/g, " ");

                // Filter logic depends on structure, but most have "source_chapter"
                const filtered = Array.isArray(data)
                    ? data.filter((item: any) => item.source_chapter === chapterTitle)
                    : data; // If object, return as is (or handle specifically)

                return NextResponse.json(filtered);
            }

            return NextResponse.json(data);
        } catch (error) {
            // File might not exist yet
            return NextResponse.json([]);
        }

    } catch (error) {
        console.error('Error reading results:', error);
        return NextResponse.json({ error: 'Failed to read results' }, { status: 500 });
    }
}
