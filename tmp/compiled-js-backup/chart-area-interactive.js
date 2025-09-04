"use client";
"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.description = void 0;
exports.ChartAreaInteractive = ChartAreaInteractive;
var jsx_runtime_1 = require("react/jsx-runtime");
var React = __importStar(require("react"));
var recharts_1 = require("recharts");
var use_mobile_1 = require("@/hooks/use-mobile");
var card_1 = require("@/components/ui/card");
var chart_1 = require("@/components/ui/chart");
var select_1 = require("@/components/ui/select");
var toggle_group_1 = require("@/components/ui/toggle-group");
exports.description = "An interactive area chart";
var chartData = [
    { date: "2024-04-01", desktop: 222, mobile: 150 },
    { date: "2024-04-02", desktop: 97, mobile: 180 },
    { date: "2024-04-03", desktop: 167, mobile: 120 },
    { date: "2024-04-04", desktop: 242, mobile: 260 },
    { date: "2024-04-05", desktop: 373, mobile: 290 },
    { date: "2024-04-06", desktop: 301, mobile: 340 },
    { date: "2024-04-07", desktop: 245, mobile: 180 },
    { date: "2024-04-08", desktop: 409, mobile: 320 },
    { date: "2024-04-09", desktop: 59, mobile: 110 },
    { date: "2024-04-10", desktop: 261, mobile: 190 },
    { date: "2024-04-11", desktop: 327, mobile: 350 },
    { date: "2024-04-12", desktop: 292, mobile: 210 },
    { date: "2024-04-13", desktop: 342, mobile: 380 },
    { date: "2024-04-14", desktop: 137, mobile: 220 },
    { date: "2024-04-15", desktop: 120, mobile: 170 },
    { date: "2024-04-16", desktop: 138, mobile: 190 },
    { date: "2024-04-17", desktop: 446, mobile: 360 },
    { date: "2024-04-18", desktop: 364, mobile: 410 },
    { date: "2024-04-19", desktop: 243, mobile: 180 },
    { date: "2024-04-20", desktop: 89, mobile: 150 },
    { date: "2024-04-21", desktop: 137, mobile: 200 },
    { date: "2024-04-22", desktop: 224, mobile: 170 },
    { date: "2024-04-23", desktop: 138, mobile: 230 },
    { date: "2024-04-24", desktop: 387, mobile: 290 },
    { date: "2024-04-25", desktop: 215, mobile: 250 },
    { date: "2024-04-26", desktop: 75, mobile: 130 },
    { date: "2024-04-27", desktop: 383, mobile: 420 },
    { date: "2024-04-28", desktop: 122, mobile: 180 },
    { date: "2024-04-29", desktop: 315, mobile: 240 },
    { date: "2024-04-30", desktop: 454, mobile: 380 },
    { date: "2024-05-01", desktop: 165, mobile: 220 },
    { date: "2024-05-02", desktop: 293, mobile: 310 },
    { date: "2024-05-03", desktop: 247, mobile: 190 },
    { date: "2024-05-04", desktop: 385, mobile: 420 },
    { date: "2024-05-05", desktop: 481, mobile: 390 },
    { date: "2024-05-06", desktop: 498, mobile: 520 },
    { date: "2024-05-07", desktop: 388, mobile: 300 },
    { date: "2024-05-08", desktop: 149, mobile: 210 },
    { date: "2024-05-09", desktop: 227, mobile: 180 },
    { date: "2024-05-10", desktop: 293, mobile: 330 },
    { date: "2024-05-11", desktop: 335, mobile: 270 },
    { date: "2024-05-12", desktop: 197, mobile: 240 },
    { date: "2024-05-13", desktop: 197, mobile: 160 },
    { date: "2024-05-14", desktop: 448, mobile: 490 },
    { date: "2024-05-15", desktop: 473, mobile: 380 },
    { date: "2024-05-16", desktop: 338, mobile: 400 },
    { date: "2024-05-17", desktop: 499, mobile: 420 },
    { date: "2024-05-18", desktop: 315, mobile: 350 },
    { date: "2024-05-19", desktop: 235, mobile: 180 },
    { date: "2024-05-20", desktop: 177, mobile: 230 },
    { date: "2024-05-21", desktop: 82, mobile: 140 },
    { date: "2024-05-22", desktop: 81, mobile: 120 },
    { date: "2024-05-23", desktop: 252, mobile: 290 },
    { date: "2024-05-24", desktop: 294, mobile: 220 },
    { date: "2024-05-25", desktop: 201, mobile: 250 },
    { date: "2024-05-26", desktop: 213, mobile: 170 },
    { date: "2024-05-27", desktop: 420, mobile: 460 },
    { date: "2024-05-28", desktop: 233, mobile: 190 },
    { date: "2024-05-29", desktop: 78, mobile: 130 },
    { date: "2024-05-30", desktop: 340, mobile: 280 },
    { date: "2024-05-31", desktop: 178, mobile: 230 },
    { date: "2024-06-01", desktop: 178, mobile: 200 },
    { date: "2024-06-02", desktop: 470, mobile: 410 },
    { date: "2024-06-03", desktop: 103, mobile: 160 },
    { date: "2024-06-04", desktop: 439, mobile: 380 },
    { date: "2024-06-05", desktop: 88, mobile: 140 },
    { date: "2024-06-06", desktop: 294, mobile: 250 },
    { date: "2024-06-07", desktop: 323, mobile: 370 },
    { date: "2024-06-08", desktop: 385, mobile: 320 },
    { date: "2024-06-09", desktop: 438, mobile: 480 },
    { date: "2024-06-10", desktop: 155, mobile: 200 },
    { date: "2024-06-11", desktop: 92, mobile: 150 },
    { date: "2024-06-12", desktop: 492, mobile: 420 },
    { date: "2024-06-13", desktop: 81, mobile: 130 },
    { date: "2024-06-14", desktop: 426, mobile: 380 },
    { date: "2024-06-15", desktop: 307, mobile: 350 },
    { date: "2024-06-16", desktop: 371, mobile: 310 },
    { date: "2024-06-17", desktop: 475, mobile: 520 },
    { date: "2024-06-18", desktop: 107, mobile: 170 },
    { date: "2024-06-19", desktop: 341, mobile: 290 },
    { date: "2024-06-20", desktop: 408, mobile: 450 },
    { date: "2024-06-21", desktop: 169, mobile: 210 },
    { date: "2024-06-22", desktop: 317, mobile: 270 },
    { date: "2024-06-23", desktop: 480, mobile: 530 },
    { date: "2024-06-24", desktop: 132, mobile: 180 },
    { date: "2024-06-25", desktop: 141, mobile: 190 },
    { date: "2024-06-26", desktop: 434, mobile: 380 },
    { date: "2024-06-27", desktop: 448, mobile: 490 },
    { date: "2024-06-28", desktop: 149, mobile: 200 },
    { date: "2024-06-29", desktop: 103, mobile: 160 },
    { date: "2024-06-30", desktop: 446, mobile: 400 },
];
var chartConfig = {
    visitors: {
        label: "Visitors",
    },
    desktop: {
        label: "Desktop",
        color: "var(--primary)",
    },
    mobile: {
        label: "Mobile",
        color: "var(--primary)",
    },
};
function ChartAreaInteractive() {
    var isMobile = (0, use_mobile_1.useIsMobile)();
    var _a = React.useState("90d"), timeRange = _a[0], setTimeRange = _a[1];
    React.useEffect(function () {
        if (isMobile) {
            setTimeRange("7d");
        }
    }, [isMobile]);
    var filteredData = chartData.filter(function (item) {
        var date = new Date(item.date);
        var referenceDate = new Date("2024-06-30");
        var daysToSubtract = 90;
        if (timeRange === "30d") {
            daysToSubtract = 30;
        }
        else if (timeRange === "7d") {
            daysToSubtract = 7;
        }
        var startDate = new Date(referenceDate);
        startDate.setDate(startDate.getDate() - daysToSubtract);
        return date >= startDate;
    });
    return ((0, jsx_runtime_1.jsxs)(card_1.Card, { className: "@container/card", children: [(0, jsx_runtime_1.jsxs)(card_1.CardHeader, { children: [(0, jsx_runtime_1.jsx)(card_1.CardTitle, { children: "Total Visitors" }), (0, jsx_runtime_1.jsxs)(card_1.CardDescription, { children: [(0, jsx_runtime_1.jsx)("span", { className: "hidden @[540px]/card:block", children: "Total for the last 3 months" }), (0, jsx_runtime_1.jsx)("span", { className: "@[540px]/card:hidden", children: "Last 3 months" })] }), (0, jsx_runtime_1.jsxs)(card_1.CardAction, { children: [(0, jsx_runtime_1.jsxs)(toggle_group_1.ToggleGroup, { type: "single", value: timeRange, onValueChange: setTimeRange, variant: "outline", className: "hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex", children: [(0, jsx_runtime_1.jsx)(toggle_group_1.ToggleGroupItem, { value: "90d", children: "Last 3 months" }), (0, jsx_runtime_1.jsx)(toggle_group_1.ToggleGroupItem, { value: "30d", children: "Last 30 days" }), (0, jsx_runtime_1.jsx)(toggle_group_1.ToggleGroupItem, { value: "7d", children: "Last 7 days" })] }), (0, jsx_runtime_1.jsxs)(select_1.Select, { value: timeRange, onValueChange: setTimeRange, children: [(0, jsx_runtime_1.jsx)(select_1.SelectTrigger, { className: "flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden", size: "sm", "aria-label": "Select a value", children: (0, jsx_runtime_1.jsx)(select_1.SelectValue, { placeholder: "Last 3 months" }) }), (0, jsx_runtime_1.jsxs)(select_1.SelectContent, { className: "rounded-xl", children: [(0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "90d", className: "rounded-lg", children: "Last 3 months" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "30d", className: "rounded-lg", children: "Last 30 days" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "7d", className: "rounded-lg", children: "Last 7 days" })] })] })] })] }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { className: "px-2 pt-4 sm:px-6 sm:pt-6", children: (0, jsx_runtime_1.jsx)(chart_1.ChartContainer, { config: chartConfig, className: "aspect-auto h-[250px] w-full", children: (0, jsx_runtime_1.jsxs)(recharts_1.AreaChart, { data: filteredData, children: [(0, jsx_runtime_1.jsxs)("defs", { children: [(0, jsx_runtime_1.jsxs)("linearGradient", { id: "fillDesktop", x1: "0", y1: "0", x2: "0", y2: "1", children: [(0, jsx_runtime_1.jsx)("stop", { offset: "5%", stopColor: "var(--color-desktop)", stopOpacity: 1.0 }), (0, jsx_runtime_1.jsx)("stop", { offset: "95%", stopColor: "var(--color-desktop)", stopOpacity: 0.1 })] }), (0, jsx_runtime_1.jsxs)("linearGradient", { id: "fillMobile", x1: "0", y1: "0", x2: "0", y2: "1", children: [(0, jsx_runtime_1.jsx)("stop", { offset: "5%", stopColor: "var(--color-mobile)", stopOpacity: 0.8 }), (0, jsx_runtime_1.jsx)("stop", { offset: "95%", stopColor: "var(--color-mobile)", stopOpacity: 0.1 })] })] }), (0, jsx_runtime_1.jsx)(recharts_1.CartesianGrid, { vertical: false }), (0, jsx_runtime_1.jsx)(recharts_1.XAxis, { dataKey: "date", tickLine: false, axisLine: false, tickMargin: 8, minTickGap: 32, tickFormatter: function (value) {
                                    var date = new Date(value);
                                    return date.toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                    });
                                } }), (0, jsx_runtime_1.jsx)(chart_1.ChartTooltip, { cursor: false, content: (0, jsx_runtime_1.jsx)(chart_1.ChartTooltipContent, { labelFormatter: function (value) {
                                        return new Date(value).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                        });
                                    }, indicator: "dot" }) }), (0, jsx_runtime_1.jsx)(recharts_1.Area, { dataKey: "mobile", type: "natural", fill: "url(#fillMobile)", stroke: "var(--color-mobile)", stackId: "a" }), (0, jsx_runtime_1.jsx)(recharts_1.Area, { dataKey: "desktop", type: "natural", fill: "url(#fillDesktop)", stroke: "var(--color-desktop)", stackId: "a" })] }) }) })] }));
}
