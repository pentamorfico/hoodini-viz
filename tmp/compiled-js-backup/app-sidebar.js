"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSidebar = AppSidebar;
var jsx_runtime_1 = require("react/jsx-runtime");
var icons_react_1 = require("@tabler/icons-react");
var react_1 = require("react");
var sidebar_1 = require("@/components/ui/sidebar");
var ColorPaletteWidget_1 = __importDefault(require("@/widgets/ColorPaletteWidget"));
var LinkColorWidget_1 = __importDefault(require("@/widgets/LinkColorWidget"));
var LegendWidget_1 = __importDefault(require("@/widgets/LegendWidget"));
var ThemeToggle_1 = __importDefault(require("@/components/ThemeToggle"));
var data = {
    user: {
        name: "shadcn",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg",
    },
    navMain: [
        {
            title: "Dashboard",
            url: "#",
            icon: icons_react_1.IconDashboard,
        },
        {
            title: "Lifecycle",
            url: "#",
            icon: icons_react_1.IconListDetails,
        },
        {
            title: "Analytics",
            url: "#",
            icon: icons_react_1.IconChartBar,
        },
        {
            title: "Projects",
            url: "#",
            icon: icons_react_1.IconFolder,
        },
        {
            title: "Team",
            url: "#",
            icon: icons_react_1.IconUsers,
        },
    ],
    navClouds: [
        {
            title: "Capture",
            icon: icons_react_1.IconCamera,
            isActive: true,
            url: "#",
            items: [
                {
                    title: "Active Proposals",
                    url: "#",
                },
                {
                    title: "Archived",
                    url: "#",
                },
            ],
        },
        {
            title: "Proposal",
            icon: icons_react_1.IconFileDescription,
            url: "#",
            items: [
                {
                    title: "Active Proposals",
                    url: "#",
                },
                {
                    title: "Archived",
                    url: "#",
                },
            ],
        },
        {
            title: "Prompts",
            icon: icons_react_1.IconFileAi,
            url: "#",
            items: [
                {
                    title: "Active Proposals",
                    url: "#",
                },
                {
                    title: "Archived",
                    url: "#",
                },
            ],
        },
    ],
    navSecondary: [
        {
            title: "Settings",
            url: "#",
            icon: icons_react_1.IconSettings,
        },
        {
            title: "Get Help",
            url: "#",
            icon: icons_react_1.IconHelp,
        },
        {
            title: "Search",
            url: "#",
            icon: icons_react_1.IconSearch,
        },
    ],
    documents: [
        {
            name: "Data Library",
            url: "#",
            icon: icons_react_1.IconDatabase,
        },
        {
            name: "Reports",
            url: "#",
            icon: icons_react_1.IconReport,
        },
        {
            name: "Word Assistant",
            url: "#",
            icon: icons_react_1.IconFileWord,
        },
    ],
};
function AppSidebar(_a) {
    var variant = _a.variant, 
    // pass-through controlled props from App.tsx (optional)
    ultrametricProp = _a.ultrametric, setUltrametricProp = _a.setUltrametric, showConnectingLinesProp = _a.showConnectingLines, setShowConnectingLinesProp = _a.setShowConnectingLines, showScrollbarProp = _a.showScrollbar, setShowScrollbarProp = _a.setShowScrollbar, alignLabelsProp = _a.alignLabels, setAlignLabelsProp = _a.setAlignLabels, alignClusterProp = _a.alignCluster, setAlignClusterProp = _a.setAlignCluster, useDefaultGeneAlignmentProp = _a.useDefaultGeneAlignment, setUseDefaultGeneAlignmentProp = _a.setUseDefaultGeneAlignment, defaultAlignProp = _a.defaultAlign, setDefaultAlignProp = _a.setDefaultAlign, phyloLabelPositionProp = _a.phyloLabelPosition, setPhyloLabelPositionProp = _a.setPhyloLabelPosition, arrowheadHeightDisplayProp = _a.arrowheadHeightDisplay, setArrowheadHeightDisplayProp = _a.setArrowheadHeightDisplay, geneHeightDisplayProp = _a.geneHeightDisplay, setGeneHeightDisplayProp = _a.setGeneHeightDisplay, geneColorByProp = _a.geneColorBy, setGeneColorByProp = _a.setGeneColorBy, treeColorByProp = _a.treeColorBy, setTreeColorByProp = _a.setTreeColorBy, domainColorByProp = _a.domainColorBy, setDomainColorByProp = _a.setDomainColorBy, treeLabelByProp = _a.treeLabelBy, setTreeLabelByProp = _a.setTreeLabelBy, geneLabelByProp = _a.geneLabelBy, setGeneLabelByProp = _a.setGeneLabelBy, genePaletteProp = _a.genePalette, setGenePaletteProp = _a.setGenePalette, phyloPaletteProp = _a.phyloPalette, setPhyloPaletteProp = _a.setPhyloPalette, domainPaletteProp = _a.domainPalette, setDomainPaletteProp = _a.setDomainPalette, ncRNAPaletteProp = _a.ncRNAPalette, setNcRNAPaletteProp = _a.setNcRNAPalette, regionPaletteProp = _a.regionPalette, setRegionPaletteProp = _a.setRegionPalette, proteinLinkConfigProp = _a.proteinLinkConfig, setProteinLinkConfigProp = _a.setProteinLinkConfig, nucleotideLinkConfigProp = _a.nucleotideLinkConfig, setNucleotideLinkConfigProp = _a.setNucleotideLinkConfig, treeXScaleProp = _a.treeXScale, setTreeXScaleProp = _a.setTreeXScale, viewerLegendProp = _a.viewerLegend, setViewerLegendProp = _a.setViewerLegend, styleConfigProp = _a.styleConfig, setStyleConfigProp = _a.setStyleConfig, phyloTreeViewerRefProp = _a.phyloTreeViewerRef, geneMetadataColumnsProp = _a.geneMetadataColumns, setGeneMetadataColumnsProp = _a.setGeneMetadataColumns, treeMetadataColumnsProp = _a.treeMetadataColumns, setTreeMetadataColumnsProp = _a.setTreeMetadataColumns, handleTrackShiftMinus1kbProp = _a.handleTrackShiftMinus1kb, handleTrackShiftPlus1kbProp = _a.handleTrackShiftPlus1kb, handleTrackFlipProp = _a.handleTrackFlip, handleArrowheadHeightChangeProp = _a.handleArrowheadHeightChange, handleGeneHeightChangeProp = _a.handleGeneHeightChange, props = __rest(_a, ["variant", "ultrametric", "setUltrametric", "showConnectingLines", "setShowConnectingLines", "showScrollbar", "setShowScrollbar", "alignLabels", "setAlignLabels", "alignCluster", "setAlignCluster", "useDefaultGeneAlignment", "setUseDefaultGeneAlignment", "defaultAlign", "setDefaultAlign", "phyloLabelPosition", "setPhyloLabelPosition", "arrowheadHeightDisplay", "setArrowheadHeightDisplay", "geneHeightDisplay", "setGeneHeightDisplay", "geneColorBy", "setGeneColorBy", "treeColorBy", "setTreeColorBy", "domainColorBy", "setDomainColorBy", "treeLabelBy", "setTreeLabelBy", "geneLabelBy", "setGeneLabelBy", "genePalette", "setGenePalette", "phyloPalette", "setPhyloPalette", "domainPalette", "setDomainPalette", "ncRNAPalette", "setNcRNAPalette", "regionPalette", "setRegionPalette", "proteinLinkConfig", "setProteinLinkConfig", "nucleotideLinkConfig", "setNucleotideLinkConfig", "treeXScale", "setTreeXScale", "viewerLegend", "setViewerLegend", "styleConfig", "setStyleConfig", "phyloTreeViewerRef", "geneMetadataColumns", "setGeneMetadataColumns", "treeMetadataColumns", "setTreeMetadataColumns", "handleTrackShiftMinus1kb", "handleTrackShiftPlus1kb", "handleTrackFlip", "handleArrowheadHeightChange", "handleGeneHeightChange"]);
    // Local fallback state for controls when parent doesn't provide them
    var _b = (0, react_1.useState)(false), localUltrametric = _b[0], setLocalUltrametric = _b[1];
    var ultrametric = typeof ultrametricProp !== 'undefined' ? ultrametricProp : localUltrametric;
    var setUltrametric = typeof setUltrametricProp === 'function' ? setUltrametricProp : setLocalUltrametric;
    var _c = (0, react_1.useState)(false), localShowConnectingLines = _c[0], setLocalShowConnectingLines = _c[1];
    var showConnectingLines = typeof showConnectingLinesProp !== 'undefined' ? showConnectingLinesProp : localShowConnectingLines;
    var setShowConnectingLines = typeof setShowConnectingLinesProp === 'function' ? setShowConnectingLinesProp : setLocalShowConnectingLines;
    var _d = (0, react_1.useState)(false), localShowScrollbar = _d[0], setLocalShowScrollbar = _d[1];
    var showScrollbar = typeof showScrollbarProp !== 'undefined' ? showScrollbarProp : localShowScrollbar;
    var setShowScrollbar = typeof setShowScrollbarProp === 'function' ? setShowScrollbarProp : setLocalShowScrollbar;
    var _e = (0, react_1.useState)(false), localAlignLabels = _e[0], setLocalAlignLabels = _e[1];
    var alignLabels = typeof alignLabelsProp !== 'undefined' ? alignLabelsProp : localAlignLabels;
    var setAlignLabels = typeof setAlignLabelsProp === 'function' ? setAlignLabelsProp : setLocalAlignLabels;
    var _f = (0, react_1.useState)(null), localAlignCluster = _f[0], setLocalAlignCluster = _f[1];
    var alignCluster = typeof alignClusterProp !== 'undefined' ? alignClusterProp : localAlignCluster;
    var setAlignCluster = typeof setAlignClusterProp === 'function' ? setAlignClusterProp : setLocalAlignCluster;
    var _g = (0, react_1.useState)(false), localUseDefaultGeneAlignment = _g[0], setLocalUseDefaultGeneAlignment = _g[1];
    var useDefaultGeneAlignment = typeof useDefaultGeneAlignmentProp !== 'undefined' ? useDefaultGeneAlignmentProp : localUseDefaultGeneAlignment;
    var setUseDefaultGeneAlignment = typeof setUseDefaultGeneAlignmentProp === 'function' ? setUseDefaultGeneAlignmentProp : setLocalUseDefaultGeneAlignment;
    var _h = (0, react_1.useState)('start'), localDefaultAlign = _h[0], setLocalDefaultAlign = _h[1];
    var defaultAlign = typeof defaultAlignProp !== 'undefined' ? defaultAlignProp : localDefaultAlign;
    var setDefaultAlign = typeof setDefaultAlignProp === 'function' ? setDefaultAlignProp : setLocalDefaultAlign;
    var _j = (0, react_1.useState)('after-tree'), localPhyloLabelPosition = _j[0], setLocalPhyloLabelPosition = _j[1];
    var phyloLabelPosition = typeof phyloLabelPositionProp !== 'undefined' ? phyloLabelPositionProp : localPhyloLabelPosition;
    var setPhyloLabelPosition = typeof setPhyloLabelPositionProp === 'function' ? setPhyloLabelPositionProp : setLocalPhyloLabelPosition;
    var _k = (0, react_1.useState)(50), localArrowheadHeightDisplay = _k[0], setLocalArrowheadHeightDisplay = _k[1];
    var arrowheadHeightDisplay = typeof arrowheadHeightDisplayProp !== 'undefined' ? arrowheadHeightDisplayProp : localArrowheadHeightDisplay;
    var setArrowheadHeightDisplay = typeof setArrowheadHeightDisplayProp === 'function' ? setArrowheadHeightDisplayProp : setLocalArrowheadHeightDisplay;
    var _l = (0, react_1.useState)(100), localGeneHeightDisplay = _l[0], setLocalGeneHeightDisplay = _l[1];
    var geneHeightDisplay = typeof geneHeightDisplayProp !== 'undefined' ? geneHeightDisplayProp : localGeneHeightDisplay;
    var setGeneHeightDisplay = typeof setGeneHeightDisplayProp === 'function' ? setGeneHeightDisplayProp : setLocalGeneHeightDisplay;
    var _m = (0, react_1.useState)(''), localGeneColorBy = _m[0], setLocalGeneColorBy = _m[1];
    var geneColorBy = typeof geneColorByProp !== 'undefined' ? geneColorByProp : localGeneColorBy;
    var setGeneColorBy = typeof setGeneColorByProp === 'function' ? setGeneColorByProp : setLocalGeneColorBy;
    var _o = (0, react_1.useState)(''), localTreeColorBy = _o[0], setLocalTreeColorBy = _o[1];
    var treeColorBy = typeof treeColorByProp !== 'undefined' ? treeColorByProp : localTreeColorBy;
    var setTreeColorBy = typeof setTreeColorByProp === 'function' ? setTreeColorByProp : setLocalTreeColorBy;
    var _p = (0, react_1.useState)('domainName'), localDomainColorBy = _p[0], setLocalDomainColorBy = _p[1];
    var domainColorBy = typeof domainColorByProp !== 'undefined' ? domainColorByProp : localDomainColorBy;
    var setDomainColorBy = typeof setDomainColorByProp === 'function' ? setDomainColorByProp : setLocalDomainColorBy;
    var _q = (0, react_1.useState)(''), localTreeLabelBy = _q[0], setLocalTreeLabelBy = _q[1];
    var treeLabelBy = typeof treeLabelByProp !== 'undefined' ? treeLabelByProp : localTreeLabelBy;
    var setTreeLabelBy = typeof setTreeLabelByProp === 'function' ? setTreeLabelByProp : setLocalTreeLabelBy;
    var _r = (0, react_1.useState)(''), localGeneLabelBy = _r[0], setLocalGeneLabelBy = _r[1];
    var geneLabelBy = typeof geneLabelByProp !== 'undefined' ? geneLabelByProp : localGeneLabelBy;
    var setGeneLabelBy = typeof setGeneLabelByProp === 'function' ? setGeneLabelByProp : setLocalGeneLabelBy;
    var _s = (0, react_1.useState)({ enabled: false }), localGenePalette = _s[0], setLocalGenePalette = _s[1];
    var genePalette = typeof genePaletteProp !== 'undefined' ? genePaletteProp : localGenePalette;
    var setGenePalette = typeof setGenePaletteProp === 'function' ? setGenePaletteProp : setLocalGenePalette;
    var _t = (0, react_1.useState)({ enabled: false }), localPhyloPalette = _t[0], setLocalPhyloPalette = _t[1];
    var phyloPalette = typeof phyloPaletteProp !== 'undefined' ? phyloPaletteProp : localPhyloPalette;
    var setPhyloPalette = typeof setPhyloPaletteProp === 'function' ? setPhyloPaletteProp : setLocalPhyloPalette;
    var _u = (0, react_1.useState)({ enabled: false }), localDomainPalette = _u[0], setLocalDomainPalette = _u[1];
    var domainPalette = typeof domainPaletteProp !== 'undefined' ? domainPaletteProp : localDomainPalette;
    var setDomainPalette = typeof setDomainPaletteProp === 'function' ? setDomainPaletteProp : setLocalDomainPalette;
    var _v = (0, react_1.useState)({ enabled: false }), localNcRNAPalette = _v[0], setLocalNcRNAPalette = _v[1];
    var ncRNAPalette = typeof ncRNAPaletteProp !== 'undefined' ? ncRNAPaletteProp : localNcRNAPalette;
    var setNcRNAPalette = typeof setNcRNAPaletteProp === 'function' ? setNcRNAPaletteProp : setLocalNcRNAPalette;
    var _w = (0, react_1.useState)({ enabled: false }), localRegionPalette = _w[0], setLocalRegionPalette = _w[1];
    var regionPalette = typeof regionPaletteProp !== 'undefined' ? regionPaletteProp : localRegionPalette;
    var setRegionPalette = typeof setRegionPaletteProp === 'function' ? setRegionPaletteProp : setLocalRegionPalette;
    var _x = (0, react_1.useState)(null), localProteinLinkConfig = _x[0], setLocalProteinLinkConfig = _x[1];
    var proteinLinkConfig = typeof proteinLinkConfigProp !== 'undefined' ? proteinLinkConfigProp : localProteinLinkConfig;
    var setProteinLinkConfig = typeof setProteinLinkConfigProp === 'function' ? setProteinLinkConfigProp : setLocalProteinLinkConfig;
    var _y = (0, react_1.useState)(null), localNucleotideLinkConfig = _y[0], setLocalNucleotideLinkConfig = _y[1];
    var nucleotideLinkConfig = typeof nucleotideLinkConfigProp !== 'undefined' ? nucleotideLinkConfigProp : localNucleotideLinkConfig;
    var setNucleotideLinkConfig = typeof setNucleotideLinkConfigProp === 'function' ? setNucleotideLinkConfigProp : setLocalNucleotideLinkConfig;
    var _z = (0, react_1.useState)(100), localTreeXScale = _z[0], setLocalTreeXScale = _z[1];
    var treeXScale = typeof treeXScaleProp !== 'undefined' ? treeXScaleProp : localTreeXScale;
    var setTreeXScale = typeof setTreeXScaleProp === 'function' ? setTreeXScaleProp : setLocalTreeXScale;
    var _0 = (0, react_1.useState)(null), localViewerLegend = _0[0], setLocalViewerLegend = _0[1];
    var viewerLegend = typeof viewerLegendProp !== 'undefined' ? viewerLegendProp : localViewerLegend;
    var setViewerLegend = typeof setViewerLegendProp === 'function' ? setViewerLegendProp : setLocalViewerLegend;
    var _1 = (0, react_1.useState)(null), localStyleConfig = _1[0], setLocalStyleConfig = _1[1];
    var styleConfig = typeof styleConfigProp !== 'undefined' ? styleConfigProp : localStyleConfig;
    var setStyleConfig = typeof setStyleConfigProp === 'function' ? setStyleConfigProp : setLocalStyleConfig;
    var phyloTreeViewerRef = phyloTreeViewerRefProp || (0, react_1.useRef)(null);
    // Metadata column fallbacks
    var geneMetadataColumns = geneMetadataColumnsProp || ['cluster', 'species', 'geneType'];
    var treeMetadataColumns = treeMetadataColumnsProp || ['species', 'branchLength', 'support'];
    // Dummy track handlers
    var handleTrackShiftMinus1kb = typeof handleTrackShiftMinus1kbProp === 'function' ? handleTrackShiftMinus1kbProp : function (hoodId) { };
    var handleTrackShiftPlus1kb = typeof handleTrackShiftPlus1kbProp === 'function' ? handleTrackShiftPlus1kbProp : function (hoodId) { };
    var handleTrackFlip = typeof handleTrackFlipProp === 'function' ? handleTrackFlipProp : function (hoodId) { };
    var handleArrowheadHeightChange = typeof handleArrowheadHeightChangeProp === 'function' ? handleArrowheadHeightChangeProp : function (val) { return setArrowheadHeightDisplay(val); };
    var handleGeneHeightChange = typeof handleGeneHeightChangeProp === 'function' ? handleGeneHeightChangeProp : function (val) { return setGeneHeightDisplay(val); };
    return ((0, jsx_runtime_1.jsxs)(sidebar_1.Sidebar, __assign({ collapsible: "offcanvas", variant: variant }, props, { children: [(0, jsx_runtime_1.jsx)(sidebar_1.SidebarHeader, { children: (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }, children: (0, jsx_runtime_1.jsxs)("a", { href: "#", style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: [(0, jsx_runtime_1.jsx)(icons_react_1.IconInnerShadowTop, { className: "!size-5" }), (0, jsx_runtime_1.jsx)("span", { className: "text-base font-semibold", children: "Acme Inc." })] }) }) }), (0, jsx_runtime_1.jsxs)(sidebar_1.SidebarContent, { children: [(0, jsx_runtime_1.jsxs)("label", { style: { display: 'block', marginBottom: '5px' }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: ultrametric, onChange: function (e) {
                                    console.debug('[AppSidebar] ultrametric checkbox toggled ->', e.target.checked);
                                    setUltrametric(e.target.checked);
                                }, style: { marginRight: '5px' } }), "Convert to Ultrametric Tree"] }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'block', marginBottom: '5px' }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: showConnectingLines, onChange: function (e) { return setShowConnectingLines(e.target.checked); }, style: { marginRight: '5px' } }), "Show Connecting Lines"] }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'block', marginBottom: '5px' }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: showScrollbar, onChange: function (e) { return setShowScrollbar(e.target.checked); }, style: { marginRight: '5px' } }), "Show Scrollbar"] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: '10px', borderTop: '1px solid #ccc', paddingTop: '10px' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { marginBottom: '5px', fontWeight: 'bold' }, children: "Alignment Controls:" }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: '5px' }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: function () { return setAlignCluster(1); }, style: { marginRight: '5px', padding: '2px 8px', fontSize: '12px' }, children: "Align Cluster 1" }), (0, jsx_runtime_1.jsx)("button", { onClick: function () { return setAlignCluster(2); }, style: { marginRight: '5px', padding: '2px 8px', fontSize: '12px' }, children: "Align Cluster 2" }), (0, jsx_runtime_1.jsx)("button", { onClick: function () { return setAlignCluster(null); }, style: { padding: '2px 8px', fontSize: '12px' }, children: "No Cluster" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: '5px' }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: function () { setAlignCluster(null); setUseDefaultGeneAlignment(false); setDefaultAlign('start'); }, style: { marginRight: '5px', padding: '2px 8px', fontSize: '12px' }, children: "Align Start" }), (0, jsx_runtime_1.jsx)("button", { onClick: function () { setAlignCluster(null); setUseDefaultGeneAlignment(false); setDefaultAlign('center'); }, style: { marginRight: '5px', padding: '2px 8px', fontSize: '12px' }, children: "Align Center" }), (0, jsx_runtime_1.jsx)("button", { onClick: function () { setAlignCluster(null); setUseDefaultGeneAlignment(false); setDefaultAlign('end'); }, style: { marginRight: '5px', padding: '2px 8px', fontSize: '12px' }, children: "Align End" })] }), (0, jsx_runtime_1.jsx)("div", { style: { marginBottom: '5px' }, children: (0, jsx_runtime_1.jsx)("button", { onClick: function () { setAlignCluster(null); setUseDefaultGeneAlignment(true); }, style: { padding: '2px 8px', fontSize: '12px' }, children: "Default Gene Alignment" }) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: '10px', borderTop: '1px solid #ccc', paddingTop: '10px' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { marginBottom: '5px', fontWeight: 'bold' }, children: "Track Controls:" }), ['hood_A', 'hood_B', 'hood_C', 'hood_D', 'hood_E'].map(function (hoodId) { return ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: '3px', fontSize: '11px' }, children: [(0, jsx_runtime_1.jsxs)("span", { style: { display: 'inline-block', width: '60px', fontSize: '10px' }, children: [hoodId, ":"] }), (0, jsx_runtime_1.jsx)("button", { onClick: function () { return handleTrackShiftMinus1kb(hoodId); }, style: { marginRight: '2px', padding: '1px 4px', fontSize: '10px' }, title: "Shift ".concat(hoodId, " left by 1kb"), children: "-1kb" }), (0, jsx_runtime_1.jsx)("button", { onClick: function () { return handleTrackShiftPlus1kb(hoodId); }, style: { marginRight: '2px', padding: '1px 4px', fontSize: '10px' }, title: "Shift ".concat(hoodId, " right by 1kb"), children: "+1kb" }), (0, jsx_runtime_1.jsx)("button", { onClick: function () { return handleTrackFlip(hoodId); }, style: { padding: '1px 4px', fontSize: '10px' }, title: "Flip ".concat(hoodId), children: "Flip" })] }, hoodId)); })] }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'block', marginBottom: '5px' }, children: ["Phylo Label Position:", (0, jsx_runtime_1.jsxs)("select", { value: phyloLabelPosition, onChange: function (e) { return setPhyloLabelPosition(e.target.value); }, style: { marginLeft: '5px' }, children: [(0, jsx_runtime_1.jsx)("option", { value: "after-tree", children: "After Tree" }), (0, jsx_runtime_1.jsx)("option", { value: "after-tracks", children: "After Tracks" })] })] }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'block', marginBottom: '5px' }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: alignLabels, onChange: function (e) { return setAlignLabels(e.target.checked); }, style: { marginRight: '5px' } }), "Align phylo labels to same X coordinate"] }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'block', marginBottom: '5px' }, children: ["Gene Arrowhead Height:", (0, jsx_runtime_1.jsx)("input", { type: "range", min: "0", max: "100", value: arrowheadHeightDisplay, onChange: function (e) { var v = Number(e.target.value); if (typeof handleArrowheadHeightChange === 'function')
                                    handleArrowheadHeightChange(v);
                                else
                                    setArrowheadHeightDisplay(v); }, style: { marginLeft: '5px', width: '100px' } }), (0, jsx_runtime_1.jsx)("span", { style: { marginLeft: '5px' }, children: arrowheadHeightDisplay })] }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'block', marginBottom: '5px' }, children: ["Gene Height:", (0, jsx_runtime_1.jsx)("input", { type: "range", min: "10", max: "200", value: geneHeightDisplay, onChange: function (e) { var v = Number(e.target.value); if (typeof handleGeneHeightChange === 'function')
                                    handleGeneHeightChange(v);
                                else
                                    setGeneHeightDisplay(v); }, style: { marginLeft: '5px', width: '100px' } }), (0, jsx_runtime_1.jsx)("span", { style: { marginLeft: '5px' }, children: geneHeightDisplay })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: '10px', borderTop: '1px solid #ccc', paddingTop: '10px' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { marginBottom: '5px', fontWeight: 'bold' }, children: "Color/Label Fields:" }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'block', marginBottom: '5px' }, children: ["Gene Colors:", (0, jsx_runtime_1.jsx)("select", { value: geneColorBy, onChange: function (e) { return setGeneColorBy(e.target.value); }, style: { marginLeft: '5px', padding: '2px', fontSize: '12px' }, children: geneMetadataColumns.map(function (col) { return ((0, jsx_runtime_1.jsx)("option", { value: col, children: col }, col)); }) })] }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'block', marginBottom: '5px' }, children: ["Tree Colors:", (0, jsx_runtime_1.jsx)("select", { value: treeColorBy, onChange: function (e) { return setTreeColorBy(e.target.value); }, style: { marginLeft: '5px', padding: '2px', fontSize: '12px' }, children: treeMetadataColumns.map(function (col) { return ((0, jsx_runtime_1.jsx)("option", { value: col, children: col }, col)); }) })] }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'block', marginBottom: '5px' }, children: ["Domain Colors:", (0, jsx_runtime_1.jsxs)("select", { value: domainColorBy, onChange: function (e) { return setDomainColorBy(e.target.value); }, style: { marginLeft: '5px', padding: '2px', fontSize: '12px' }, children: [(0, jsx_runtime_1.jsx)("option", { value: "domainName", children: "Domain Name" }), (0, jsx_runtime_1.jsx)("option", { value: "evalue", children: "E-value" }), (0, jsx_runtime_1.jsx)("option", { value: "length", children: "Length" })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: '10px', borderTop: '1px solid #ccc', paddingTop: '10px' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { marginBottom: '5px', fontWeight: 'bold' }, children: "Color Palettes:" }), (0, jsx_runtime_1.jsx)(ColorPaletteWidget_1.default, { palette: genePalette, onChange: setGenePalette }), (0, jsx_runtime_1.jsx)(ColorPaletteWidget_1.default, { palette: domainPalette, onChange: setDomainPalette }), (0, jsx_runtime_1.jsx)(ColorPaletteWidget_1.default, { palette: phyloPalette, onChange: setPhyloPalette }), (0, jsx_runtime_1.jsx)(ColorPaletteWidget_1.default, { palette: ncRNAPalette, onChange: setNcRNAPalette }), (0, jsx_runtime_1.jsx)(ColorPaletteWidget_1.default, { palette: regionPalette, onChange: setRegionPalette }), (0, jsx_runtime_1.jsx)(LinkColorWidget_1.default, { proteinLinkConfig: proteinLinkConfig, onChange: setProteinLinkConfig }), (0, jsx_runtime_1.jsx)(LinkColorWidget_1.default, { nucleotideLinkConfig: nucleotideLinkConfig, onChange: setNucleotideLinkConfig }), (0, jsx_runtime_1.jsx)(LegendWidget_1.default, { legend: viewerLegend })] })] }), (0, jsx_runtime_1.jsx)(sidebar_1.SidebarFooter, { children: (0, jsx_runtime_1.jsx)("div", { style: { padding: '8px', display: 'flex', justifyContent: 'center' }, children: (0, jsx_runtime_1.jsx)(ThemeToggle_1.default, {}) }) })] })));
}
