export interface ParsedCodeUnit {
  name: string;
  type: "function" | "class" | "module" | "method" | "arrow_function";
  signature: string | null;
  docstring: string | null;
  rawCode: string;
  lineStart: number;
  lineEnd: number;
}

export function parsePython(sourceCode: string, filePath: string): ParsedCodeUnit[] {
  const units: ParsedCodeUnit[] = [];
  const lines = sourceCode.split(/\r?\n/);
  
  // 1. Add module-level unit
  units.push({
    name: filePath.split("/").pop() || "module",
    type: "module",
    signature: null,
    docstring: extractModuleDocstring(lines),
    rawCode: sourceCode.slice(0, 500) + (sourceCode.length > 500 ? "..." : ""),
    lineStart: 1,
    lineEnd: lines.length || 1,
  });

  // A helper function to compute indentation level (number of spaces/tabs)
  function getIndentation(line: string): number {
    const match = line.match(/^([ \t]*)/);
    if (!match) return 0;
    // Count tabs as 4 spaces for uniform comparison
    return match[1].replace(/\t/g, "    ").length;
  }

  // A helper to check if a line is completely empty or a pure comment line
  function isEmptyOrComment(line: string): boolean {
    const trimmed = line.trim();
    return trimmed === "" || trimmed.startsWith("#");
  }

  // Scan all lines
  let currentClass: { name: string; indent: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track class scopes by checking if we have dropped out of the class's indentation
    if (currentClass && !isEmptyOrComment(line) && getIndentation(line) <= currentClass.indent) {
      currentClass = null;
    }

    // Match Class definitions
    const classMatch = line.match(/^([ \t]*)class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (classMatch) {
      const indent = getIndentation(line);
      const className = classMatch[2];
      currentClass = { name: className, indent };

      // Parse signature
      const { signature, endIdx } = parseDeclarationSignature(lines, i);
      const docstring = parseDocstring(lines, endIdx + 1);
      const { rawCode, lineEnd } = getPythonBody(lines, i, endIdx, indent);

      units.push({
        name: className,
        type: "class",
        signature,
        docstring,
        rawCode,
        lineStart: i + 1,
        lineEnd,
      });
      continue;
    }

    // Match Def definitions
    const defMatch = line.match(/^([ \t]*)def\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (defMatch) {
      const indent = getIndentation(line);
      const funcName = defMatch[2];
      const isMethod = currentClass && indent > currentClass.indent;

      const { signature, endIdx } = parseDeclarationSignature(lines, i);
      const docstring = parseDocstring(lines, endIdx + 1);
      const { rawCode, lineEnd } = getPythonBody(lines, i, endIdx, indent);

      units.push({
        name: isMethod ? `${currentClass!.name}.${funcName}` : funcName,
        type: isMethod ? "method" : "function",
        signature,
        docstring,
        rawCode,
        lineStart: i + 1,
        lineEnd,
      });
    }
  }

  return units;
}

// Helpers
function extractModuleDocstring(lines: string[]): string | null {
  // Check if the very first non-empty lines contain a docstring
  let firstIdx = 0;
  while (firstIdx < lines.length && lines[firstIdx].trim() === "") {
    firstIdx++;
  }
  if (firstIdx >= lines.length) return null;

  const firstLine = lines[firstIdx].trim();
  if (firstLine.startsWith('"""') || firstLine.startsWith("'''")) {
    return parseDocstring(lines, firstIdx);
  }
  return null;
}

function parseDeclarationSignature(lines: string[], startIdx: number): { signature: string, endIdx: number } {
  let content = "";
  let parenCount = 0;
  let bracketCount = 0;
  let braceCount = 0;
  
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    
    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      if (char === "(") parenCount++;
      else if (char === ")") parenCount--;
      else if (char === "[") bracketCount++;
      else if (char === "]") bracketCount--;
      else if (char === "{") braceCount++;
      else if (char === "}") braceCount--;
      else if (char === ":" && parenCount === 0 && bracketCount === 0 && braceCount === 0) {
        const currentLineSlice = line.slice(0, charIdx);
        const fullSignature = (content + " " + currentLineSlice).trim().replace(/\s+/g, " ");
        return {
          signature: fullSignature,
          endIdx: i,
        };
      }
    }
    content += " " + line.trim();
  }
  return { signature: lines[startIdx].trim(), endIdx: startIdx };
}

function parseDocstring(lines: string[], startIdx: number): string | null {
  // Skip empty lines first
  let i = startIdx;
  while (i < lines.length && lines[i].trim() === "") {
    i++;
  }
  if (i >= lines.length) return null;

  const line = lines[i].trim();
  const quoteChar = line.startsWith('"""') ? '"""' : line.startsWith("'''") ? "'''" : null;
  if (!quoteChar) return null;

  // Single-line docstring e.g. """docstring"""
  if (line.startsWith(quoteChar) && line.slice(quoteChar.length).includes(quoteChar)) {
    const endQuoteIdx = line.indexOf(quoteChar, quoteChar.length);
    return line.slice(quoteChar.length, endQuoteIdx).trim();
  }

  // Multi-line docstring
  let docstring = line.slice(quoteChar.length) + "\n";
  i++;
  while (i < lines.length) {
    const curLine = lines[i];
    if (curLine.includes(quoteChar)) {
      const endQuoteIdx = curLine.indexOf(quoteChar);
      docstring += curLine.slice(0, endQuoteIdx);
      return docstring.trim();
    }
    docstring += curLine + "\n";
    i++;
  }

  return docstring.trim();
}

function getPythonBody(lines: string[], startIdx: number, endIdx: number, declarationIndent: number): { rawCode: string, lineEnd: number } {
  let bodyLines: string[] = [];
  
  // Include all lines of the signature
  for (let idx = startIdx; idx <= endIdx; idx++) {
    bodyLines.push(lines[idx]);
  }

  let i = endIdx + 1;
  let lastNonEmptyIdx = endIdx;

  while (i < lines.length) {
    const line = lines[i];
    const isCommentOrEmpty = line.trim() === "" || line.trim().startsWith("#");

    if (!isCommentOrEmpty) {
      const currentIndent = line.match(/^([ \t]*)/)?.[1].replace(/\t/g, "    ").length ?? 0;
      if (currentIndent <= declarationIndent) {
        break; // Out of scope
      }
    }

    bodyLines.push(line);
    if (!isCommentOrEmpty) {
      lastNonEmptyIdx = i;
    }
    i++;
  }

  const finalLines = bodyLines.slice(0, lastNonEmptyIdx - startIdx + 1);
  return {
    rawCode: finalLines.join("\n"),
    lineEnd: lastNonEmptyIdx + 1,
  };
}
