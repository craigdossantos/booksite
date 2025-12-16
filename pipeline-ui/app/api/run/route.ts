import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';

const execPromise = util.promisify(exec);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { script, bookId, chapter } = body;

        if (!script || !bookId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Map script names to files
        const scriptMap: Record<string, string> = {
            'extract_concepts': 'execution/extract_concepts.py',
            'extract_stories': 'execution/extract_stories.py',
            'generate_priming': 'execution/generate_priming.py',
            'generate_inquiry': 'execution/generate_inquiry.py',
            'generate_schemas': 'execution/generate_schemas.py',
            'generate_feynman': 'execution/generate_feynman.py',
            'generate_audio_scripts': 'execution/generate_audio_scripts.py',
            'generate_video_scripts': 'execution/generate_video_scripts.py',
            'generate_quizzes': 'execution/generate_quizzes.py',
        };

        const scriptFile = scriptMap[script];
        if (!scriptFile) {
            return NextResponse.json({ error: 'Invalid script' }, { status: 400 });
        }

        // Construct command
        // Note: We are in pipeline-ui/, so we need to go up one level to access venv and execution
        const rootDir = path.join(process.cwd(), '..');
        const pythonPath = path.join(rootDir, 'venv/bin/python3');
        const scriptPath = path.join(rootDir, scriptFile);

        let command = `${pythonPath} ${scriptPath} --book_id "${bookId}"`;
        if (chapter) {
            command += ` --chapter "${chapter}"`;
        }

        console.log(`Executing: ${command}`);

        // Execute
        const { stdout, stderr } = await execPromise(command, { cwd: rootDir });

        return NextResponse.json({ success: true, stdout, stderr });

    } catch (error: any) {
        console.error('Error executing script:', error);
        return NextResponse.json({ error: error.message || 'Failed to execute script' }, { status: 500 });
    }
}
