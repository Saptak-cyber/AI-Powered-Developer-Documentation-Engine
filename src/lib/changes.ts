import { getCommitsSince, getCommitDiff, getFileAtCommit } from "@/lib/github";
import { parseCodeWithTreeSitter, LANGUAGE_CONFIGS } from "@/lib/parsers/treesitter";
import { classifyStaleness } from "@/lib/staleness";
import { prisma } from "@/lib/db";

export async function processRepoChanges(repoId: string) {
  const repo = await prisma.repository.findUnique({
    where: { id: repoId },
  });

  if (!repo || !repo.lastCommit) {
    throw new Error("Repository not found or has no initial commit");
  }

  // 1. Fetch new commits since the last known commit
  const commits = await getCommitsSince(repo.owner, repo.name, repo.branch, repo.lastCommit);
  
  if (commits.length === 0) {
    return 0; // No new commits
  }

  let detectedChanges = 0;

  // Process from oldest to newest
  for (const commit of commits.reverse()) {
    // Check if we already processed this commit
    const existingChange = await prisma.change.findUnique({
      where: { repoId_commitSha: { repoId, commitSha: commit.sha } },
    });

    if (existingChange) continue;

    // 2. Fetch diff for the commit
    const diffText = await getCommitDiff(repo.owner, repo.name, commit.sha);
    
    // Very basic diff parsing to find changed files
    const changedFiles = new Set<string>();
    const diffLines = diffText.split('\n');
    for (const line of diffLines) {
      if (line.startsWith('+++ b/')) {
        changedFiles.add(line.substring(6));
      }
    }

    const affectedDocs: string[] = [];

    // 3. For each changed file, analyze code units
    for (const filePath of Array.from(changedFiles)) {
      const supportedExtensions = Object.values(LANGUAGE_CONFIGS).flatMap(c => c.extensions);
      const fileExt = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
      if (!supportedExtensions.includes(fileExt)) continue;

      try {
        // Fetch the NEW content of this file at this specific commit
        const newContent = await getFileAtCommit(repo.owner, repo.name, filePath, commit.sha);
        const newUnits = await parseCodeWithTreeSitter(newContent, filePath);
        const newUnitsMap = new Map(newUnits.map(u => [u.name, u]));

        // Find existing (OLD) units for this file
        const oldUnits = await prisma.codeUnit.findMany({
          where: { repoId, filePath },
          include: { doc: true },
        });

        // 4. Compare old vs new to flag staleness
        for (const oldUnit of oldUnits) {
          if (!oldUnit.doc) continue; // No doc to become stale

          const newUnit = newUnitsMap.get(oldUnit.name);
          let staleness: any = "OK";

          if (!newUnit) {
             // The unit was deleted! We should probably mark it as BROKEN or delete it.
             staleness = "BROKEN";
          } else {
             staleness = classifyStaleness(
               oldUnit.signature || "",
               newUnit.signature,
               oldUnit.rawCode,
               newUnit.rawCode,
               false
             );

             // Update the CodeUnit in DB with the new implementation
             await prisma.codeUnit.update({
               where: { id: oldUnit.id },
               data: {
                 signature: newUnit.signature,
                 rawCode: newUnit.rawCode,
                 lineStart: newUnit.lineStart,
                 lineEnd: newUnit.lineEnd,
                 docstring: newUnit.docstring,
               }
             });
          }

          if (staleness !== "OK") {
            await prisma.documentation.update({
              where: { id: oldUnit.doc.id },
              data: { staleness },
            });
            affectedDocs.push(oldUnit.doc.id);
          }
        }
      } catch (err) {
        console.error(`Failed to analyze changes in ${filePath}:`, err);
      }
    }

    // Record the change
    await prisma.change.create({
      data: {
        repoId,
        commitSha: commit.sha,
        commitMsg: commit.commit.message,
        author: commit.commit.author?.name || "Unknown",
        authorEmail: commit.commit.author?.email,
        committedAt: commit.commit.author?.date ? new Date(commit.commit.author.date) : null,
        affectedDocs: JSON.stringify(affectedDocs),
        diffContent: diffText,
      }
    });

    // Update repo's last known commit
    await prisma.repository.update({
      where: { id: repoId },
      data: { lastCommit: commit.sha }
    });

    detectedChanges++;
  }

  return detectedChanges;
}
