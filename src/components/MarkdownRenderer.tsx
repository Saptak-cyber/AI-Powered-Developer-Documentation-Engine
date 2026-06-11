import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ node, ...props }) => <h1 className="text-3xl font-extrabold tracking-tight mt-8 mb-4 pb-2 border-b border-border" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-2xl font-bold tracking-tight mt-8 mb-4 pb-2 border-b border-border/50 text-primary/90" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-xl font-semibold tracking-tight mt-6 mb-3 text-foreground/90" {...props} />,
          h4: ({ node, ...props }) => <h4 className="text-lg font-medium tracking-tight mt-6 mb-2" {...props} />,
          p: ({ node, ...props }) => <p className="leading-7 text-muted-foreground mb-4" {...props} />,
          ul: ({ node, ...props }) => <ul className="my-4 ml-6 list-disc space-y-2 text-muted-foreground marker:text-primary/50" {...props} />,
          ol: ({ node, ...props }) => <ol className="my-4 ml-6 list-decimal space-y-2 text-muted-foreground marker:text-primary/50" {...props} />,
          li: ({ node, ...props }) => <li className="pl-1" {...props} />,
          a: ({ node, ...props }) => <a className="font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="mt-4 mb-4 border-l-4 border-primary/50 bg-primary/5 px-4 py-3 rounded-r-lg italic text-muted-foreground shadow-sm" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="my-6 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-sm">
              <table className="w-full text-sm text-left" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-muted/50 border-b border-border text-foreground" {...props} />,
          th: ({ node, ...props }) => <th className="px-4 py-3 font-semibold tracking-wide" {...props} />,
          tbody: ({ node, ...props }) => <tbody className="divide-y divide-border/50" {...props} />,
          tr: ({ node, ...props }) => <tr className="hover:bg-muted/30 transition-colors" {...props} />,
          td: ({ node, ...props }) => <td className="px-4 py-3 align-top text-muted-foreground" {...props} />,
          code: ({ node, inline, ...props }: any) => {
            if (inline) {
              return <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-medium text-foreground border border-border/50" {...props} />;
            }
            return <code className="relative font-mono text-sm" {...props} />;
          },
          pre: ({ node, ...props }) => (
            <pre className="mb-4 mt-4 overflow-x-auto rounded-lg border border-border bg-[#0d1117] p-4 text-gray-300 shadow-sm" {...props} />
          ),
          hr: ({ node, ...props }) => <hr className="my-8 border-border" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
