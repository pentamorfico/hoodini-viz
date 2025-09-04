"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteHeader = SiteHeader;
var jsx_runtime_1 = require("react/jsx-runtime");
var button_1 = require("@/components/ui/button");
var separator_1 = require("@/components/ui/separator");
var sidebar_1 = require("@/components/ui/sidebar");
function SiteHeader() {
    return ((0, jsx_runtime_1.jsx)("header", { className: "flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6", children: [(0, jsx_runtime_1.jsx)(sidebar_1.SidebarTrigger, { className: "-ml-1" }), (0, jsx_runtime_1.jsx)(separator_1.Separator, { orientation: "vertical", className: "mx-2 data-[orientation=vertical]:h-4" }), (0, jsx_runtime_1.jsx)("h1", { className: "text-base font-medium", children: "Documents" }), (0, jsx_runtime_1.jsx)("div", { className: "ml-auto flex items-center gap-2", children: (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", asChild: true, size: "sm", className: "hidden sm:flex", children: (0, jsx_runtime_1.jsx)("a", { href: "https://github.com/shadcn-ui/ui/tree/main/apps/v4/app/(examples)/dashboard", rel: "noopener noreferrer", target: "_blank", className: "dark:text-foreground", children: "GitHub" }) }) })] }) }));
}
