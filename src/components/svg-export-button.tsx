import React from 'react';
import { Button } from "@/components/ui/button"
import { Camera } from "lucide-react"

interface SVGExportButtonProps {
  phyloTreeViewerRef: React.RefObject<any>;
}

export function SVGExportButton({ phyloTreeViewerRef }: SVGExportButtonProps) {
  const handleExport = () => {
    try {
      phyloTreeViewerRef.current?.exportToSVG?.();
    } catch (e) {}
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 flex items-center justify-center border"
      onClick={handleExport}
      title="Export current view to SVG"
    >
      <Camera size={16} />
      <span className="sr-only">Export SVG</span>
    </Button>
  );
}
