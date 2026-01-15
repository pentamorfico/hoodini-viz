// RegionFeature.js
import GFFFeature from './GFFFeature';

class RegionFeature extends GFFFeature {
  constructor(seqid, start, end, strand, type, attributes, config) {
    super(seqid, start, end, strand, type, attributes);
    this.config = config;
    this.polygon = null; // Store polygon coordinates for rectangle
    this.trackY = null;
    this.padding = config?.region?.padding || 10; // Padding around genes
    this.fillColor = [0, 0, 0, 0]; // Transparent fill (no fill)
    this.strokeColor = [100, 100, 100, 255]; // Default gray stroke
    this.strokeWidth = config?.region?.strokeWidth || 2;
    
    // Enhanced metadata for tooltips
    this.metadata = {
      seqid, 
      start, 
      end, 
      type, 
      length: Math.abs(end - start)
    };
    
    // DEBUG: Log attributes type
    // console.log('RegionFeature ctor:', { seqid, type, attrsType: typeof attributes, isStringObj: attributes instanceof String, attributes });

    // Safely handle attributes merge
    if (attributes) {
      if (typeof attributes === 'string' || attributes instanceof String) {
         // If it's a string (primitive or object), store it as 'attributes' so getTooltip can parse it
         this.metadata.attributes = attributes.toString();
      } else if (typeof attributes === 'object') {
        Object.assign(this.metadata, attributes);
      }
    }
  }

  setTrackY(y) {
    this.trackY = y;
    // Note: updatePolygon will be called separately with genes
  }

  /**
   * Update the polygon coordinates for this region.
   * This creates a rectangle that strictly respects the region's start/end coordinates,
   * while adapting its height to cover the track content.
   * 
   * @param {Array} genesInRegion - Array of Gene objects (used for height calculation only)
   * @param {number} trackY - Y coordinate of the track
   */
  updatePolygon(genesInRegion = [], trackY = null) {
    if (trackY !== null) {
      this.trackY = trackY;
    }
    
    if (!this.config) {
      console.warn('RegionFeature: No config provided, using defaults');
      this.config = {
        gene: { height: 20, arrowheadHeight: 30 },
        region: { padding: 10, strokeWidth: 2 }
      };
    }

    // Use strict coordinates provided by GenomeView (scaled and offset correctly)
    const minX = Math.min(this.start, this.end);
    const maxX = Math.max(this.start, this.end);
    
    // Calculate Y bounds based on gene height and arrowhead height
    const geneHeight = this.config.gene?.height || 20;
    const arrowheadHeight = this.config.gene?.arrowheadHeight || 30;
    const padding = this.config.region?.padding || this.padding;
    const effectiveHeight = Math.max(geneHeight, arrowheadHeight);
    const halfHeight = effectiveHeight / 2;
    
    // Only apply vertical padding
    const minY = this.trackY - halfHeight - padding;
    const maxY = this.trackY + halfHeight + padding;
    
    // Create rectangle polygon
    this.polygon = [
      [minX, minY],
      [maxX, minY],
      [maxX, maxY],
      [minX, maxY],
      [minX, minY] // Close the polygon
    ];
  }

  /**
   * Check if a gene is within this region's boundaries
   */
  containsGene(gene) {
    const regionStart = Math.min(this.start, this.end);
    const regionEnd = Math.max(this.start, this.end);
    const geneStart = Math.min(gene.start, gene.end);
    const geneEnd = Math.max(gene.start, gene.end);
    
    // Check if gene overlaps with region (even partially)
    return !(geneEnd < regionStart || geneStart > regionEnd);
  }

  /**
   * Get the fill color for this region - always transparent (no fill)
   */
  getFillColor() {
    return [0, 0, 0, 0]; // Always transparent
  }

  /**
   * Get stroke color for the region outline based on region type
   */
  getStrokeColor() {
    // If a specific stroke color was provided in attributes (e.g. from GFF), use it
    // Otherwise derive from type
    if (this.strokeColor && this.strokeColor[3] !== 0) return this.strokeColor;
    
    const type = (this.type || '').toLowerCase();
    const colors = this.config?.region?.colors || {};
    
    // Check config for typical types
    if (colors[type]) return colors[type];
    
    return colors.default || [128, 128, 128, 255];
  }

  /**
   * Get region type for palette coloring
   * Extract region type from ID attribute (e.g., "operon_1" -> "operon")
   */
  getColorKey() {
    // First try to get region type from ID attribute
    const id = this.metadata?.region_id || this.metadata?.ID || this.originalId || '';
    if (id) {
      // Extract type from ID patterns like "operon_1", "cluster_abc", "phage_region_1", etc.
      const match = id.match(/^([a-zA-Z]+)/);
      if (match) {
        return match[1].toLowerCase();
      }
    }
    
    // Fallback to region_type from metadata or attributes
    if (this.metadata?.region_type) {
      return this.metadata.region_type.toLowerCase();
    }
    
    // Final fallback to feature type
    return (this.type || 'region').toLowerCase();
  }
}

export default RegionFeature;
