import React from 'react';
import { Button } from "@/components/ui/button"
import { Camera } from "lucide-react"

interface SVGExportButtonProps {
  phyloTreeViewerRef: React.RefObject<any>;
}

export function SVGExportButton({ phyloTreeViewerRef }: SVGExportButtonProps) {
  const handleExport = () => {
    try {
      console.log('🖼️ SVGExportButton clicked, ref:', phyloTreeViewerRef.current);
      console.log('🖼️ exportToSVG method:', phyloTreeViewerRef.current?.exportToSVG);
      phyloTreeViewerRef.current?.exportToSVG?.();
    } catch (e) {
      console.error('🖼️ SVGExportButton error:', e);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 sm:size-7 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center border touch-manipulation"
      onClick={handleExport}
      title="Export current view to SVG"
    >
      <Camera size={16} />
      <span className="sr-only">Export SVG</span>
    </Button>
  );
}
