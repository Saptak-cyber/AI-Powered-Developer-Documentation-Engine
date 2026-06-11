# AI-Powered Developer Documentation Engine — PRD

> **Purpose:** A complete technical reference for building this project from scratch. Covers architecture, all tools used, the database schema, API design, file structure, and system flows.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack & Tools](#3-tech-stack--tools)
4. [Environment Variables](#4-environment-variables)
5. [Database Schema (PostgreSQL via Prisma)](#5-database-schema-postgresql-via-prisma)
6. [File & Directory Structure](#6-file--directory-structure)
7. [Core System Flows](#7-core-system-flows)
8. [API Reference](#8-api-reference)
9. [LLM Prompts Design](#9-llm-prompts-design)
10. [Vector Search (RAG) Design](#10-vector-search-rag-design)
11. [Staleness Classification Logic](#11-staleness-classification-logic)
12. [Tracing & Observability](#12-tracing--observability)
13. [Step-by-Step Build Guide](#13-step-by-step-build-guide)

---

## 1. Project Overview

An automated developer documentation engine that:

- **Ingests** a GitHub repository and parses all TypeScript/JavaScript/Python source files using AST parsers.
- **Generates** comprehensive Markdown documentation for every parsed code unit (function, class, method, module) using an LLM.
- **Embeds** each generated document into a vector database (Qdrant) for semantic search.
- **Monitors** the repository for new commits via polling, compares old vs. new code, and classifies documentation staleness.
- **Drafts** updated documentation for stale units using the LLM, presenting a diff for human review.
- **Provides** a RAG-based Chat interface to answer developer questions from the generated documentation.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS FRONTEND                            │
│  Dashboard | Documentation Browser | Changes | Drafts | RAG Chat   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTP (API Routes)
┌───────────────────────────▼─────────────────────────────────────────┐
│                       NEXT.JS API ROUTES                            │
│  /api/ingest  /api/generate  /api/changes  /api/update-draft        │
│  /api/update-draft/approve   /api/chat     /api/repos/[id]          │
└───┬───────────────┬───────────────┬──────────────────────┬──────────┘
    │               │               │                      │
    ▼               ▼               ▼                      ▼
┌───────┐    ┌────────────┐  ┌──────────────┐    ┌───────────────────┐
│GitHub │    │  Neon DB   │  │  Qdrant Cloud│    │  LLM Provider     │
│API    │    │ (Postgres) │  │ (Vector Store│    │  (NVIDIA / OpenAI)│
│Octokit│    │ via Prisma │  │  Embeddings) │    │  + HuggingFace    │
└───────┘    └────────────┘  └──────────────┘    └───────────────────┘
```

### Data Flow Summary

| Phase | Input | Output | Services Used |
|---|---|---|---|
| Ingest | GitHub repo URL | `Repository` + `CodeUnit` records | GitHub API, Babel/Tree-sitter, Neon DB |
| Generate | `repoId` | `Documentation` records + Qdrant vectors | LLM, HuggingFace, Qdrant, Neon DB |
| Change Detection | `repoId` | Updated staleness + `Change` records | GitHub API, Parsers, Neon DB |
| Suggest AI Fix | `docId` | `draftContent` populated | LLM, Neon DB |
| Approve Draft | `docId` | New canonical doc + updated vector | HuggingFace, Qdrant, Neon DB |
| Chat | User question + `repoId` | Streamed LLM answer | HuggingFace, Qdrant, LLM |

---

## 3. Tech Stack & Tools

### Framework & Runtime

| Tool | Version | Purpose |
|---|---|---|
| [Next.js](https://nextjs.org/) | `16.2.7` | Full-stack React framework (App Router + API Routes) |
| [React](https://react.dev/) | `19.2.4` | UI library |
| [TypeScript](https://www.typescriptlang.org/) | `^5` | Type safety across the entire project |
| Node.js | `>=18` | Runtime for server-side code |

### Database & ORM

| Tool | Purpose |
|---|---|
| [PostgreSQL](https://www.postgresql.org/) | Relational database for all structured data |
| [Neon](https://neon.tech/) | Serverless Postgres hosting (free tier) |
| [Prisma](https://www.prisma.io/) | ORM for type-safe DB access and migrations (`^5.22.0`) |

### Vector Database

| Tool | Purpose |
|---|---|
| [Qdrant Cloud](https://qdrant.tech/) | Cloud-hosted vector database for storing doc embeddings |
| `@qdrant/js-client-rest` | Official Qdrant JS client (`^1.18.0`) |

### LLM & AI

| Tool | Purpose |
|---|---|
| [NVIDIA NIM / Any OpenAI-Compatible API](https://build.nvidia.com/) | LLM for doc generation and draft updates. Configured entirely via env vars. |
| [openai](https://www.npmjs.com/package/openai) | Official OpenAI SDK (`^4.104.0`), used with any compatible provider via `baseURL`. |
| [HuggingFace Inference API](https://huggingface.co/inference-api) | Embedding model (`BAAI/bge-small-en-v1.5` by default) via `@huggingface/inference ^4.13.18` |
| [Vercel AI SDK](https://sdk.vercel.ai/) | `ai ^3.4.33` + `@ai-sdk/openai ^3.0.68` for streaming chat responses |
| [LangSmith](https://smith.langchain.com/) | LLM call tracing and observability via `langsmith` npm package |

### Code Parsing

| Tool | Purpose |
|---|---|
| [`@babel/parser`](https://babeljs.io/docs/babel-parser) | AST parser for TypeScript/JavaScript/TSX/JSX (`^7.29.7`) |
| [`@babel/traverse`](https://babeljs.io/docs/babel-traverse) | AST traversal to extract functions, classes, methods |
| [`@babel/types`](https://babeljs.io/docs/babel-types) | Type helpers for Babel AST nodes |
| [`web-tree-sitter`](https://github.com/tree-sitter/tree-sitter) | Python AST parsing via Tree-sitter WASM bindings |

### GitHub Integration

| Tool | Purpose |
|---|---|
| [`@octokit/rest`](https://github.com/octokit/rest.js) | GitHub REST API client (`^22.0.1`) for fetching files, commits, diffs |

### UI Components

| Tool | Purpose |
|---|---|
| [shadcn/ui](https://ui.shadcn.com/) | Component library built on Radix UI primitives |
| [`@base-ui/react`](https://base-ui.com/) | Headless UI primitives (Tabs used directly) |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first CSS framework (`^4`) |
| [Lucide React](https://lucide.dev/) | Icon library (`^0.475.0`) |
| [react-markdown](https://github.com/remarkjs/react-markdown) | Renders Markdown as React components (`^10.1.0`) |
| [rehype-highlight](https://github.com/rehypejs/rehype-highlight) | Syntax highlighting in rendered Markdown (`^7.0.2`) |
| [highlight.js](https://highlightjs.org/) | Syntax highlighting engine |
| [react-diff-viewer-continued](https://github.com/praneshr/react-diff-viewer) | Side-by-side diff viewer for draft review (`^4.2.2`) |
| [Sonner](https://sonner.emilkowal.ski/) | Toast notifications (`^2.0.7`) |
| [next-themes](https://github.com/pacocoursey/next-themes) | Dark/light mode management (`^0.4.6`) |

### Utilities

| Tool | Purpose |
|---|---|
| [uuid](https://www.npmjs.com/package/uuid) | Generating UUIDs for Qdrant point IDs (`^14.0.0`) |
| [zod](https://zod.dev/) | Runtime schema validation (`^3.25.76`) |
| [clsx](https://github.com/lukeed/clsx) + [tailwind-merge](https://github.com/dcastil/tailwind-merge) | Conditional CSS class utilities |

---

## 4. Environment Variables

Create a `.env.local` file in the project root with the following keys.

```env
# ─── PostgreSQL (Neon) ────────────────────────────────────────────────────────
# Get both from your Neon project dashboard
DATABASE_URL="postgresql://..."       # Pooled connection string
DIRECT_URL="postgresql://..."         # Direct (non-pooled) for migrations

# ─── LLM Provider (OpenAI-Compatible) ────────────────────────────────────────
# Works with NVIDIA NIM, OpenAI, Groq, Mistral, Ollama, etc.
LLM_API_KEY="your_provider_api_key"
LLM_BASE_URL="https://integrate.api.nvidia.com/v1"   # or https://api.openai.com/v1
LLM_MODEL="nvidia/llama-3.1-nemotron-ultra-253b-v1"  # or gpt-4o, llama3, etc.

# ─── HuggingFace (Embeddings) ─────────────────────────────────────────────────
HF_TOKEN="hf_your_huggingface_token"
EMBEDDING_MODEL="BAAI/bge-small-en-v1.5"  # 384-dimensional
EMBEDDING_DIMENSIONS="384"

# ─── Qdrant Cloud ─────────────────────────────────────────────────────────────
QDRANT_URL="https://your-cluster.qdrant.io"
QDRANT_API_KEY="your_qdrant_api_key"
QDRANT_COLLECTION="doc_embeddings"   # Auto-created if not present

# ─── GitHub ───────────────────────────────────────────────────────────────────
GITHUB_TOKEN="ghp_your_github_token" # Needs `repo` scope (read access)

# ─── LangSmith Tracing (Optional) ────────────────────────────────────────────
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY="ls__your_langsmith_api_key"
LANGCHAIN_PROJECT="ai-doc-engine"
```

---

## 5. Database Schema (PostgreSQL via Prisma)

The full schema lives in [`prisma/schema.prisma`](prisma/schema.prisma).

### Enums

```prisma
enum Staleness {
  OK                    // Documentation is accurate
  REVIEW_RECOMMENDED    // A related file changed; may be worth reviewing
  POTENTIALLY_OUTDATED  // Code body changed but signature is intact
  BROKEN                // Function signature changed or unit was deleted
}
```

### Models

#### `Repository`
Represents a tracked GitHub repository.

| Column | Type | Description |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `owner` | `String` | GitHub username or org (e.g., `"vercel"`) |
| `name` | `String` | Repository name (e.g., `"next.js"`) |
| `branch` | `String` | Branch being tracked (default: `"main"`) |
| `lastCommit` | `String?` | SHA of the last processed commit |
| `ingestedAt` | `DateTime?` | When the repository was last fully ingested |
| `createdAt` | `DateTime` | Record creation timestamp |
| `updatedAt` | `DateTime` | Auto-updated timestamp |

**Unique Constraint:** `[owner, name, branch]`

---

#### `CodeUnit`
An AST-extracted code unit (function, class, method, module, etc.).

| Column | Type | Description |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `repoId` | `String` | FK → `Repository.id` (cascade delete) |
| `filePath` | `String` | Relative file path (e.g., `src/lib/db.ts`) |
| `name` | `String` | Name of the unit (e.g., `chatCompletion`) |
| `type` | `String` | `"function"`, `"class"`, `"method"`, `"module"`, `"arrow_function"` |
| `language` | `String` | `"typescript"`, `"javascript"`, or `"python"` |
| `signature` | `String?` | Extracted function/class signature string |
| `docstring` | `String?` | Extracted JSDoc / Python docstring |
| `rawCode` | `Text` | Full raw source code of the unit |
| `lineStart` | `Int` | Starting line number in the source file |
| `lineEnd` | `Int` | Ending line number in the source file |
| `createdAt` | `DateTime` | Record creation timestamp |

**Indexes:** `[repoId, filePath]`, `[repoId, name]`

---

#### `Documentation`
LLM-generated Markdown documentation for a `CodeUnit`.

| Column | Type | Description |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `unitId` | `String` (unique) | FK → `CodeUnit.id` (one-to-one, cascade delete) |
| `content` | `Text` | Current approved Markdown documentation |
| `draftContent` | `Text?` | Pending LLM-generated draft awaiting human review |
| `qdrantPointId` | `String?` | UUID of the corresponding point in Qdrant |
| `staleness` | `Staleness` | Current staleness classification (default: `OK`) |
| `generatedAt` | `DateTime` | When the doc was first generated |
| `updatedAt` | `DateTime` | Auto-updated timestamp |

---

#### `Change`
A log entry for a detected GitHub commit and its impact on documentation.

| Column | Type | Description |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `repoId` | `String` | FK → `Repository.id` (cascade delete) |
| `commitSha` | `String` | Full GitHub commit SHA |
| `commitMsg` | `String` | Commit message |
| `author` | `String?` | Git author name |
| `authorEmail` | `String?` | Git author email |
| `committedAt` | `DateTime?` | Original commit timestamp from GitHub |
| `detectedAt` | `DateTime` | When the change was detected by the engine |
| `affectedDocs` | `Json` | `String[]` — array of `Documentation.id` values that became stale |
| `diffContent` | `Text?` | Raw git diff text for the commit |

**Unique Constraint:** `[repoId, commitSha]`
**Index:** `[repoId, detectedAt]`

---

## 6. File & Directory Structure

```
ai-doc-engine/
├── prisma/
│   └── schema.prisma              # Database schema (all models + enums)
│
├── public/                        # Static assets
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── layout.tsx             # Root layout with global navigation
│   │   ├── globals.css            # Global CSS + design system tokens
│   │   ├── page.tsx               # Dashboard (stats, repos, ingest form)
│   │   │
│   │   ├── docs/
│   │   │   ├── page.tsx           # Documentation browser with search/filter
│   │   │   └── [id]/
│   │   │       ├── page.tsx       # Individual doc view (tabs: doc, source, draft)
│   │   │       └── ApproveDraftButton.tsx  # "Approve & Publish" client button
│   │   │
│   │   ├── changes/
│   │   │   └── page.tsx           # Change log browser (all detected commits)
│   │   │
│   │   ├── drafts/
│   │   │   ├── page.tsx           # Drafts queue (all docs with pending drafts)
│   │   │   └── DraftCard.tsx      # Client component for individual draft card
│   │   │
│   │   ├── chat/
│   │   │   └── page.tsx           # RAG chat interface page
│   │   │
│   │   └── api/
│   │       ├── ingest/
│   │       │   └── route.ts       # POST /api/ingest — clone repo, parse, store CodeUnits
│   │       ├── generate/
│   │       │   └── route.ts       # POST /api/generate — LLM doc gen + Qdrant upsert
│   │       ├── changes/
│   │       │   └── route.ts       # POST /api/changes — GitHub polling, staleness detection
│   │       ├── update-draft/
│   │       │   ├── route.ts       # POST /api/update-draft — LLM drafts updated doc
│   │       │   └── approve/
│   │       │       └── route.ts   # POST /api/update-draft/approve — promotes draft to content
│   │       ├── repos/
│   │       │   └── [id]/
│   │       │       └── route.ts   # DELETE /api/repos/[id] — deletes repo + cascades
│   │       └── chat/
│   │           └── route.ts       # POST /api/chat — streaming RAG chat endpoint
│   │
│   ├── components/
│   │   ├── IngestForm.tsx         # Client form to submit a GitHub URL for ingestion
│   │   ├── GenerateDocsButton.tsx # Triggers /api/generate for a repo
│   │   ├── CheckUpdatesButton.tsx # Triggers /api/changes for a repo
│   │   ├── DeleteRepoButton.tsx   # Triggers DELETE /api/repos/[id]
│   │   ├── SuggestFixButton.tsx   # Triggers /api/update-draft for a single doc
│   │   ├── AutoUpdatePoller.tsx   # Background polling client component (30s interval)
│   │   ├── DocCard.tsx            # Card component for Documentation Browser grid
│   │   ├── DocsFilterForm.tsx     # Search/filter controls for Documentation Browser
│   │   ├── DiffViewer.tsx         # Wraps react-diff-viewer-continued
│   │   ├── StalenessBadge.tsx     # Colored badge for staleness status
│   │   ├── ChatInterface.tsx      # Full chat UI using Vercel AI SDK useChat hook
│   │   └── RepoSelector.tsx       # Dropdown for selecting a repository in chat
│   │
│   ├── lib/
│   │   ├── db.ts                  # Singleton Prisma client (global to survive hot reload)
│   │   ├── llm.ts                 # LLM client (wrapOpenAI+LangSmith), chatCompletion, generateEmbedding
│   │   ├── qdrant.ts              # Qdrant client, ensureCollection, upsert, search, delete
│   │   ├── github.ts              # Octokit client, getRepoTree, getFileContent, getCommitDiff
│   │   ├── prompts.ts             # All LLM system prompts and prompt builder functions
│   │   ├── staleness.ts           # classifyStaleness() pure function
│   │   ├── utils.ts               # cn() helper (clsx + tailwind-merge)
│   │   └── parsers/
│   │       ├── babel.ts           # TypeScript/JavaScript AST parser using @babel/parser
│   │       └── treesitter.ts      # Python AST parser using web-tree-sitter (WASM)
│   │
│   └── types/                     # Shared TypeScript types
│
├── .env.local                     # Secret environment variables (not committed)
├── .env.local.example             # Template for environment variables (committed)
├── .gitignore
├── next.config.ts                 # Next.js config
├── tailwind.config.ts             # Tailwind config
├── tsconfig.json
├── components.json                # shadcn/ui config
└── package.json
```

---

## 7. Core System Flows

### 7.1 Ingestion Flow

```
User submits GitHub URL
        │
        ▼
POST /api/ingest
        │
        ├─ Parse GitHub URL → extract { owner, repo }
        ├─ GET GitHub repo tree (recursive) → get all .ts/.tsx/.js/.jsx/.py files + commitSha
        ├─ Upsert Repository record in Postgres
        │
        └─ For each source file:
              ├─ Fetch file content (raw) from GitHub via blob SHA
              ├─ Parse AST:
              │     .ts/.tsx/.js/.jsx → Babel parser (babel.ts)
              │     .py             → Tree-sitter WASM (treesitter.ts)
              ├─ Extract CodeUnits (functions, classes, methods...)
              └─ Upsert CodeUnit records in Postgres
```

### 7.2 Documentation Generation Flow

```
User clicks "Generate Docs" for a repo
        │
        ▼
POST /api/generate { repoId }
        │
        ├─ ensureCollection() → create Qdrant collection if missing
        ├─ Fetch all CodeUnits without a Documentation record
        │
        └─ For each CodeUnit (sequential):
              ├─ 1. chatCompletion() → LLM generates Markdown doc
              ├─ 2. generateEmbedding() → HuggingFace encodes Markdown → vector[]
              ├─ 3. Upsert Documentation record in Postgres (content, staleness=OK)
              ├─ 4. upsertDocEmbedding() → store vector + payload in Qdrant
              └─ 5. Save qdrantPointId back to the Documentation record
```

### 7.3 Change Detection Flow

```
AutoUpdatePoller (every 30s) or manual "Check Updates" click
        │
        ▼
POST /api/changes { repoId }
        │
        ├─ Fetch new commits since repo.lastCommit from GitHub
        │
        └─ For each new commit (oldest → newest):
              ├─ Get raw diff text (git diff format)
              ├─ Parse changed file paths from diff ("+++ b/" lines)
              │
              └─ For each changed .ts/.tsx/.js/.py file:
                    ├─ Fetch NEW file content at this commit SHA
                    ├─ Parse new AST → get newUnits[]
                    ├─ Compare vs oldUnits[] from DB:
                    │     - Unit deleted       → staleness = BROKEN
                    │     - Signature changed  → staleness = BROKEN
                    │     - Body changed       → staleness = POTENTIALLY_OUTDATED
                    │     - No change          → staleness = OK
                    ├─ Update Documentation.staleness in Postgres
                    ├─ Update CodeUnit.rawCode/signature in Postgres
                    └─ Create Change record with affectedDocs[]
```

### 7.4 Update Draft Flow

```
User clicks "Suggest AI Fix"
        │
        ▼
POST /api/update-draft { docId }
        │
        ├─ Load Documentation + CodeUnit from Postgres
        ├─ Find most recent Change that affected this docId
        ├─ Build prompt: currentDoc + oldCode + newCode + gitDiff
        ├─ chatCompletion() → LLM generates revised Markdown
        └─ Save draftContent to Documentation record
```

### 7.5 Draft Approval Flow

```
User clicks "Approve & Publish"
        │
        ▼
POST /api/update-draft/approve { docId }
        │
        ├─ Load Documentation with draftContent
        ├─ generateEmbedding(draftContent) → new vector[]
        ├─ upsertDocEmbedding() → replace old Qdrant point with new vector
        └─ Update Documentation:
              content      = draftContent
              draftContent = null
              staleness    = OK
              qdrantPointId = new Qdrant point ID
```

### 7.6 RAG Chat Flow

```
User types a question in the Chat interface
        │
        ▼
POST /api/chat { messages, repoId }
        │
        ├─ generateEmbedding(latestUserMessage) → queryVector[]
        ├─ searchDocs(queryVector, repoId, topK=5) → top 5 Qdrant results
        ├─ Build augmented prompt: inject doc context blocks + user question
        ├─ LLM stream call → streaming text response
        └─ Return ReadableStream (Vercel AI SDK v1 stream protocol)
```

---

## 8. API Reference

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/ingest` | `{ repoUrl, branch? }` | Parse and store all code units from a GitHub repo |
| `POST` | `/api/generate` | `{ repoId, forceRebuild? }` | Generate LLM docs + Qdrant embeddings for a repo |
| `POST` | `/api/changes` | `{ repoId }` | Poll GitHub for new commits and update staleness |
| `POST` | `/api/update-draft` | `{ docId, changeId? }` | Generate an AI draft for a stale documentation |
| `POST` | `/api/update-draft/approve` | `{ docId }` | Promote a draft to canonical, update Qdrant |
| `POST` | `/api/chat` | `{ messages, repoId }` | Streaming RAG chat over the documentation |
| `DELETE` | `/api/repos/[id]` | — | Delete a repository and all associated data |

---

## 9. LLM Prompts Design

All prompts are defined in [`src/lib/prompts.ts`](src/lib/prompts.ts).

### `GENERATE_DOCS_SYSTEM_PROMPT`
Instructs the LLM to act as a technical documentation writer. Requires the output to include: **Purpose**, **Signature**, **Parameters**, **Return Value**, **Side Effects**, **Usage Example**, and **Edge Cases**.

### `buildGenerateDocPrompt(unitName, unitType, language, rawCode, existingDocstring?)`
Builds the user prompt by injecting the raw code snippet and any existing docstrings into a structured format.

### `UPDATE_DRAFT_SYSTEM_PROMPT`
Instructs the LLM to analyze a git diff and revise the existing documentation to reflect the changes. Output must be **only** the updated Markdown — no conversational text.

### `buildUpdateDraftPrompt(currentDoc, oldCode, newCode, diff)`
Structures the four inputs (current doc, old code, new code, git diff) into clearly labelled sections for the LLM.

### `RAG_CHAT_SYSTEM_PROMPT`
Strictly grounds the LLM to only answer from the provided context blocks. Instructs it to cite source files and unit names. Forbids hallucination.

### `buildRagChatPrompt(question, contextDocs[])`
Injects the Qdrant-retrieved context blocks (one per retrieved document) and appends the developer's question.

---

## 10. Vector Search (RAG) Design

### Collection Configuration
- **Collection Name:** `doc_embeddings` (configurable via `QDRANT_COLLECTION`)
- **Vector Dimensions:** `384` (configurable via `EMBEDDING_DIMENSIONS`)
- **Distance Metric:** Cosine similarity
- **Payload Index:** `repoId` field indexed as `keyword` for fast filtered search

### Point Payload (`DocPayload`)
```typescript
interface DocPayload {
  documentationId: string;  // Links back to Postgres Documentation.id
  repoId: string;           // Used for filtering search by repository
  unitName: string;         // For display in chat citations
  filePath: string;         // For display in chat citations
  language: string;         // Metadata
  content: string;          // Full Markdown text (used as RAG context)
}
```

### Embedding Model
- **Model:** `BAAI/bge-small-en-v1.5` (default) via HuggingFace Inference API
- **Input:** The generated Markdown documentation text (truncated to 4096 chars)
- **Output:** `number[]` of length 384
- The same model is used for both **indexing** (at generation/approval time) and **querying** (at chat time).

---

## 11. Staleness Classification Logic

Located in [`src/lib/staleness.ts`](src/lib/staleness.ts). A pure function `classifyStaleness()` with no side effects.

```
Input: oldSignature, newSignature, oldRawCode, newRawCode, isAdjacentFileChange

Classification rules (evaluated in priority order):
  1. If signature changed      → BROKEN            (API contract violation)
  2. If code body changed      → POTENTIALLY_OUTDATED (implementation changed)
  3. If adjacent file changed  → REVIEW_RECOMMENDED   (may have indirect impact)
  4. Otherwise                 → OK
```

Signature comparison normalizes whitespace and removes `export`, `default`, `async` modifiers before comparing, making the comparison more robust against trivial formatting changes.

---

## 12. Tracing & Observability

### Terminal Logging
The `chatCompletion()` function in `src/lib/llm.ts` logs:
- The model name and base URL being used
- The payload size in KB and number of messages
- A timer that logs success/failure and duration in seconds
- Full error details on failure (status code, headers, message)

The `/api/update-draft` route additionally logs:
- The full system prompt being sent
- The full user prompt (with doc, code, and diff)
- The full LLM response received

### LangSmith Tracing
The OpenAI client is wrapped with `wrapOpenAI` from `langsmith/wrappers`. When the `LANGCHAIN_TRACING_V2=true` environment variable is set, every LLM call is automatically traced to the LangSmith dashboard, showing full inputs, outputs, token counts, and latency.

---

## 13. Step-by-Step Build Guide

Follow these steps to build this project from scratch.

### Step 1: Project Setup
```bash
npx create-next-app@latest ai-doc-engine --typescript --app --tailwind --src-dir
cd ai-doc-engine
```

### Step 2: Install All Dependencies
```bash
# ORM & Database
npm install prisma @prisma/client

# GitHub API
npm install @octokit/rest

# LLM & Embedding
npm install openai ai @ai-sdk/openai @huggingface/inference langsmith

# AST Parsers
npm install @babel/parser @babel/traverse @babel/types web-tree-sitter

# Vector DB
npm install @qdrant/js-client-rest uuid

# UI
npx shadcn@latest init
npx shadcn@latest add card button badge input tabs
npm install lucide-react react-markdown rehype-highlight react-diff-viewer-continued sonner next-themes

# Utilities
npm install clsx tailwind-merge zod

# Dev deps
npm install -D @types/babel__traverse @types/uuid prisma
```

### Step 3: Set Up Postgres (Neon)
1. Create a free project at [neon.tech](https://neon.tech/).
2. Copy the **Pooled** and **Direct** connection strings into `.env.local`.
3. Initialize Prisma: `npx prisma init`
4. Write the schema (see [Section 5](#5-database-schema-postgresql-via-prisma)).
5. Run migration: `npx prisma migrate dev --name init`

### Step 4: Set Up Qdrant Cloud
1. Create a free cluster at [cloud.qdrant.io](https://cloud.qdrant.io/).
2. Copy the cluster URL and API key into `.env.local`.
3. The collection is auto-created on first use via `ensureCollection()`.

### Step 5: Set Up LLM Provider
1. Get an API key from your provider (NVIDIA, OpenAI, Groq, etc.).
2. Set `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` in `.env.local`.

### Step 6: Set Up HuggingFace Embeddings
1. Create a free account at [huggingface.co](https://huggingface.co/).
2. Generate an Access Token (read scope) and set it as `HF_TOKEN` in `.env.local`.

### Step 7: Set Up GitHub Token
1. Go to GitHub → Settings → Developer Settings → Personal Access Tokens.
2. Generate a classic token with the `repo` (read) scope.
3. Set as `GITHUB_TOKEN` in `.env.local`.

### Step 8: Build Core Library Files
Build in this order (dependency order):
1. `src/lib/db.ts` — Prisma singleton
2. `src/lib/llm.ts` — LLM + Embedding client (with `wrapOpenAI`)
3. `src/lib/qdrant.ts` — Qdrant client + helpers
4. `src/lib/github.ts` — Octokit helpers
5. `src/lib/staleness.ts` — Pure staleness classifier
6. `src/lib/prompts.ts` — All LLM prompts
7. `src/lib/parsers/babel.ts` — TypeScript/JS AST parser
8. `src/lib/parsers/treesitter.ts` — Python AST parser

### Step 9: Build API Routes
Build in this order:
1. `POST /api/ingest` — Uses github + parsers + prisma
2. `POST /api/generate` — Uses llm + qdrant + prisma
3. `POST /api/changes` — Uses github + parsers + staleness + prisma
4. `POST /api/update-draft` — Uses llm + prisma + prompts
5. `POST /api/update-draft/approve` — Uses llm + qdrant + prisma
6. `POST /api/chat` — Uses llm + qdrant + prompts (streaming)
7. `DELETE /api/repos/[id]` — Uses qdrant + prisma

### Step 10: Build the UI
1. `src/app/layout.tsx` — Global navigation bar
2. `src/app/page.tsx` — Dashboard
3. `src/app/docs/page.tsx` — Documentation browser
4. `src/app/docs/[id]/page.tsx` — Individual doc view with tabs
5. `src/app/changes/page.tsx` — Change log
6. `src/app/drafts/page.tsx` — Drafts queue
7. `src/app/chat/page.tsx` — RAG chat interface

### Step 11: Run
```bash
npm run dev
# Visit http://localhost:3000
```

---

*This document was generated from the live codebase of the AI-Powered Developer Documentation Engine project.*
