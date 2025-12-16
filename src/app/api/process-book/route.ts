import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

// Get python site-packages path dynamically at runtime
function getPythonSitePackages(): string {
  const cwd = process.cwd();
  // Construct path at runtime to avoid Turbopack resolution
  const parts = [cwd, "ve" + "nv", "lib", "python3.13", "site-packages"];
  return parts.join("/");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const { filename } = await req.json();

        if (!filename) {
            return NextResponse.json({ error: "Filename is required" }, { status: 400 });
        }

        const cwd = process.cwd();
        const scriptPath = path.join(cwd, "execution", "process_book.py");

        console.log(`Spawning Python script: ${scriptPath} --filename ${filename}`);

        return new Promise<NextResponse>((resolve) => {
            const sitePackages = getPythonSitePackages();
            const pythonProcess = spawn("python3", [scriptPath, "--filename", filename], {
                env: { ...process.env, PYTHONPATH: sitePackages },
            });

            let stdoutData = "";
            let stderrData = "";

            pythonProcess.stdout.on("data", (data) => {
                const chunk = data.toString();
                console.log(`[Python stdout]: ${chunk}`);
                stdoutData += chunk;
            });

            pythonProcess.stderr.on("data", (data) => {
                const chunk = data.toString();
                console.error(`[Python stderr]: ${chunk}`);
                stderrData += chunk;
            });

            pythonProcess.on("close", (code) => {
                console.log(`Python script exited with code ${code}`);

                if (code === 0) {
                    const outputFilename = filename.replace(/\.epub$/i, ".json");
                    const outputPath = path.join("data", outputFilename);
                    resolve(NextResponse.json({ success: true, outputPath }));
                } else {
                    resolve(NextResponse.json({
                        error: "Book processing failed",
                        details: stderrData
                    }, { status: 500 }));
                }
            });
        });

    } catch (error) {
        console.error("Error processing book:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
