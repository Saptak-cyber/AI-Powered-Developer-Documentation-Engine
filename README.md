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
The project uses `.env.local` for environment variables. A template is provided in `.env.local.example`.

Copy the example file to create your local configuration:

```bash
cp .env.local.example .env.local
```

Then open `.env.local` and fill in your actual API keys (LLM Provider, HuggingFace, Neon DB, Qdrant, and GitHub). 

> **Note:** `.env.local` is ignored by Git, ensuring your secrets are never committed. The `.env.local.example` file is kept public as a reference.

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
