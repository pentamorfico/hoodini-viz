"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NavMain = NavMain;
var jsx_runtime_1 = require("react/jsx-runtime");
var icons_react_1 = require("@tabler/icons-react");
var button_1 = require("@/components/ui/button");
var sidebar_1 = require("@/components/ui/sidebar");
function NavMain(_a) {
    var items = _a.items;
    return ((0, jsx_runtime_1.jsx)(sidebar_1.SidebarGroup, { children: (0, jsx_runtime_1.jsxs)(sidebar_1.SidebarGroupContent, { className: "flex flex-col gap-2", children: [(0, jsx_runtime_1.jsx)(sidebar_1.SidebarMenu, { children: (0, jsx_runtime_1.jsxs)(sidebar_1.SidebarMenuItem, { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsxs)(sidebar_1.SidebarMenuButton, { tooltip: "Quick Create", className: "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear", children: [(0, jsx_runtime_1.jsx)(icons_react_1.IconCirclePlusFilled, {}), (0, jsx_runtime_1.jsx)("span", { children: "Quick Create" })] }), (0, jsx_runtime_1.jsxs)(button_1.Button, { size: "icon", className: "size-8 group-data-[collapsible=icon]:opacity-0", variant: "outline", children: [(0, jsx_runtime_1.jsx)(icons_react_1.IconMail, {}), (0, jsx_runtime_1.jsx)("span", { className: "sr-only", children: "Inbox" })] })] }) }), (0, jsx_runtime_1.jsx)(sidebar_1.SidebarMenu, { children: items.map(function (item) { return ((0, jsx_runtime_1.jsx)(sidebar_1.SidebarMenuItem, { children: (0, jsx_runtime_1.jsxs)(sidebar_1.SidebarMenuButton, { tooltip: item.title, children: [item.icon && (0, jsx_runtime_1.jsx)(item.icon, {}), (0, jsx_runtime_1.jsx)("span", { children: item.title })] }) }, item.title)); }) })] }) }));
}
