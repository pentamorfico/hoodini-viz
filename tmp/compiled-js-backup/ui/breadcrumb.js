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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Breadcrumb = Breadcrumb;
exports.BreadcrumbList = BreadcrumbList;
exports.BreadcrumbItem = BreadcrumbItem;
exports.BreadcrumbLink = BreadcrumbLink;
exports.BreadcrumbPage = BreadcrumbPage;
exports.BreadcrumbSeparator = BreadcrumbSeparator;
exports.BreadcrumbEllipsis = BreadcrumbEllipsis;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_slot_1 = require("@radix-ui/react-slot");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
function Breadcrumb(_a) {
    var props = __rest(_a, []);
    return (0, jsx_runtime_1.jsx)("nav", __assign({ "aria-label": "breadcrumb", "data-slot": "breadcrumb" }, props));
}
function BreadcrumbList(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return ((0, jsx_runtime_1.jsx)("ol", __assign({ "data-slot": "breadcrumb-list", className: (0, utils_1.cn)("text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5", className) }, props)));
}
function BreadcrumbItem(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return ((0, jsx_runtime_1.jsx)("li", __assign({ "data-slot": "breadcrumb-item", className: (0, utils_1.cn)("inline-flex items-center gap-1.5", className) }, props)));
}
function BreadcrumbLink(_a) {
    var asChild = _a.asChild, className = _a.className, props = __rest(_a, ["asChild", "className"]);
    var Comp = asChild ? react_slot_1.Slot : "a";
    return ((0, jsx_runtime_1.jsx)(Comp, __assign({ "data-slot": "breadcrumb-link", className: (0, utils_1.cn)("hover:text-foreground transition-colors", className) }, props)));
}
function BreadcrumbPage(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return ((0, jsx_runtime_1.jsx)("span", __assign({ "data-slot": "breadcrumb-page", role: "link", "aria-disabled": "true", "aria-current": "page", className: (0, utils_1.cn)("text-foreground font-normal", className) }, props)));
}
function BreadcrumbSeparator(_a) {
    var children = _a.children, className = _a.className, props = __rest(_a, ["children", "className"]);
    return ((0, jsx_runtime_1.jsx)("li", __assign({ "data-slot": "breadcrumb-separator", role: "presentation", "aria-hidden": "true", className: (0, utils_1.cn)("[&>svg]:size-3.5", className) }, props, { children: children !== null && children !== void 0 ? children : (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, {}) })));
}
function BreadcrumbEllipsis(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return ((0, jsx_runtime_1.jsxs)("span", __assign({ "data-slot": "breadcrumb-ellipsis", role: "presentation", "aria-hidden": "true", className: (0, utils_1.cn)("flex size-9 items-center justify-center", className) }, props, { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.MoreHorizontal, { className: "size-4" }), (0, jsx_runtime_1.jsx)("span", { className: "sr-only", children: "More" })] })));
}
