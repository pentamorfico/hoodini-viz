"use client";
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
exports.NavSecondary = NavSecondary;
var jsx_runtime_1 = require("react/jsx-runtime");
var sidebar_1 = require("@/components/ui/sidebar");
function NavSecondary(_a) {
    var items = _a.items, props = __rest(_a, ["items"]);
    return ((0, jsx_runtime_1.jsx)(sidebar_1.SidebarGroup, __assign({}, props, { children: (0, jsx_runtime_1.jsx)(sidebar_1.SidebarGroupContent, { children: (0, jsx_runtime_1.jsx)(sidebar_1.SidebarMenu, { children: items.map(function (item) { return ((0, jsx_runtime_1.jsx)(sidebar_1.SidebarMenuItem, { children: (0, jsx_runtime_1.jsx)(sidebar_1.SidebarMenuButton, { asChild: true, children: (0, jsx_runtime_1.jsxs)("a", { href: item.url, children: [(0, jsx_runtime_1.jsx)(item.icon, {}), (0, jsx_runtime_1.jsx)("span", { children: item.title })] }) }) }, item.title)); }) }) }) })));
}
