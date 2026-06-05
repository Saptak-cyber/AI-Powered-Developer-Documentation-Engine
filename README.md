# 📖 AI-Powered Developer Documentation Engine

An automated documentation engine that automatically indexes and tracks your GitHub repositories, parses code units (classes, functions, methods, modules), generates complete Markdown documentation via LLMs, monitors commits for changes, flags staleness severity, drafts diff updates, and exposes a high-fidelity RAG chat interface.

Built with **Next.js 14+ (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, **Neon DB**, and **Qdrant Vector Cloud**.

---

## 🌟 Key Features

1. **GitHub Ingestion**: Fetch repository file trees, filter by extension, and download files in parallel.
2. **Double AST Parser**:
   - **Babel (JS/TS)**: Extracts functions, arrow functions, classes, and class methods.
   - **Python Parser**: Extracts classes, standalone functions, nested methods, parameters with type hints, and code blocks using indentation matching.
3. **Staleness Flagging**: Auto-categorizes code updates into `OK`, `REVIEW_RECOMMENDED`, `POTENTIALLY_OUTDATED`, or `BROKEN` by comparing signature and body changes.
4. **Draft Diff Reviews**: Presents proposed documentation changes side-by-side with original docs for developer approval and single-click publish.
5. **Contextual RAG Chat**: High-fidelity RAG query system built with Qdrant vector similarity indexes to answer query questions using real source file code references.
6. **Premium Dark Theme**: Space mesh gradient background animations, custom modern scrollbars, and card highlights.

---

## 🚀 Setup & Installation

### 1. Prerequisites
Ensure you have Node.js 18+ installed on your system.

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Migration
```bash
npx prisma generate
npx prisma db push
```

### 4. Configuration (`.env.local`)
Create a `.env.local` file in the root of the project with the following configuration:

```bash
# ─── LLM Provider (OpenAI-compatible) ───────────────────────────
LLM_API_KEY=your-api-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini

# ─── Embedding Model ─────────────────────────────────────────────
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# ─── Neon DB ─────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require

# ─── Qdrant Cloud ────────────────────────────────────────────────
QDRANT_URL=https://xxx.qdrant.io
QDRANT_API_KEY=your-qdrant-api-key
QDRANT_COLLECTION=doc_embeddings

# ─── GitHub ──────────────────────────────────────────────────────
GITHUB_TOKEN=ghp_your_personal_access_token
```

---

## 💻 Running the Application

Start the Next.js development server:
```bash
npm run dev
```

Build the production bundle:
```bash
npm run build
```
