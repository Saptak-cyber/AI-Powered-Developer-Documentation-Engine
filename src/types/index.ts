export interface ParsedCodeUnit {
  name: string;
  type: "function" | "class" | "module" | "method" | "arrow_function";
  signature: string | null;
  docstring: string | null;
  rawCode: string;
  lineStart: number;
  lineEnd: number;
}

export type StalenessType = "OK" | "REVIEW_RECOMMENDED" | "POTENTIALLY_OUTDATED" | "BROKEN";

// Prisma generated types will augment this in practice, but these help the frontend
export interface CodeUnit {
  id: string;
  repoId: string;
  filePath: string;
  name: string;
  type: string;
  language: string;
  signature: string | null;
  docstring: string | null;
  rawCode: string;
  lineStart: number;
  lineEnd: number;
  doc?: Documentation;
}

export interface Documentation {
  id: string;
  unitId: string;
  content: string;
  draftContent: string | null;
  staleness: StalenessType;
  updatedAt: string;
}

export interface Repository {
  id: string;
  owner: string;
  name: string;
  branch: string;
  lastCommit: string | null;
}
