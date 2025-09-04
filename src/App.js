"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var app_sidebar_1 = require("@/components/app-sidebar");
var svg_export_button_1 = require("@/components/svg-export-button");
var sidebar_1 = require("@/components/ui/sidebar");
var AppPhylo_jsx_1 = __importDefault(require("./AppPhylo.jsx"));
var ThemeContext_jsx_1 = require("@/contexts/ThemeContext.jsx");
function App() {
    // Shared sidebar/AppPhylo state
    var _a = (0, react_1.useState)(false), ultrametric = _a[0], setUltrametric = _a[1];
    var _b = (0, react_1.useState)(false), showConnectingLines = _b[0], setShowConnectingLines = _b[1];
    var _c = (0, react_1.useState)(true), showScrollbar = _c[0], setShowScrollbar = _c[1];
    var _d = (0, react_1.useState)(false), alignLabels = _d[0], setAlignLabels = _d[1];
    var _e = (0, react_1.useState)(null), alignCluster = _e[0], setAlignCluster = _e[1];
    var _f = (0, react_1.useState)(true), useDefaultGeneAlignment = _f[0], setUseDefaultGeneAlignment = _f[1];
    var _g = (0, react_1.useState)('start'), defaultAlign = _g[0], setDefaultAlign = _g[1];
    var _h = (0, react_1.useState)('after-tree'), phyloLabelPosition = _h[0], setPhyloLabelPosition = _h[1];
    var _j = (0, react_1.useState)(120), arrowheadHeightDisplay = _j[0], setArrowheadHeightDisplay = _j[1];
    var _k = (0, react_1.useState)(500), geneHeightDisplay = _k[0], setGeneHeightDisplay = _k[1];
    // Provide defaults matching AppPhylo so the top-level controls are enabled by default
    var _l = (0, react_1.useState)('domainName'), domainColorBy = _l[0], setDomainColorBy = _l[1];
    var _m = (0, react_1.useState)('cluster'), geneColorBy = _m[0], setGeneColorBy = _m[1];
    var _o = (0, react_1.useState)('species'), treeColorBy = _o[0], setTreeColorBy = _o[1];
    var _p = (0, react_1.useState)('species'), treeLabelBy = _p[0], setTreeLabelBy = _p[1];
    var _q = (0, react_1.useState)('cluster'), geneLabelBy = _q[0], setGeneLabelBy = _q[1];
    var _r = (0, react_1.useState)({ type: 'qualitative', name: 'Set2', numColors: 8, reverse: false, enabled: true }), genePalette = _r[0], setGenePalette = _r[1];
    var _s = (0, react_1.useState)({ type: 'qualitative', name: 'Set2', numColors: 8, reverse: false, enabled: true }), phyloPalette = _s[0], setPhyloPalette = _s[1];
    var _t = (0, react_1.useState)({ type: 'qualitative', name: 'Set2', numColors: 8, reverse: false, enabled: true }), domainPalette = _t[0], setDomainPalette = _t[1];
    var _u = (0, react_1.useState)({ type: 'qualitative', name: 'Set3', numColors: 8, reverse: false, enabled: true }), ncRNAPalette = _u[0], setNcRNAPalette = _u[1];
    var _v = (0, react_1.useState)({ type: 'qualitative', name: 'Dark2', numColors: 8, reverse: false, enabled: true }), regionPalette = _v[0], setRegionPalette = _v[1];
    var _w = (0, react_1.useState)(null), proteinLinkConfig = _w[0], setProteinLinkConfig = _w[1];
    var _x = (0, react_1.useState)(null), nucleotideLinkConfig = _x[0], setNucleotideLinkConfig = _x[1];
    var _y = (0, react_1.useState)(100), treeXScale = _y[0], setTreeXScale = _y[1];
    var _z = (0, react_1.useState)(null), viewerLegend = _z[0], setViewerLegend = _z[1];
    var _0 = (0, react_1.useState)(null), styleConfig = _0[0], setStyleConfig = _0[1];
    var phyloTreeViewerRef = (0, react_1.useRef)(null);
    // Metadata columns for select options (stateful so parsed data can update them)
    var _1 = (0, react_1.useState)(['cluster', 'species', 'geneType']), geneMetadataColumnsState = _1[0], setGeneMetadataColumns = _1[1];
    var _2 = (0, react_1.useState)(['species', 'branchLength', 'support']), treeMetadataColumnsState = _2[0], setTreeMetadataColumns = _2[1];
    // Dummy track handlers
    var handleTrackShiftMinus1kb = function (hoodId) { };
    var handleTrackShiftPlus1kb = function (hoodId) { };
    var handleTrackFlip = function (hoodId) { };
    var handleArrowheadHeightChange = function (val) { return setArrowheadHeightDisplay(val); };
    var handleGeneHeightChange = function (val) { return setGeneHeightDisplay(val); };
    return ((0, jsx_runtime_1.jsx)(ThemeContext_jsx_1.ThemeProvider, { children: (0, jsx_runtime_1.jsxs)(sidebar_1.SidebarProvider, { style: {
                '--sidebar-width': 'calc(var(--spacing) * 85)',
                '--header-height': 'calc(var(--spacing) * 12)',
            }, children: [(0, jsx_runtime_1.jsx)(app_sidebar_1.AppSidebar, { variant: "inset", ultrametric: ultrametric, setUltrametric: setUltrametric, showConnectingLines: showConnectingLines, setShowConnectingLines: setShowConnectingLines, showScrollbar: showScrollbar, setShowScrollbar: setShowScrollbar, alignLabels: alignLabels, setAlignLabels: setAlignLabels, alignCluster: alignCluster, setAlignCluster: setAlignCluster, useDefaultGeneAlignment: useDefaultGeneAlignment, setUseDefaultGeneAlignment: setUseDefaultGeneAlignment, defaultAlign: defaultAlign, setDefaultAlign: setDefaultAlign, phyloLabelPosition: phyloLabelPosition, setPhyloLabelPosition: setPhyloLabelPosition, arrowheadHeightDisplay: arrowheadHeightDisplay, setArrowheadHeightDisplay: setArrowheadHeightDisplay, geneHeightDisplay: geneHeightDisplay, setGeneHeightDisplay: setGeneHeightDisplay, geneColorBy: geneColorBy, setGeneColorBy: setGeneColorBy, treeColorBy: treeColorBy, setTreeColorBy: setTreeColorBy, domainColorBy: domainColorBy, setDomainColorBy: setDomainColorBy, treeLabelBy: treeLabelBy, setTreeLabelBy: setTreeLabelBy, geneLabelBy: geneLabelBy, setGeneLabelBy: setGeneLabelBy, genePalette: genePalette, setGenePalette: setGenePalette, phyloPalette: phyloPalette, setPhyloPalette: setPhyloPalette, domainPalette: domainPalette, setDomainPalette: setDomainPalette, ncRNAPalette: ncRNAPalette, setNcRNAPalette: setNcRNAPalette, regionPalette: regionPalette, setRegionPalette: setRegionPalette, proteinLinkConfig: proteinLinkConfig, setProteinLinkConfig: setProteinLinkConfig, nucleotideLinkConfig: nucleotideLinkConfig, setNucleotideLinkConfig: setNucleotideLinkConfig, treeXScale: treeXScale, setTreeXScale: setTreeXScale, viewerLegend: viewerLegend, setViewerLegend: setViewerLegend, styleConfig: styleConfig, setStyleConfig: setStyleConfig, phyloTreeViewerRef: phyloTreeViewerRef, geneMetadataColumns: geneMetadataColumnsState, treeMetadataColumns: treeMetadataColumnsState, setGeneMetadataColumns: setGeneMetadataColumns, setTreeMetadataColumns: setTreeMetadataColumns, handleTrackShiftMinus1kb: handleTrackShiftMinus1kb, handleTrackShiftPlus1kb: handleTrackShiftPlus1kb, handleTrackFlip: handleTrackFlip, handleArrowheadHeightChange: handleArrowheadHeightChange, handleGeneHeightChange: handleGeneHeightChange }), (0, jsx_runtime_1.jsxs)(sidebar_1.SidebarInset, { children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                                position: 'absolute',
                                top: '10px',
                                left: '10px',
                                zIndex: 1000,
                                background: 'white',
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                display: 'flex',
                                gap: '4px',
                                padding: '4px'
                            }, children: [(0, jsx_runtime_1.jsx)(sidebar_1.SidebarTrigger, { className: "size-7 flex items-center justify-center border", style: { position: 'static' } }), (0, jsx_runtime_1.jsx)(svg_export_button_1.SVGExportButton, { phyloTreeViewerRef: phyloTreeViewerRef })] }), (0, jsx_runtime_1.jsx)(AppPhylo_jsx_1.default, { ultrametric: ultrametric, showConnectingLines: showConnectingLines, showScrollbar: showScrollbar, alignLabels: alignLabels, alignCluster: alignCluster, useDefaultGeneAlignment: useDefaultGeneAlignment, defaultAlign: defaultAlign, phyloLabelPosition: phyloLabelPosition, arrowheadHeightDisplay: arrowheadHeightDisplay, geneHeightDisplay: geneHeightDisplay, geneColorBy: geneColorBy, treeColorBy: treeColorBy, domainColorBy: domainColorBy, treeLabelBy: treeLabelBy, geneLabelBy: geneLabelBy, genePalette: genePalette, phyloPalette: phyloPalette, domainPalette: domainPalette, ncRNAPalette: ncRNAPalette, regionPalette: regionPalette, proteinLinkConfig: proteinLinkConfig, nucleotideLinkConfig: nucleotideLinkConfig, treeXScale: treeXScale, viewerLegend: viewerLegend, styleConfig: styleConfig, phyloTreeViewerRef: phyloTreeViewerRef, geneMetadataColumns: geneMetadataColumnsState, treeMetadataColumns: treeMetadataColumnsState, setGeneMetadataColumns: setGeneMetadataColumns, setTreeMetadataColumns: setTreeMetadataColumns, handleTrackShiftMinus1kb: handleTrackShiftMinus1kb, handleTrackShiftPlus1kb: handleTrackShiftPlus1kb, handleTrackFlip: handleTrackFlip, handleArrowheadHeightChange: handleArrowheadHeightChange, handleGeneHeightChange: handleGeneHeightChange })] })] }) }));
}
exports.default = App;
