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
exports.ChartStyle = exports.ChartLegend = exports.ChartTooltip = void 0;
exports.ChartContainer = ChartContainer;
exports.ChartTooltipContent = ChartTooltipContent;
exports.ChartLegendContent = ChartLegendContent;
var jsx_runtime_1 = require("react/jsx-runtime");
var React = __importStar(require("react"));
var RechartsPrimitive = __importStar(require("recharts"));
var utils_1 = require("@/lib/utils");
// Format: { THEME_NAME: CSS_SELECTOR }
var THEMES = { light: "", dark: ".dark" };
var ChartContext = React.createContext(null);
function useChart() {
    var context = React.useContext(ChartContext);
    if (!context) {
        throw new Error("useChart must be used within a <ChartContainer />");
    }
    return context;
}
function ChartContainer(_a) {
    var id = _a.id, className = _a.className, children = _a.children, config = _a.config, props = __rest(_a, ["id", "className", "children", "config"]);
    var uniqueId = React.useId();
    var chartId = "chart-".concat(id || uniqueId.replace(/:/g, ""));
    return ((0, jsx_runtime_1.jsx)(ChartContext.Provider, { value: { config: config }, children: (0, jsx_runtime_1.jsxs)("div", __assign({ "data-slot": "chart", "data-chart": chartId, className: (0, utils_1.cn)("[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden", className) }, props, { children: [(0, jsx_runtime_1.jsx)(ChartStyle, { id: chartId, config: config }), (0, jsx_runtime_1.jsx)(RechartsPrimitive.ResponsiveContainer, { children: children })] })) }));
}
var ChartStyle = function (_a) {
    var id = _a.id, config = _a.config;
    var colorConfig = Object.entries(config).filter(function (_a) {
        var config = _a[1];
        return config.theme || config.color;
    });
    if (!colorConfig.length) {
        return null;
    }
    return ((0, jsx_runtime_1.jsx)("style", { dangerouslySetInnerHTML: {
            __html: Object.entries(THEMES)
                .map(function (_a) {
                var theme = _a[0], prefix = _a[1];
                return "\n".concat(prefix, " [data-chart=").concat(id, "] {\n").concat(colorConfig
                    .map(function (_a) {
                    var _b;
                    var key = _a[0], itemConfig = _a[1];
                    var color = ((_b = itemConfig.theme) === null || _b === void 0 ? void 0 : _b[theme]) ||
                        itemConfig.color;
                    return color ? "  --color-".concat(key, ": ").concat(color, ";") : null;
                })
                    .join("\n"), "\n}\n");
            })
                .join("\n"),
        } }));
};
exports.ChartStyle = ChartStyle;
var ChartTooltip = RechartsPrimitive.Tooltip;
exports.ChartTooltip = ChartTooltip;
function ChartTooltipContent(_a) {
    var active = _a.active, payload = _a.payload, className = _a.className, _b = _a.indicator, indicator = _b === void 0 ? "dot" : _b, _c = _a.hideLabel, hideLabel = _c === void 0 ? false : _c, _d = _a.hideIndicator, hideIndicator = _d === void 0 ? false : _d, label = _a.label, labelFormatter = _a.labelFormatter, labelClassName = _a.labelClassName, formatter = _a.formatter, color = _a.color, nameKey = _a.nameKey, labelKey = _a.labelKey;
    var config = useChart().config;
    var tooltipLabel = React.useMemo(function () {
        var _a;
        if (hideLabel || !(payload === null || payload === void 0 ? void 0 : payload.length)) {
            return null;
        }
        var item = payload[0];
        var key = "".concat(labelKey || (item === null || item === void 0 ? void 0 : item.dataKey) || (item === null || item === void 0 ? void 0 : item.name) || "value");
        var itemConfig = getPayloadConfigFromPayload(config, item, key);
        var value = !labelKey && typeof label === "string"
            ? ((_a = config[label]) === null || _a === void 0 ? void 0 : _a.label) || label
            : itemConfig === null || itemConfig === void 0 ? void 0 : itemConfig.label;
        if (labelFormatter) {
            return ((0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)("font-medium", labelClassName), children: labelFormatter(value, payload) }));
        }
        if (!value) {
            return null;
        }
        return (0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)("font-medium", labelClassName), children: value });
    }, [
        label,
        labelFormatter,
        payload,
        hideLabel,
        labelClassName,
        config,
        labelKey,
    ]);
    if (!active || !(payload === null || payload === void 0 ? void 0 : payload.length)) {
        return null;
    }
    var nestLabel = payload.length === 1 && indicator !== "dot";
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)("border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl", className), children: [!nestLabel ? tooltipLabel : null, (0, jsx_runtime_1.jsx)("div", { className: "grid gap-1.5", children: payload.map(function (item, index) {
                    var key = "".concat(nameKey || item.name || item.dataKey || "value");
                    var itemConfig = getPayloadConfigFromPayload(config, item, key);
                    var indicatorColor = color || item.payload.fill || item.color;
                    return ((0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)("[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5", indicator === "dot" && "items-center"), children: formatter && (item === null || item === void 0 ? void 0 : item.value) !== undefined && item.name ? (formatter(item.value, item.name, item, index, item.payload)) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(itemConfig === null || itemConfig === void 0 ? void 0 : itemConfig.icon) ? ((0, jsx_runtime_1.jsx)(itemConfig.icon, {})) : (!hideIndicator && ((0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)("shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)", {
                                        "h-2.5 w-2.5": indicator === "dot",
                                        "w-1": indicator === "line",
                                        "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed",
                                        "my-0.5": nestLabel && indicator === "dashed",
                                    }), style: {
                                        "--color-bg": indicatorColor,
                                        "--color-border": indicatorColor,
                                    } }))), (0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)("flex flex-1 justify-between leading-none", nestLabel ? "items-end" : "items-center"), children: [(0, jsx_runtime_1.jsxs)("div", { className: "grid gap-1.5", children: [nestLabel ? tooltipLabel : null, (0, jsx_runtime_1.jsx)("span", { className: "text-muted-foreground", children: (itemConfig === null || itemConfig === void 0 ? void 0 : itemConfig.label) || item.name })] }), item.value && ((0, jsx_runtime_1.jsx)("span", { className: "text-foreground font-mono font-medium tabular-nums", children: item.value.toLocaleString() }))] })] })) }, item.dataKey));
                }) })] }));
}
var ChartLegend = RechartsPrimitive.Legend;
exports.ChartLegend = ChartLegend;
function ChartLegendContent(_a) {
    var className = _a.className, _b = _a.hideIcon, hideIcon = _b === void 0 ? false : _b, payload = _a.payload, _c = _a.verticalAlign, verticalAlign = _c === void 0 ? "bottom" : _c, nameKey = _a.nameKey;
    var config = useChart().config;
    if (!(payload === null || payload === void 0 ? void 0 : payload.length)) {
        return null;
    }
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)("flex items-center justify-center gap-4", verticalAlign === "top" ? "pb-3" : "pt-3", className), children: payload.map(function (item) {
            var key = "".concat(nameKey || item.dataKey || "value");
            var itemConfig = getPayloadConfigFromPayload(config, item, key);
            return ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)("[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3"), children: [(itemConfig === null || itemConfig === void 0 ? void 0 : itemConfig.icon) && !hideIcon ? ((0, jsx_runtime_1.jsx)(itemConfig.icon, {})) : ((0, jsx_runtime_1.jsx)("div", { className: "h-2 w-2 shrink-0 rounded-[2px]", style: {
                            backgroundColor: item.color,
                        } })), itemConfig === null || itemConfig === void 0 ? void 0 : itemConfig.label] }, item.value));
        }) }));
}
// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(config, payload, key) {
    if (typeof payload !== "object" || payload === null) {
        return undefined;
    }
    var payloadPayload = "payload" in payload &&
        typeof payload.payload === "object" &&
        payload.payload !== null
        ? payload.payload
        : undefined;
    var configLabelKey = key;
    if (key in payload &&
        typeof payload[key] === "string") {
        configLabelKey = payload[key];
    }
    else if (payloadPayload &&
        key in payloadPayload &&
        typeof payloadPayload[key] === "string") {
        configLabelKey = payloadPayload[key];
    }
    return configLabelKey in config
        ? config[configLabelKey]
        : config[key];
}
