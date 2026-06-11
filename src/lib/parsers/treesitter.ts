import path from "path";

// web-tree-sitter exports a namespace object; Parser and Language are nested exports
const WTS = require("web-tree-sitter");
const TreeParser = WTS.Parser as any;
const TreeLanguage = WTS.Language as any;

export interface ParsedCodeUnit {
  name: string;
  type: string;
  signature: string;
  rawCode: string;
  docstring: string | null;
  lineStart: number;
  lineEnd: number;
}

let parserInstance: any = null;
const loadedLanguages = new Map<string, any>();

export const LANGUAGE_CONFIGS: Record<
  string,
  {
    extensions: string[];
    wasmName: string;
    queryNodeTypes: string[];
    getName: (node: any) => string | null;
    getDocstring: (node: any) => string | null;
    getSignature: (node: any) => string;
  }
> = {
  python: {
    extensions: [".py"],
    wasmName: "python",
    queryNodeTypes: ["function_definition", "class_definition"],
    getName: (node) => node.childForFieldName("name")?.text || null,
    getSignature: (node: any) => {
      const name = node.childForFieldName("name")?.text || "";
      if (node.type === "class_definition") return `class ${name}`;
      const params = node.childForFieldName("parameters")?.text || "()";
      const returnType = node.childForFieldName("return_type")?.text; // includes " -> type"
      return `def ${name}${params}${returnType ? ` ${returnType}` : ""}`;
    },
    getDocstring: (node) => {
      const body = node.childForFieldName("body");
      if (body && body.children.length > 0) {
        const firstStmt = body.children[0];
        if (firstStmt.type === "expression_statement") {
          const strNode = firstStmt.children[0];
          if (strNode && strNode.type === "string") {
            return strNode.text.replace(/^"""|"""$/g, "").replace(/^'''|'''$/g, "").trim();
          }
        }
      }
      return null;
    },
  },
  typescript: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    wasmName: "tsx", // Use tsx wasm to support TS and JSX syntax gracefully
    queryNodeTypes: ["function_declaration", "class_declaration", "method_definition", "export_statement", "lexical_declaration"],
    getName: (node) => {
      if (node.type === "export_statement") {
        const decl = node.children.find((c: any) => ["function_declaration", "class_declaration", "lexical_declaration"].includes(c.type));
        if (!decl) return null;
        node = decl;
      }
      if (node.type === "lexical_declaration") {
        const declr = node.children.find((c: any) => c.type === "variable_declarator");
        const val = declr?.childForFieldName("value");
        if (val && (val.type === "arrow_function" || val.type === "function")) {
          return declr?.childForFieldName("name")?.text || null;
        }
        return null;
      }
      return node.childForFieldName("name")?.text || null;
    },
    getSignature: (node) => {
      let target = node;
      if (node.type === "export_statement") {
        const decl = node.children.find((c: any) => ["function_declaration", "class_declaration", "lexical_declaration"].includes(c.type));
        if (decl) target = decl;
      }
      
      if (target.type === "lexical_declaration") {
        const declr = target.children.find((c: any) => c.type === "variable_declarator");
        const name = declr?.childForFieldName("name")?.text || "anonymous";
        const val = declr?.childForFieldName("value");
        if (val) {
           const params = val.childForFieldName("parameters")?.text || "()";
           const returnType = val.childForFieldName("return_type")?.text || "";
           return `const ${name} = ${params}${returnType ? `: ${returnType}` : ""} => {...}`;
        }
      }

      const name = target.childForFieldName("name")?.text || "anonymous";
      if (target.type === "class_declaration") return `class ${name}`;
      
      const params = target.childForFieldName("parameters")?.text || "()";
      const returnType = target.childForFieldName("return_type")?.text || ""; // TS return_type includes the leading ': '
      return `function ${name}${params}${returnType ? ` ${returnType}` : ""}`;
    },
    getDocstring: (node) => {
      let prev = node.previousSibling;
      // Handle exported nodes where the comment might be above the export statement
      if (node.parent && node.parent.type === "export_statement") {
         prev = node.parent.previousSibling;
      }
      const comments = [];
      while (prev && prev.type === "comment") {
        comments.unshift(prev.text.replace(/^\/\*\*?|\*\/|^\/\//gm, "").trim());
        prev = prev.previousSibling;
      }
      return comments.length > 0 ? comments.join("\n") : null;
    },
  },
  go: {
    extensions: [".go"],
    wasmName: "go",
    queryNodeTypes: ["function_declaration", "method_declaration"],
    getName: (node) => node.childForFieldName("name")?.text || null,
    getSignature: (node) => {
       const name = node.childForFieldName("name")?.text || "";
       const params = node.childForFieldName("parameters")?.text || "()";
       const result = node.childForFieldName("result")?.text || "";
       const receiver = node.childForFieldName("receiver")?.text || "";
       return `func ${receiver ? receiver + " " : ""}${name}${params} ${result}`.trim();
    },
    getDocstring: (node) => {
      let prev = node.previousSibling;
      const comments = [];
      while (prev && prev.type === "comment") {
        comments.unshift(prev.text.replace(/^\/\//gm, "").trim());
        prev = prev.previousSibling;
      }
      return comments.length > 0 ? comments.join("\n") : null;
    }
  },
  java: {
    extensions: [".java"],
    wasmName: "java",
    queryNodeTypes: ["class_declaration", "method_declaration"],
    getName: (node) => node.childForFieldName("name")?.text || null,
    getSignature: (node) => {
      const name = node.childForFieldName("name")?.text || "";
      if (node.type === "class_declaration") return `class ${name}`;
      const params = node.childForFieldName("parameters")?.text || "()";
      const type = node.childForFieldName("type")?.text || "void";
      return `${type} ${name}${params}`;
    },
    getDocstring: (node) => {
      let prev = node.previousSibling;
      if (prev && prev.type === "modifiers") {
         prev = prev.previousSibling;
      }
      const comments = [];
      while (prev && prev.type === "comment" || prev?.type === "block_comment") {
        comments.unshift(prev.text.replace(/^\/\*\*?|\*\/|^\/\//gm, "").trim());
        prev = prev.previousSibling;
      }
      return comments.length > 0 ? comments.join("\n") : null;
    }
  },
  rust: {
    extensions: [".rs"],
    wasmName: "rust",
    queryNodeTypes: ["function_item", "struct_item"],
    getName: (node) => node.childForFieldName("name")?.text || null,
    getSignature: (node) => {
      const name = node.childForFieldName("name")?.text || "";
      if (node.type === "struct_item") return `struct ${name}`;
      const params = node.childForFieldName("parameters")?.text || "()";
      const ret = node.childForFieldName("return_type")?.text || "";
      return `fn ${name}${params} ${ret}`.trim();
    },
    getDocstring: (node) => {
      let prev = node.previousSibling;
      const comments = [];
      while (prev && prev.type === "line_comment") {
        comments.unshift(prev.text.replace(/^\/\/\/?/gm, "").trim());
        prev = prev.previousSibling;
      }
      return comments.length > 0 ? comments.join("\n") : null;
    }
  }
};

export async function getTreeSitterParser(language: string): Promise<any> {
  if (!parserInstance) {
    await TreeParser.init({
      locateFile(scriptName: string, scriptDirectory: string) {
        if (scriptName === "web-tree-sitter.wasm" || scriptName === "tree-sitter.wasm") {
          return path.join(process.cwd(), "node_modules", "web-tree-sitter", scriptName);
        }
        return scriptDirectory + scriptName;
      }
    });
    parserInstance = new TreeParser();
  }

  if (!loadedLanguages.has(language)) {
    // Pass the .wasm file path directly to Language.load (required by @repomix/tree-sitter-wasms)
    const wasmPath = path.join(process.cwd(), "node_modules", "@repomix", "tree-sitter-wasms", "out", `tree-sitter-${language}.wasm`);
    const Lang = await TreeLanguage.load(wasmPath);
    loadedLanguages.set(language, Lang);
  }

  parserInstance.setLanguage(loadedLanguages.get(language));
  return parserInstance;
}

export async function parseCodeWithTreeSitter(content: string, filePath: string): Promise<ParsedCodeUnit[]> {
  // Determine language config based on extension
  const ext = path.extname(filePath).toLowerCase();
  const configKey = Object.keys(LANGUAGE_CONFIGS).find((k) => LANGUAGE_CONFIGS[k].extensions.includes(ext));
  
  if (!configKey) {
    // Fallback: If we don't have a specific language config, we just ignore it or return empty
    return [];
  }

  const config = LANGUAGE_CONFIGS[configKey];
  const parser = await getTreeSitterParser(config.wasmName);
  const tree = parser.parse(content);

  const units: ParsedCodeUnit[] = [];

  function traverse(node: any) {
    if (config.queryNodeTypes.includes(node.type)) {
      const name = config.getName(node);
      if (name) {
        let type = "function";
        if (node.type.includes("class") || node.type.includes("struct")) type = "class";
        if (node.type.includes("method")) type = "method";
        
        // Avoid duplicating units if we processed export_statement which contains the actual declaration
        const existing = units.find(u => u.name === name && u.lineStart === node.startPosition.row + 1);
        if (!existing) {
          units.push({
            name,
            type,
            signature: config.getSignature(node),
            rawCode: node.text,
            docstring: config.getDocstring(node),
            lineStart: node.startPosition.row + 1,
            lineEnd: node.endPosition.row + 1,
          });
        }
      }
    }
    
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        traverse(child);
      }
    }
  }

  traverse(tree.rootNode);
  return units;
}
