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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.ToggleGroup = ToggleGroup;
exports.ToggleGroupItem = ToggleGroupItem;
var jsx_runtime_1 = require("react/jsx-runtime");
var React = __importStar(require("react"));
var ToggleGroupPrimitive = __importStar(require("@radix-ui/react-toggle-group"));
var utils_1 = require("@/lib/utils");
var toggle_1 = require("@/components/ui/toggle");
var ToggleGroupContext = React.createContext({
    size: "default",
    variant: "default",
});
function ToggleGroup(_a) {
    var className = _a.className, variant = _a.variant, size = _a.size, children = _a.children, props = __rest(_a, ["className", "variant", "size", "children"]);
    return ((0, jsx_runtime_1.jsx)(ToggleGroupPrimitive.Root, __assign({ "data-slot": "toggle-group", "data-variant": variant, "data-size": size, className: (0, utils_1.cn)("group/toggle-group flex w-fit items-center rounded-md data-[variant=outline]:shadow-xs", className) }, props, { children: (0, jsx_runtime_1.jsx)(ToggleGroupContext.Provider, { value: { variant: variant, size: size }, children: children }) })));
}
function ToggleGroupItem(_a) {
    var className = _a.className, children = _a.children, variant = _a.variant, size = _a.size, props = __rest(_a, ["className", "children", "variant", "size"]);
    var context = React.useContext(ToggleGroupContext);
    return ((0, jsx_runtime_1.jsx)(ToggleGroupPrimitive.Item, __assign({ "data-slot": "toggle-group-item", "data-variant": context.variant || variant, "data-size": context.size || size, className: (0, utils_1.cn)((0, toggle_1.toggleVariants)({
            variant: context.variant || variant,
            size: context.size || size,
        }), "min-w-0 flex-1 shrink-0 rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10 data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l", className) }, props, { children: children })));
}
