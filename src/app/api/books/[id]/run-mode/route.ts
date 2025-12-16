import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import util from "util";
import path from "path";

const execPromise = util.promisify(exec);

// Get python site-packages path dynamically at runtime
function getPythonSitePackages(): string {
  const cwd = process.cwd();
  // Construct path at runtime to avoid Turbopack resolution
  const parts = [cwd, "ve" + "nv", "lib", "python3.13", "site-packages"];
  return parts.join("/");
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { mode } = await request.json();

    if (!mode) {
        return NextResponse.json({ error: "Mode is required" }, { status: 400 });
    }

    const scriptMap: Record<string, string> = {
        concepts: "execution/extract_concepts.py",
        feynman: "execution/aggregate_feynman.py",
        inquiry: "execution/generate_inquiry.py",
        quizzes: "execution/generate_quizzes.py",
        schemas: "execution/generate_schemas.py",
        projects: "execution/generate_projects.py",
        flight_plan: "execution/generate_flight_plan.py",
        priming: "execution/generate_priming.py",
        audio_scripts: "execution/generate_audio_scripts.py",
        video_scripts: "execution/generate_video_scripts.py",
    };

    const scriptName = scriptMap[mode];

    if (!scriptName) {
        return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const cwd = process.cwd();
    const sitePackages = getPythonSitePackages();
    const scriptPath = path.join(cwd, scriptName);

    // Use system python3 with PYTHONPATH set
    const command = `python3 ${scriptPath} --book_id ${id}`;

    try {
        console.log(`Executing: ${command}`);
        const { stdout, stderr } = await execPromise(command, {
            env: { ...process.env, PYTHONPATH: sitePackages },
            timeout: 300000, // 5 minute timeout
        });
        console.log("Stdout:", stdout);
        if (stderr) console.error("Stderr:", stderr);

        return NextResponse.json({ success: true, output: stdout });
    } catch (error: unknown) {
        console.error("Execution error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: "Failed to run script", details: errorMessage },
            { status: 500 }
        );
    }
}
