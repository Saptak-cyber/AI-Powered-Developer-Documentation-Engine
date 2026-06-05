import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";

export interface ParsedCodeUnit {
  name: string;
  type: "function" | "class" | "module" | "method" | "arrow_function";
  signature: string | null;
  docstring: string | null;
  rawCode: string;
  lineStart: number;
  lineEnd: number;
}

/**
 * Extracts the raw code block for a given node from the source string.
 */
function getRawCode(sourceCode: string, start: number | null | undefined, end: number | null | undefined): string {
  if (start == null || end == null) return "";
  return sourceCode.slice(start, end);
}

/**
 * Normalizes signature representations.
 */
function extractSignature(node: any, sourceCode: string): string | null {
  if (!node.loc) return null;
  
  // For functions, a rough signature is the first line or up to the opening brace
  const raw = getRawCode(sourceCode, node.start, node.end);
  const braceIndex = raw.indexOf("{");
  if (braceIndex !== -1) {
    return raw.slice(0, braceIndex).trim();
  }
  return raw.split("\n")[0].trim();
}

/**
 * Extracts leading comments as docstrings.
 */
function extractDocstring(node: any): string | null {
  if (!node.leadingComments || node.leadingComments.length === 0) return null;
  
  // Get the last block of comments immediately preceding the node
  const comments = node.leadingComments
    .map((c: any) => c.value.trim())
    .join("\n");
    
  return comments.length > 0 ? comments : null;
}

/**
 * Parses JS/TS code and extracts functions, classes, and exported constants.
 */
export function parseTypeScript(sourceCode: string, filePath: string): ParsedCodeUnit[] {
  const units: ParsedCodeUnit[] = [];
  
  try {
    const ast = parser.parse(sourceCode, {
      sourceType: "module",
      plugins: [
        "typescript",
        "jsx",
        "decorators-legacy",
        "classProperties"
      ],
      attachComment: true,
    });

    // Create a module-level unit
    units.push({
      name: filePath.split("/").pop() || "module",
      type: "module",
      signature: null,
      docstring: extractDocstring(ast.program.body[0]) || null,
      rawCode: sourceCode.slice(0, 500) + (sourceCode.length > 500 ? "..." : ""), // Store a snippet for module
      lineStart: 1,
      lineEnd: ast.loc?.end.line || 1,
    });

    traverse(ast, {
      FunctionDeclaration(path) {
        if (!path.node.id) return;
        
        units.push({
          name: path.node.id.name,
          type: "function",
          signature: extractSignature(path.node, sourceCode),
          docstring: extractDocstring(path.node),
          rawCode: getRawCode(sourceCode, path.node.start, path.node.end),
          lineStart: path.node.loc?.start.line || 0,
          lineEnd: path.node.loc?.end.line || 0,
        });
      },
      
      ClassDeclaration(path) {
        if (!path.node.id) return;

        units.push({
          name: path.node.id.name,
          type: "class",
          signature: `class ${path.node.id.name}${path.node.superClass ? ' extends ...' : ''}`,
          docstring: extractDocstring(path.node),
          rawCode: getRawCode(sourceCode, path.node.start, path.node.end),
          lineStart: path.node.loc?.start.line || 0,
          lineEnd: path.node.loc?.end.line || 0,
        });
      },

      ClassMethod(path) {
        if (!t.isIdentifier(path.node.key)) return;

        // Optionally associate with parent class
        const parentClass = path.findParent(p => p.isClassDeclaration());
        const className = parentClass && t.isClassDeclaration(parentClass.node) && parentClass.node.id 
          ? `${parentClass.node.id.name}.` 
          : "";

        units.push({
          name: `${className}${path.node.key.name}`,
          type: "method",
          signature: extractSignature(path.node, sourceCode),
          docstring: extractDocstring(path.node),
          rawCode: getRawCode(sourceCode, path.node.start, path.node.end),
          lineStart: path.node.loc?.start.line || 0,
          lineEnd: path.node.loc?.end.line || 0,
        });
      },

      VariableDeclarator(path) {
        // Look for exported arrow functions or significant constant functions
        if (t.isArrowFunctionExpression(path.node.init) && t.isIdentifier(path.node.id)) {
           // Find if it's exported
           const isExported = path.findParent(p => p.isExportDeclaration());
           
           if (isExported || path.parentPath.parentPath?.isProgram()) {
              // Ensure we grab the docstring from the Export declaration or Variable declaration
              const commentNode = isExported ? isExported.node : path.parentPath.node;

              units.push({
                name: path.node.id.name,
                type: "arrow_function",
                signature: extractSignature(path.node.init, sourceCode),
                docstring: extractDocstring(commentNode),
                rawCode: getRawCode(sourceCode, path.parentPath.node.start, path.parentPath.node.end),
                lineStart: path.parentPath.node.loc?.start.line || 0,
                lineEnd: path.parentPath.node.loc?.end.line || 0,
              });
           }
        }
      }
    });

  } catch (error) {
    console.error(`Failed to parse ${filePath}:`, error);
  }

  return units;
}
