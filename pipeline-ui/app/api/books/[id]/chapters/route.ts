import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const chaptersDir = path.join(process.cwd(), `../data/books/${id}/chapters`);

        // Check if directory exists
        try {
            await fs.access(chaptersDir);
        } catch {
            return NextResponse.json({ chapters: [] });
        }

        const entries = await fs.readdir(chaptersDir);
        const chapters = entries
            .filter(file => file.endsWith('.md'))
            .sort();

        return NextResponse.json({ chapters });
    } catch (error) {
        console.error('Error listing chapters:', error);
        return NextResponse.json({ error: 'Failed to list chapters' }, { status: 500 });
    }
}
