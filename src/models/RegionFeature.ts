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
      strand, 
      type, 
      region_id: attributes?.ID || `region_${seqid}_${start}_${end}`,
      region_name: attributes?.Name || attributes?.ID || `region_${seqid}_${start}_${end}`,
      region_type: type,
      length: Math.abs(end - start),
      ...attributes 
    };
  }

  setTrackY(y) {
    this.trackY = y;
    // Note: updatePolygon will be called separately with genes
  }

  /**
   * Update the polygon coordinates for this region.
   * This creates a rectangle that surrounds all genes within the region bounds,
   * taking into account gene heights, arrowhead heights, and padding.
   * 
   * @param {Array} genesInRegion - Array of Gene objects within this region
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
    
    // If no genes in region, create a simple rectangle based on region coordinates
    if (genesInRegion.length === 0) {
      const minX = Math.min(this.start, this.end);
      const maxX = Math.max(this.start, this.end);
      const padding = this.config.region?.padding || this.padding;
      const halfHeight = (this.config.gene?.height || 20) / 2 + padding;
      
      this.polygon = [
        [minX - padding, this.trackY - halfHeight],
        [maxX + padding, this.trackY - halfHeight],
        [maxX + padding, this.trackY + halfHeight],
        [minX - padding, this.trackY + halfHeight],
        [minX - padding, this.trackY - halfHeight]
      ];
      return;
    }
    
    // Calculate bounds from genes within the region
    const geneHeight = this.config.gene?.height || 20;
    const arrowheadHeight = this.config.gene?.arrowheadHeight || 30;
    const padding = this.config.region?.padding || this.padding;
    
    // Find the visual bounds of all genes in the region
    let minX = Infinity;
    let maxX = -Infinity;
    
    genesInRegion.forEach(gene => {
      // Use gene's actual visual coordinates
      const geneMinX = Math.min(gene.start, gene.end);
      const geneMaxX = Math.max(gene.start, gene.end);
      
      minX = Math.min(minX, geneMinX);
      maxX = Math.max(maxX, geneMaxX);
    });
    
    // Calculate Y bounds based on gene height and arrowhead height
    const effectiveHeight = Math.max(geneHeight, arrowheadHeight);
    const halfHeight = effectiveHeight / 2;
    
    const minY = this.trackY - halfHeight - padding;
    const maxY = this.trackY + halfHeight + padding;
    
    // Add horizontal padding
    minX -= padding;
    maxX += padding;
    
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
    const typeColors = {
      'phage': [255, 0, 0, 255],        // Red for phage regions
      'prophage': [255, 165, 0, 255],   // Orange for prophage regions
      'operon': [0, 128, 0, 255],       // Green for operons
      'cluster': [0, 0, 255, 255],      // Blue for gene clusters
      'island': [255, 255, 0, 255],     // Yellow for genomic islands
      'region': [128, 128, 128, 255]    // Gray for generic regions
    };
    
    const regionType = (this.type || 'region').toLowerCase();
    return typeColors[regionType] || typeColors['region'];
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
