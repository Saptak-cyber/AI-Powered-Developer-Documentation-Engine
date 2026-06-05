"use client";

import React from "react";
import ReactDiffViewer from "react-diff-viewer-continued";

interface DiffViewerProps {
  oldValue: string;
  newValue: string;
  splitView?: boolean;
}

export function DiffViewer({ oldValue, newValue, splitView = true }: DiffViewerProps) {
  return (
    <div className="border rounded-md overflow-hidden bg-background">
      <ReactDiffViewer
        oldValue={oldValue}
        newValue={newValue}
        splitView={splitView}
        useDarkTheme={true} // In a real app we'd sync this with next-themes
        styles={{
          variables: {
             dark: {
                diffViewerBackground: "transparent",
                gutterBackground: "hsl(var(--muted))",
             }
          }
        }}
      />
    </div>
  );
}
