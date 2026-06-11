import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { processRepoChanges } from "@/lib/changes";

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    const event = req.headers.get("x-github-event");

    // 1. Verify Signature (if a secret is configured)
    if (WEBHOOK_SECRET) {
      if (!signature) {
        return NextResponse.json({ error: "Missing x-hub-signature-256" }, { status: 401 });
      }

      const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
      const digest = "sha256=" + hmac.update(rawBody).digest("hex");

      if (signature !== digest) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    // 2. We only care about "push" events for now
    if (event !== "push") {
      return NextResponse.json({ success: true, message: `Ignored event: ${event}` });
    }

    const payload = JSON.parse(rawBody);

    // 3. Extract repo details from payload
    const repoName = payload.repository?.name;
    const ownerName = payload.repository?.owner?.login || payload.repository?.owner?.name;

    if (!repoName || !ownerName) {
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }

    // 4. Find the matching repo in our DB
    // We assume the branch is the default branch (usually "main" or "master")
    // For more robust handling, we could extract the branch from payload.ref (e.g. "refs/heads/main")
    const branchName = payload.ref ? payload.ref.replace("refs/heads/", "") : "main";

    const repo = await prisma.repository.findFirst({
      where: {
        owner: ownerName,
        name: repoName,
        branch: branchName
      }
    });

    if (!repo) {
      // We don't track this repository
      return NextResponse.json({ success: true, message: "Repository not tracked" });
    }

    // 5. Trigger the change detection process asynchronously
    // We don't await this so we can respond to GitHub quickly (prevent timeouts)
    processRepoChanges(repo.id).then((changes) => {
      console.log(`[Webhook] Processed ${changes} new commits for ${ownerName}/${repoName}`);
    }).catch(err => {
      console.error(`[Webhook] Failed to process repo changes for ${repo.id}:`, err);
    });

    return NextResponse.json({
      success: true,
      message: "Webhook received and processing started"
    });

  } catch (error: any) {
    console.error("GitHub Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
