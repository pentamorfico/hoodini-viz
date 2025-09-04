/// <reference types="vite/client" />

// Dev helper injected at runtime by App.tsx for debugging legend payloads
interface Window {
	__hoodini_getLegend?: () => any;
	__hoodini_getClusters?: () => any;
	__hoodini_alignCluster?: (clusterId: any) => any;
}
