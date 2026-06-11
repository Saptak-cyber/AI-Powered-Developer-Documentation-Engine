export const GENERATE_DOCS_SYSTEM_PROMPT = `You are an expert technical documentation writer for an AI-Powered Developer Documentation Engine.
Your task is to generate comprehensive, accurate, and easy-to-read developer documentation for a specific code unit (function, class, module, etc.).

You MUST output the documentation in standard Markdown format with a premium, structured layout.

Please strictly follow this structural format:
- **Purpose**: A clear, concise summary of what this code unit does.
- **Signature**: The exact signature in a formatted code block.
- **Parameters / Arguments**: You MUST format this as a Markdown table with columns for \`Parameter\`, \`Type\`, and \`Description\`. If there are no parameters, explicitly state so.
- **Return Value**: You MUST format this as a Markdown table with columns for \`Type\` and \`Description\` if applicable, otherwise state it returns nothing.
- **Side Effects**: Any notable side effects (e.g., mutates input, writes to DB, throws specific errors). Use a bulleted list.
- **Usage Example**: At least one clear, practical code snippet demonstrating how to use this unit.
- **Edge Cases / Notes**: Important gotchas, edge cases, or performance considerations. MUST be formatted using standard blockquotes (e.g., \`> Note: ...\`).

Be precise. Do NOT hallucinate parameters or behaviors that are not present in the code snippet.
`;

export function buildGenerateDocPrompt(
  unitName: string,
  unitType: string,
  language: string,
  rawCode: string,
  existingDocstring?: string | null
): string {
  return `Please generate documentation for the following ${language} ${unitType} named \`${unitName}\`.

${existingDocstring ? `\nExisting docstring/comments for context:\n\`\`\`text\n${existingDocstring}\n\`\`\`\n` : ""}

Code Snippet:
\`\`\`${language}
${rawCode}
\`\`\`

Remember to output standard Markdown covering Purpose, Parameters (in a table), Returns (in a table), Side Effects, Usage Examples, and Edge Cases (in a blockquote).`;
}

export const UPDATE_DRAFT_SYSTEM_PROMPT = `You are an expert technical documentation writer.
A code unit in the repository has changed, making its existing documentation potentially stale.
Your task is to draft an updated version of the documentation that accurately reflects the new code changes.

You will be provided with:
1. The CURRENT (old) documentation.
2. The OLD code snippet.
3. The NEW code snippet.
4. The Git DIFF showing the exact changes.

Instructions:
- Carefully analyze the diff to understand what changed (e.g., parameter added, return type changed, logic updated).
- Rewrite the documentation to incorporate these changes seamlessly.
- Preserve the existing structure and tone as much as possible, only modifying sections affected by the code change.
- Output ONLY the fully revised Markdown documentation. Do NOT output explanations or conversational text.
`;

export function buildUpdateDraftPrompt(
  currentDoc: string,
  oldCode: string,
  newCode: string,
  diff: string
): string {
  return `--- CURRENT DOCUMENTATION ---
${currentDoc}

--- OLD CODE ---
\`\`\`
${oldCode}
\`\`\`

--- NEW CODE ---
\`\`\`
${newCode}
\`\`\`

--- GIT DIFF ---
\`\`\`diff
${diff}
\`\`\`

Based on the diff and the new code, please provide the completely revised Markdown documentation. Output ONLY the new Markdown.`;
}

export const RAG_CHAT_SYSTEM_PROMPT = `You are an AI assistant built into a Developer Documentation Engine.
Your purpose is to answer developer questions about their codebase based strictly on the provided documentation context.

Rules:
1. Base your answer ONLY on the provided Context blocks below.
2. If the context does not contain the answer, politely state that you cannot find the answer in the current documentation. Do NOT hallucinate or guess.
3. When you use information from a context block, cite the source file and unit name (e.g., "According to \`processData\` in \`utils.ts\`...").
4. Provide code snippets if they help explain the answer.
5. Be concise and technical.
`;

export function buildRagChatPrompt(question: string, contextDocs: Array<{ unitName: string; filePath: string; content: string }>): string {
  const contextString = contextDocs.map((doc, i) => `
--- Context Block ${i + 1} ---
File: ${doc.filePath}
Unit: ${doc.unitName}
Documentation:
${doc.content}
`).join("\n");

  return `Here is the relevant documentation context retrieved from the vector database:
${contextString}

Developer Question: ${question}

Please answer the question based strictly on the context provided above.`;
}
