import { NextRequest, NextResponse } from "next/server";
import { parseGitHubUrl, getRepoTree, getFileContent } from "@/lib/github";
import { parseTypeScript } from "@/lib/parsers/babel";
import { parsePython } from "@/lib/parsers/treesitter";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { repoUrl, branch = "main" } = await req.json();

    if (!repoUrl) {
      return NextResponse.json({ error: "Missing repoUrl" }, { status: 400 });
    }

    const parsedUrl = parseGitHubUrl(repoUrl);
    if (!parsedUrl) {
      return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 });
    }

    const { owner, repo } = parsedUrl;

    // Fetch repository tree
    const { commitSha, tree } = await getRepoTree(owner, repo, branch);

    // Filter for supported files (.ts, .tsx, .js, .jsx, .py)
    const sourceFiles = tree.filter(
      (file) =>
        file.type === "blob" &&
        file.path &&
        (file.path.endsWith(".ts") ||
          file.path.endsWith(".tsx") ||
          file.path.endsWith(".js") ||
          file.path.endsWith(".jsx") ||
          file.path.endsWith(".py"))
    );

    // Upsert the Repository record
    const repository = await prisma.repository.upsert({
      where: {
        owner_name_branch: {
          owner,
          name: repo,
          branch,
        },
      },
      update: {
        lastCommit: commitSha,
        ingestedAt: new Date(),
      },
      create: {
        owner,
        name: repo,
        branch,
        lastCommit: commitSha,
        ingestedAt: new Date(),
      },
    });

    let totalUnitsParsed = 0;

    // Process files sequentially to avoid hitting GitHub rate limits or memory issues
    for (const file of sourceFiles) {
      if (!file.path || !file.sha) continue;

      try {
        const content = await getFileContent(owner, repo, file.sha);
        const parsedUnits = file.path.endsWith(".py")
          ? parsePython(content, file.path)
          : parseTypeScript(content, file.path);

        for (const unit of parsedUnits) {
          // Determine language
          const language = file.path.endsWith(".py")
            ? "python"
            : file.path.endsWith(".ts") || file.path.endsWith(".tsx")
            ? "typescript"
            : "javascript";

          // Upsert CodeUnit (relying on repoId + filePath + name as a pseudo-key)
          // Since we don't have a unique constraint on those three, we delete existing ones for this file first
          await prisma.codeUnit.deleteMany({
            where: {
              repoId: repository.id,
              filePath: file.path,
              name: unit.name,
            },
          });

          await prisma.codeUnit.create({
            data: {
              repoId: repository.id,
              filePath: file.path,
              name: unit.name,
              type: unit.type,
              language,
              signature: unit.signature,
              docstring: unit.docstring,
              rawCode: unit.rawCode,
              lineStart: unit.lineStart,
              lineEnd: unit.lineEnd,
            },
          });
          totalUnitsParsed++;
        }
      } catch (err) {
        console.error(`Failed to process file ${file.path}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      repoId: repository.id,
      lastCommit: commitSha,
      filesProcessed: sourceFiles.length,
      unitsParsed: totalUnitsParsed,
    });
  } catch (error: any) {
    console.error("Ingest Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
