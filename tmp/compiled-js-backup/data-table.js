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
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = void 0;
exports.DataTable = DataTable;
var jsx_runtime_1 = require("react/jsx-runtime");
var React = __importStar(require("react"));
var core_1 = require("@dnd-kit/core");
var modifiers_1 = require("@dnd-kit/modifiers");
var sortable_1 = require("@dnd-kit/sortable");
var utilities_1 = require("@dnd-kit/utilities");
var icons_react_1 = require("@tabler/icons-react");
var react_table_1 = require("@tanstack/react-table");
var recharts_1 = require("recharts");
var sonner_1 = require("sonner");
var zod_1 = require("zod");
var use_mobile_1 = require("@/hooks/use-mobile");
var badge_1 = require("@/components/ui/badge");
var button_1 = require("@/components/ui/button");
var chart_1 = require("@/components/ui/chart");
var checkbox_1 = require("@/components/ui/checkbox");
var drawer_1 = require("@/components/ui/drawer");
var dropdown_menu_1 = require("@/components/ui/dropdown-menu");
var input_1 = require("@/components/ui/input");
var label_1 = require("@/components/ui/label");
var select_1 = require("@/components/ui/select");
var separator_1 = require("@/components/ui/separator");
var table_1 = require("@/components/ui/table");
var tabs_1 = require("@/components/ui/tabs");
exports.schema = zod_1.z.object({
    id: zod_1.z.number(),
    header: zod_1.z.string(),
    type: zod_1.z.string(),
    status: zod_1.z.string(),
    target: zod_1.z.string(),
    limit: zod_1.z.string(),
    reviewer: zod_1.z.string(),
});
// Create a separate component for the drag handle
function DragHandle(_a) {
    var id = _a.id;
    var _b = (0, sortable_1.useSortable)({
        id: id,
    }), attributes = _b.attributes, listeners = _b.listeners;
    return ((0, jsx_runtime_1.jsxs)(button_1.Button, __assign({}, attributes, listeners, { variant: "ghost", size: "icon", className: "text-muted-foreground size-7 hover:bg-transparent", children: [(0, jsx_runtime_1.jsx)(icons_react_1.IconGripVertical, { className: "text-muted-foreground size-3" }), (0, jsx_runtime_1.jsx)("span", { className: "sr-only", children: "Drag to reorder" })] })));
}
var columns = [
    {
        id: "drag",
        header: function () { return null; },
        cell: function (_a) {
            var row = _a.row;
            return (0, jsx_runtime_1.jsx)(DragHandle, { id: row.original.id });
        },
    },
    {
        id: "select",
        header: function (_a) {
            var table = _a.table;
            return ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center", children: (0, jsx_runtime_1.jsx)(checkbox_1.Checkbox, { checked: table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate"), onCheckedChange: function (value) { return table.toggleAllPageRowsSelected(!!value); }, "aria-label": "Select all" }) }));
        },
        cell: function (_a) {
            var row = _a.row;
            return ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center", children: (0, jsx_runtime_1.jsx)(checkbox_1.Checkbox, { checked: row.getIsSelected(), onCheckedChange: function (value) { return row.toggleSelected(!!value); }, "aria-label": "Select row" }) }));
        },
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "header",
        header: "Header",
        cell: function (_a) {
            var row = _a.row;
            return (0, jsx_runtime_1.jsx)(TableCellViewer, { item: row.original });
        },
        enableHiding: false,
    },
    {
        accessorKey: "type",
        header: "Section Type",
        cell: function (_a) {
            var row = _a.row;
            return ((0, jsx_runtime_1.jsx)("div", { className: "w-32", children: (0, jsx_runtime_1.jsx)(badge_1.Badge, { variant: "outline", className: "text-muted-foreground px-1.5", children: row.original.type }) }));
        },
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: function (_a) {
            var row = _a.row;
            return ((0, jsx_runtime_1.jsxs)(badge_1.Badge, { variant: "outline", className: "text-muted-foreground px-1.5", children: [row.original.status === "Done" ? ((0, jsx_runtime_1.jsx)(icons_react_1.IconCircleCheckFilled, { className: "fill-green-500 dark:fill-green-400" })) : ((0, jsx_runtime_1.jsx)(icons_react_1.IconLoader, {})), row.original.status] }));
        },
    },
    {
        accessorKey: "target",
        header: function () { return (0, jsx_runtime_1.jsx)("div", { className: "w-full text-right", children: "Target" }); },
        cell: function (_a) {
            var row = _a.row;
            return ((0, jsx_runtime_1.jsxs)("form", { onSubmit: function (e) {
                    e.preventDefault();
                    sonner_1.toast.promise(new Promise(function (resolve) { return setTimeout(resolve, 1000); }), {
                        loading: "Saving ".concat(row.original.header),
                        success: "Done",
                        error: "Error",
                    });
                }, children: [(0, jsx_runtime_1.jsx)(label_1.Label, { htmlFor: "".concat(row.original.id, "-target"), className: "sr-only", children: "Target" }), (0, jsx_runtime_1.jsx)(input_1.Input, { className: "hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 h-8 w-16 border-transparent bg-transparent text-right shadow-none focus-visible:border dark:bg-transparent", defaultValue: row.original.target, id: "".concat(row.original.id, "-target") })] }));
        },
    },
    {
        accessorKey: "limit",
        header: function () { return (0, jsx_runtime_1.jsx)("div", { className: "w-full text-right", children: "Limit" }); },
        cell: function (_a) {
            var row = _a.row;
            return ((0, jsx_runtime_1.jsxs)("form", { onSubmit: function (e) {
                    e.preventDefault();
                    sonner_1.toast.promise(new Promise(function (resolve) { return setTimeout(resolve, 1000); }), {
                        loading: "Saving ".concat(row.original.header),
                        success: "Done",
                        error: "Error",
                    });
                }, children: [(0, jsx_runtime_1.jsx)(label_1.Label, { htmlFor: "".concat(row.original.id, "-limit"), className: "sr-only", children: "Limit" }), (0, jsx_runtime_1.jsx)(input_1.Input, { className: "hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 h-8 w-16 border-transparent bg-transparent text-right shadow-none focus-visible:border dark:bg-transparent", defaultValue: row.original.limit, id: "".concat(row.original.id, "-limit") })] }));
        },
    },
    {
        accessorKey: "reviewer",
        header: "Reviewer",
        cell: function (_a) {
            var row = _a.row;
            var isAssigned = row.original.reviewer !== "Assign reviewer";
            if (isAssigned) {
                return row.original.reviewer;
            }
            return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(label_1.Label, { htmlFor: "".concat(row.original.id, "-reviewer"), className: "sr-only", children: "Reviewer" }), (0, jsx_runtime_1.jsxs)(select_1.Select, { children: [(0, jsx_runtime_1.jsx)(select_1.SelectTrigger, { className: "w-38 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate", size: "sm", id: "".concat(row.original.id, "-reviewer"), children: (0, jsx_runtime_1.jsx)(select_1.SelectValue, { placeholder: "Assign reviewer" }) }), (0, jsx_runtime_1.jsxs)(select_1.SelectContent, { align: "end", children: [(0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "Eddie Lake", children: "Eddie Lake" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "Jamik Tashpulatov", children: "Jamik Tashpulatov" })] })] })] }));
        },
    },
    {
        id: "actions",
        cell: function () { return ((0, jsx_runtime_1.jsxs)(dropdown_menu_1.DropdownMenu, { children: [(0, jsx_runtime_1.jsx)(dropdown_menu_1.DropdownMenuTrigger, { asChild: true, children: (0, jsx_runtime_1.jsxs)(button_1.Button, { variant: "ghost", className: "data-[state=open]:bg-muted text-muted-foreground flex size-8", size: "icon", children: [(0, jsx_runtime_1.jsx)(icons_react_1.IconDotsVertical, {}), (0, jsx_runtime_1.jsx)("span", { className: "sr-only", children: "Open menu" })] }) }), (0, jsx_runtime_1.jsxs)(dropdown_menu_1.DropdownMenuContent, { align: "end", className: "w-32", children: [(0, jsx_runtime_1.jsx)(dropdown_menu_1.DropdownMenuItem, { children: "Edit" }), (0, jsx_runtime_1.jsx)(dropdown_menu_1.DropdownMenuItem, { children: "Make a copy" }), (0, jsx_runtime_1.jsx)(dropdown_menu_1.DropdownMenuItem, { children: "Favorite" }), (0, jsx_runtime_1.jsx)(dropdown_menu_1.DropdownMenuSeparator, {}), (0, jsx_runtime_1.jsx)(dropdown_menu_1.DropdownMenuItem, { variant: "destructive", children: "Delete" })] })] })); },
    },
];
function DraggableRow(_a) {
    var row = _a.row;
    var _b = (0, sortable_1.useSortable)({
        id: row.original.id,
    }), transform = _b.transform, transition = _b.transition, setNodeRef = _b.setNodeRef, isDragging = _b.isDragging;
    return ((0, jsx_runtime_1.jsx)(table_1.TableRow, { "data-state": row.getIsSelected() && "selected", "data-dragging": isDragging, ref: setNodeRef, className: "relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80", style: {
            transform: utilities_1.CSS.Transform.toString(transform),
            transition: transition,
        }, children: row.getVisibleCells().map(function (cell) { return ((0, jsx_runtime_1.jsx)(table_1.TableCell, { children: (0, react_table_1.flexRender)(cell.column.columnDef.cell, cell.getContext()) }, cell.id)); }) }));
}
function DataTable(_a) {
    var _b;
    var initialData = _a.data;
    var _c = React.useState(function () { return initialData; }), data = _c[0], setData = _c[1];
    var _d = React.useState({}), rowSelection = _d[0], setRowSelection = _d[1];
    var _e = React.useState({}), columnVisibility = _e[0], setColumnVisibility = _e[1];
    var _f = React.useState([]), columnFilters = _f[0], setColumnFilters = _f[1];
    var _g = React.useState([]), sorting = _g[0], setSorting = _g[1];
    var _h = React.useState({
        pageIndex: 0,
        pageSize: 10,
    }), pagination = _h[0], setPagination = _h[1];
    var sortableId = React.useId();
    var sensors = (0, core_1.useSensors)((0, core_1.useSensor)(core_1.MouseSensor, {}), (0, core_1.useSensor)(core_1.TouchSensor, {}), (0, core_1.useSensor)(core_1.KeyboardSensor, {}));
    var dataIds = React.useMemo(function () { return (data === null || data === void 0 ? void 0 : data.map(function (_a) {
        var id = _a.id;
        return id;
    })) || []; }, [data]);
    var table = (0, react_table_1.useReactTable)({
        data: data,
        columns: columns,
        state: {
            sorting: sorting,
            columnVisibility: columnVisibility,
            rowSelection: rowSelection,
            columnFilters: columnFilters,
            pagination: pagination,
        },
        getRowId: function (row) { return row.id.toString(); },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: setPagination,
        getCoreRowModel: (0, react_table_1.getCoreRowModel)(),
        getFilteredRowModel: (0, react_table_1.getFilteredRowModel)(),
        getPaginationRowModel: (0, react_table_1.getPaginationRowModel)(),
        getSortedRowModel: (0, react_table_1.getSortedRowModel)(),
        getFacetedRowModel: (0, react_table_1.getFacetedRowModel)(),
        getFacetedUniqueValues: (0, react_table_1.getFacetedUniqueValues)(),
    });
    function handleDragEnd(event) {
        var active = event.active, over = event.over;
        if (active && over && active.id !== over.id) {
            setData(function (data) {
                var oldIndex = dataIds.indexOf(active.id);
                var newIndex = dataIds.indexOf(over.id);
                return (0, sortable_1.arrayMove)(data, oldIndex, newIndex);
            });
        }
    }
    return ((0, jsx_runtime_1.jsxs)(tabs_1.Tabs, { defaultValue: "outline", className: "w-full flex-col justify-start gap-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between px-4 lg:px-6", children: [(0, jsx_runtime_1.jsx)(label_1.Label, { htmlFor: "view-selector", className: "sr-only", children: "View" }), (0, jsx_runtime_1.jsxs)(select_1.Select, { defaultValue: "outline", children: [(0, jsx_runtime_1.jsx)(select_1.SelectTrigger, { className: "flex w-fit @4xl/main:hidden", size: "sm", id: "view-selector", children: (0, jsx_runtime_1.jsx)(select_1.SelectValue, { placeholder: "Select a view" }) }), (0, jsx_runtime_1.jsxs)(select_1.SelectContent, { children: [(0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "outline", children: "Outline" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "past-performance", children: "Past Performance" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "key-personnel", children: "Key Personnel" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "focus-documents", children: "Focus Documents" })] })] }), (0, jsx_runtime_1.jsxs)(tabs_1.TabsList, { className: "**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex", children: [(0, jsx_runtime_1.jsx)(tabs_1.TabsTrigger, { value: "outline", children: "Outline" }), (0, jsx_runtime_1.jsxs)(tabs_1.TabsTrigger, { value: "past-performance", children: ["Past Performance ", (0, jsx_runtime_1.jsx)(badge_1.Badge, { variant: "secondary", children: "3" })] }), (0, jsx_runtime_1.jsxs)(tabs_1.TabsTrigger, { value: "key-personnel", children: ["Key Personnel ", (0, jsx_runtime_1.jsx)(badge_1.Badge, { variant: "secondary", children: "2" })] }), (0, jsx_runtime_1.jsx)(tabs_1.TabsTrigger, { value: "focus-documents", children: "Focus Documents" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsxs)(dropdown_menu_1.DropdownMenu, { children: [(0, jsx_runtime_1.jsx)(dropdown_menu_1.DropdownMenuTrigger, { asChild: true, children: (0, jsx_runtime_1.jsxs)(button_1.Button, { variant: "outline", size: "sm", children: [(0, jsx_runtime_1.jsx)(icons_react_1.IconLayoutColumns, {}), (0, jsx_runtime_1.jsx)("span", { className: "hidden lg:inline", children: "Customize Columns" }), (0, jsx_runtime_1.jsx)("span", { className: "lg:hidden", children: "Columns" }), (0, jsx_runtime_1.jsx)(icons_react_1.IconChevronDown, {})] }) }), (0, jsx_runtime_1.jsx)(dropdown_menu_1.DropdownMenuContent, { align: "end", className: "w-56", children: table
                                            .getAllColumns()
                                            .filter(function (column) {
                                            return typeof column.accessorFn !== "undefined" &&
                                                column.getCanHide();
                                        })
                                            .map(function (column) {
                                            return ((0, jsx_runtime_1.jsx)(dropdown_menu_1.DropdownMenuCheckboxItem, { className: "capitalize", checked: column.getIsVisible(), onCheckedChange: function (value) {
                                                    return column.toggleVisibility(!!value);
                                                }, children: column.id }, column.id));
                                        }) })] }), (0, jsx_runtime_1.jsxs)(button_1.Button, { variant: "outline", size: "sm", children: [(0, jsx_runtime_1.jsx)(icons_react_1.IconPlus, {}), (0, jsx_runtime_1.jsx)("span", { className: "hidden lg:inline", children: "Add Section" })] })] })] }), (0, jsx_runtime_1.jsxs)(tabs_1.TabsContent, { value: "outline", className: "relative flex flex-col gap-4 overflow-auto px-4 lg:px-6", children: [(0, jsx_runtime_1.jsx)("div", { className: "overflow-hidden rounded-lg border", children: (0, jsx_runtime_1.jsx)(core_1.DndContext, { collisionDetection: core_1.closestCenter, modifiers: [modifiers_1.restrictToVerticalAxis], onDragEnd: handleDragEnd, sensors: sensors, id: sortableId, children: (0, jsx_runtime_1.jsxs)(table_1.Table, { children: [(0, jsx_runtime_1.jsx)(table_1.TableHeader, { className: "bg-muted sticky top-0 z-10", children: table.getHeaderGroups().map(function (headerGroup) { return ((0, jsx_runtime_1.jsx)(table_1.TableRow, { children: headerGroup.headers.map(function (header) {
                                                return ((0, jsx_runtime_1.jsx)(table_1.TableHead, { colSpan: header.colSpan, children: header.isPlaceholder
                                                        ? null
                                                        : (0, react_table_1.flexRender)(header.column.columnDef.header, header.getContext()) }, header.id));
                                            }) }, headerGroup.id)); }) }), (0, jsx_runtime_1.jsx)(table_1.TableBody, { className: "**:data-[slot=table-cell]:first:w-8", children: ((_b = table.getRowModel().rows) === null || _b === void 0 ? void 0 : _b.length) ? ((0, jsx_runtime_1.jsx)(sortable_1.SortableContext, { items: dataIds, strategy: sortable_1.verticalListSortingStrategy, children: table.getRowModel().rows.map(function (row) { return ((0, jsx_runtime_1.jsx)(DraggableRow, { row: row }, row.id)); }) })) : ((0, jsx_runtime_1.jsx)(table_1.TableRow, { children: (0, jsx_runtime_1.jsx)(table_1.TableCell, { colSpan: columns.length, className: "h-24 text-center", children: "No results." }) })) })] }) }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between px-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-muted-foreground hidden flex-1 text-sm lg:flex", children: [table.getFilteredSelectedRowModel().rows.length, " of", " ", table.getFilteredRowModel().rows.length, " row(s) selected."] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex w-full items-center gap-8 lg:w-fit", children: [(0, jsx_runtime_1.jsxs)("div", { className: "hidden items-center gap-2 lg:flex", children: [(0, jsx_runtime_1.jsx)(label_1.Label, { htmlFor: "rows-per-page", className: "text-sm font-medium", children: "Rows per page" }), (0, jsx_runtime_1.jsxs)(select_1.Select, { value: "".concat(table.getState().pagination.pageSize), onValueChange: function (value) {
                                                    table.setPageSize(Number(value));
                                                }, children: [(0, jsx_runtime_1.jsx)(select_1.SelectTrigger, { size: "sm", className: "w-20", id: "rows-per-page", children: (0, jsx_runtime_1.jsx)(select_1.SelectValue, { placeholder: table.getState().pagination.pageSize }) }), (0, jsx_runtime_1.jsx)(select_1.SelectContent, { side: "top", children: [10, 20, 30, 40, 50].map(function (pageSize) { return ((0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "".concat(pageSize), children: pageSize }, pageSize)); }) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex w-fit items-center justify-center text-sm font-medium", children: ["Page ", table.getState().pagination.pageIndex + 1, " of", " ", table.getPageCount()] }), (0, jsx_runtime_1.jsxs)("div", { className: "ml-auto flex items-center gap-2 lg:ml-0", children: [(0, jsx_runtime_1.jsxs)(button_1.Button, { variant: "outline", className: "hidden h-8 w-8 p-0 lg:flex", onClick: function () { return table.setPageIndex(0); }, disabled: !table.getCanPreviousPage(), children: [(0, jsx_runtime_1.jsx)("span", { className: "sr-only", children: "Go to first page" }), (0, jsx_runtime_1.jsx)(icons_react_1.IconChevronsLeft, {})] }), (0, jsx_runtime_1.jsxs)(button_1.Button, { variant: "outline", className: "size-8", size: "icon", onClick: function () { return table.previousPage(); }, disabled: !table.getCanPreviousPage(), children: [(0, jsx_runtime_1.jsx)("span", { className: "sr-only", children: "Go to previous page" }), (0, jsx_runtime_1.jsx)(icons_react_1.IconChevronLeft, {})] }), (0, jsx_runtime_1.jsxs)(button_1.Button, { variant: "outline", className: "size-8", size: "icon", onClick: function () { return table.nextPage(); }, disabled: !table.getCanNextPage(), children: [(0, jsx_runtime_1.jsx)("span", { className: "sr-only", children: "Go to next page" }), (0, jsx_runtime_1.jsx)(icons_react_1.IconChevronRight, {})] }), (0, jsx_runtime_1.jsxs)(button_1.Button, { variant: "outline", className: "hidden size-8 lg:flex", size: "icon", onClick: function () { return table.setPageIndex(table.getPageCount() - 1); }, disabled: !table.getCanNextPage(), children: [(0, jsx_runtime_1.jsx)("span", { className: "sr-only", children: "Go to last page" }), (0, jsx_runtime_1.jsx)(icons_react_1.IconChevronsRight, {})] })] })] })] })] }), (0, jsx_runtime_1.jsx)(tabs_1.TabsContent, { value: "past-performance", className: "flex flex-col px-4 lg:px-6", children: (0, jsx_runtime_1.jsx)("div", { className: "aspect-video w-full flex-1 rounded-lg border border-dashed" }) }), (0, jsx_runtime_1.jsx)(tabs_1.TabsContent, { value: "key-personnel", className: "flex flex-col px-4 lg:px-6", children: (0, jsx_runtime_1.jsx)("div", { className: "aspect-video w-full flex-1 rounded-lg border border-dashed" }) }), (0, jsx_runtime_1.jsx)(tabs_1.TabsContent, { value: "focus-documents", className: "flex flex-col px-4 lg:px-6", children: (0, jsx_runtime_1.jsx)("div", { className: "aspect-video w-full flex-1 rounded-lg border border-dashed" }) })] }));
}
var chartData = [
    { month: "January", desktop: 186, mobile: 80 },
    { month: "February", desktop: 305, mobile: 200 },
    { month: "March", desktop: 237, mobile: 120 },
    { month: "April", desktop: 73, mobile: 190 },
    { month: "May", desktop: 209, mobile: 130 },
    { month: "June", desktop: 214, mobile: 140 },
];
var chartConfig = {
    desktop: {
        label: "Desktop",
        color: "var(--primary)",
    },
    mobile: {
        label: "Mobile",
        color: "var(--primary)",
    },
};
function TableCellViewer(_a) {
    var item = _a.item;
    var isMobile = (0, use_mobile_1.useIsMobile)();
    return ((0, jsx_runtime_1.jsxs)(drawer_1.Drawer, { direction: isMobile ? "bottom" : "right", children: [(0, jsx_runtime_1.jsx)(drawer_1.DrawerTrigger, { asChild: true, children: (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "link", className: "text-foreground w-fit px-0 text-left", children: item.header }) }), (0, jsx_runtime_1.jsxs)(drawer_1.DrawerContent, { children: [(0, jsx_runtime_1.jsxs)(drawer_1.DrawerHeader, { className: "gap-1", children: [(0, jsx_runtime_1.jsx)(drawer_1.DrawerTitle, { children: item.header }), (0, jsx_runtime_1.jsx)(drawer_1.DrawerDescription, { children: "Showing total visitors for the last 6 months" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-4 overflow-y-auto px-4 text-sm", children: [!isMobile && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(chart_1.ChartContainer, { config: chartConfig, children: (0, jsx_runtime_1.jsxs)(recharts_1.AreaChart, { accessibilityLayer: true, data: chartData, margin: {
                                                left: 0,
                                                right: 10,
                                            }, children: [(0, jsx_runtime_1.jsx)(recharts_1.CartesianGrid, { vertical: false }), (0, jsx_runtime_1.jsx)(recharts_1.XAxis, { dataKey: "month", tickLine: false, axisLine: false, tickMargin: 8, tickFormatter: function (value) { return value.slice(0, 3); }, hide: true }), (0, jsx_runtime_1.jsx)(chart_1.ChartTooltip, { cursor: false, content: (0, jsx_runtime_1.jsx)(chart_1.ChartTooltipContent, { indicator: "dot" }) }), (0, jsx_runtime_1.jsx)(recharts_1.Area, { dataKey: "mobile", type: "natural", fill: "var(--color-mobile)", fillOpacity: 0.6, stroke: "var(--color-mobile)", stackId: "a" }), (0, jsx_runtime_1.jsx)(recharts_1.Area, { dataKey: "desktop", type: "natural", fill: "var(--color-desktop)", fillOpacity: 0.4, stroke: "var(--color-desktop)", stackId: "a" })] }) }), (0, jsx_runtime_1.jsx)(separator_1.Separator, {}), (0, jsx_runtime_1.jsxs)("div", { className: "grid gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2 leading-none font-medium", children: ["Trending up by 5.2% this month", " ", (0, jsx_runtime_1.jsx)(icons_react_1.IconTrendingUp, { className: "size-4" })] }), (0, jsx_runtime_1.jsx)("div", { className: "text-muted-foreground", children: "Showing total visitors for the last 6 months. This is just some random text to test the layout. It spans multiple lines and should wrap around." })] }), (0, jsx_runtime_1.jsx)(separator_1.Separator, {})] })), (0, jsx_runtime_1.jsxs)("form", { className: "flex flex-col gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-3", children: [(0, jsx_runtime_1.jsx)(label_1.Label, { htmlFor: "header", children: "Header" }), (0, jsx_runtime_1.jsx)(input_1.Input, { id: "header", defaultValue: item.header })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-3", children: [(0, jsx_runtime_1.jsx)(label_1.Label, { htmlFor: "type", children: "Type" }), (0, jsx_runtime_1.jsxs)(select_1.Select, { defaultValue: item.type, children: [(0, jsx_runtime_1.jsx)(select_1.SelectTrigger, { id: "type", className: "w-full", children: (0, jsx_runtime_1.jsx)(select_1.SelectValue, { placeholder: "Select a type" }) }), (0, jsx_runtime_1.jsxs)(select_1.SelectContent, { children: [(0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "Table of Contents", children: "Table of Contents" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "Executive Summary", children: "Executive Summary" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "Technical Approach", children: "Technical Approach" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "Design", children: "Design" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "Capabilities", children: "Capabilities" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "Focus Documents", children: "Focus Documents" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "Narrative", children: "Narrative" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "Cover Page", children: "Cover Page" })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-3", children: [(0, jsx_runtime_1.jsx)(label_1.Label, { htmlFor: "status", children: "Status" }), (0, jsx_runtime_1.jsxs)(select_1.Select, { defaultValue: item.status, children: [(0, jsx_runtime_1.jsx)(select_1.SelectTrigger, { id: "status", className: "w-full", children: (0, jsx_runtime_1.jsx)(select_1.SelectValue, { placeholder: "Select a status" }) }), (0, jsx_runtime_1.jsxs)(select_1.SelectContent, { children: [(0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "Done", children: "Done" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "In Progress", children: "In Progress" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "Not Started", children: "Not Started" })] })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-3", children: [(0, jsx_runtime_1.jsx)(label_1.Label, { htmlFor: "target", children: "Target" }), (0, jsx_runtime_1.jsx)(input_1.Input, { id: "target", defaultValue: item.target })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-3", children: [(0, jsx_runtime_1.jsx)(label_1.Label, { htmlFor: "limit", children: "Limit" }), (0, jsx_runtime_1.jsx)(input_1.Input, { id: "limit", defaultValue: item.limit })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-3", children: [(0, jsx_runtime_1.jsx)(label_1.Label, { htmlFor: "reviewer", children: "Reviewer" }), (0, jsx_runtime_1.jsxs)(select_1.Select, { defaultValue: item.reviewer, children: [(0, jsx_runtime_1.jsx)(select_1.SelectTrigger, { id: "reviewer", className: "w-full", children: (0, jsx_runtime_1.jsx)(select_1.SelectValue, { placeholder: "Select a reviewer" }) }), (0, jsx_runtime_1.jsxs)(select_1.SelectContent, { children: [(0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "Eddie Lake", children: "Eddie Lake" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "Jamik Tashpulatov", children: "Jamik Tashpulatov" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "Emily Whalen", children: "Emily Whalen" })] })] })] })] })] }), (0, jsx_runtime_1.jsxs)(drawer_1.DrawerFooter, { children: [(0, jsx_runtime_1.jsx)(button_1.Button, { children: "Submit" }), (0, jsx_runtime_1.jsx)(drawer_1.DrawerClose, { asChild: true, children: (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "outline", children: "Done" }) })] })] })] }));
}
