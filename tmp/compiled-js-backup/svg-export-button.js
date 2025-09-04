"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SVGExportButton = SVGExportButton;
var jsx_runtime_1 = require("react/jsx-runtime");
var button_1 = require("@/components/ui/button");
var lucide_react_1 = require("lucide-react");
function SVGExportButton(_a) {
    var phyloTreeViewerRef = _a.phyloTreeViewerRef;
    var handleExport = function () {
        var _a, _b;
        console.log('🚀 SVG Export button clicked');
        console.log('📋 Ref check:', {
            hasRef: !!(phyloTreeViewerRef === null || phyloTreeViewerRef === void 0 ? void 0 : phyloTreeViewerRef.current),
            hasExportMethod: !!((_a = phyloTreeViewerRef === null || phyloTreeViewerRef === void 0 ? void 0 : phyloTreeViewerRef.current) === null || _a === void 0 ? void 0 : _a.exportToSVG)
        });
        if (phyloTreeViewerRef.current && phyloTreeViewerRef.current.exportToSVG) {
            console.log('✅ Calling PhyloTreeViewer exportToSVG');
            phyloTreeViewerRef.current.exportToSVG();
        }
        else {
            console.error('❌ PhyloTreeViewer ref not available or export method not found', {
                refExists: !!phyloTreeViewerRef.current,
                exportMethodExists: !!((_b = phyloTreeViewerRef.current) === null || _b === void 0 ? void 0 : _b.exportToSVG)
            });
        }
    };
    return ((0, jsx_runtime_1.jsxs)(button_1.Button, { variant: "ghost", size: "icon", className: "size-7 flex items-center justify-center border", style: {
            backgroundColor: 'lightblue', // Temporary debug color
        }, onClick: handleExport, title: "Export current view to SVG", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { size: 16 }), (0, jsx_runtime_1.jsx)("span", { className: "sr-only", children: "Export SVG" })] }));
}
