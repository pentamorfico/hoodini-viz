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
exports.Table = Table;
exports.TableHeader = TableHeader;
exports.TableBody = TableBody;
exports.TableFooter = TableFooter;
exports.TableHead = TableHead;
exports.TableRow = TableRow;
exports.TableCell = TableCell;
exports.TableCaption = TableCaption;
var jsx_runtime_1 = require("react/jsx-runtime");
var utils_1 = require("@/lib/utils");
function Table(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return ((0, jsx_runtime_1.jsx)("div", { "data-slot": "table-container", className: "relative w-full overflow-x-auto", children: (0, jsx_runtime_1.jsx)("table", __assign({ "data-slot": "table", className: (0, utils_1.cn)("w-full caption-bottom text-sm", className) }, props)) }));
}
function TableHeader(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return ((0, jsx_runtime_1.jsx)("thead", __assign({ "data-slot": "table-header", className: (0, utils_1.cn)("[&_tr]:border-b", className) }, props)));
}
function TableBody(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return ((0, jsx_runtime_1.jsx)("tbody", __assign({ "data-slot": "table-body", className: (0, utils_1.cn)("[&_tr:last-child]:border-0", className) }, props)));
}
function TableFooter(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return ((0, jsx_runtime_1.jsx)("tfoot", __assign({ "data-slot": "table-footer", className: (0, utils_1.cn)("bg-muted/50 border-t font-medium [&>tr]:last:border-b-0", className) }, props)));
}
function TableRow(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return ((0, jsx_runtime_1.jsx)("tr", __assign({ "data-slot": "table-row", className: (0, utils_1.cn)("hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors", className) }, props)));
}
function TableHead(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return ((0, jsx_runtime_1.jsx)("th", __assign({ "data-slot": "table-head", className: (0, utils_1.cn)("text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className) }, props)));
}
function TableCell(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return ((0, jsx_runtime_1.jsx)("td", __assign({ "data-slot": "table-cell", className: (0, utils_1.cn)("p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className) }, props)));
}
function TableCaption(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return ((0, jsx_runtime_1.jsx)("caption", __assign({ "data-slot": "table-caption", className: (0, utils_1.cn)("text-muted-foreground mt-4 text-sm", className) }, props)));
}
