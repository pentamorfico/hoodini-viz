import type { Meta, StoryObj } from '@storybook/react';
import { useMemo } from 'react';
import HoodiniViz from '@/components/HoodiniViz';
import { parseGFF } from '@/utils/parseGFF';
import { parseLinks } from '@/utils/parseLinks';
import { parseNucleotideLinks } from '@/utils/parseNucleotideLinks';
import { parseDomains } from '@/utils/parseDomains';
import parseHoods from '@/utils/parseHoods';
import parseProteinMetadata from '@/utils/parseProteinMetadata';
import parseTreeMetadata from '@/utils/parseTreeMetadata';

/**
 * HoodiniViz is the core visualization component for genomic neighborhoods.
 * It renders phylogenetic trees, genes, domains, and links.
 */

// ============================================================================
// SAMPLE DATA - Embedded strings showing the exact format of each data type
// ============================================================================

/**
 * GFF3 Format: seqid, source, type, start, end, score, strand, phase, attributes
 */
const SAMPLE_GFF = `
contig_A\thoodini\tCDS\t1000\t2500\t.\t+\t.\tID=gene_A1;Name=proteinA1;product=Hypothetical protein
contig_A\thoodini\tCDS\t2700\t4200\t.\t+\t.\tID=gene_A2;Name=proteinA2;product=ABC transporter
contig_A\thoodini\tCDS\t4500\t6000\t.\t-\t.\tID=gene_A3;Name=proteinA3;product=DNA helicase
contig_A\thoodini\tCDS\t6200\t7800\t.\t+\t.\tID=gene_A4;Name=proteinA4;product=Methyltransferase
contig_A\thoodini\tCDS\t8000\t9500\t.\t+\t.\tID=gene_A5;Name=proteinA5;product=Restriction enzyme
contig_B\thoodini\tCDS\t500\t2000\t.\t+\t.\tID=gene_B1;Name=proteinB1;product=Hypothetical protein
contig_B\thoodini\tCDS\t2200\t3700\t.\t+\t.\tID=gene_B2;Name=proteinB2;product=ABC transporter
contig_B\thoodini\tCDS\t4000\t5500\t.\t-\t.\tID=gene_B3;Name=proteinB3;product=DNA helicase
contig_B\thoodini\tCDS\t5700\t7200\t.\t+\t.\tID=gene_B4;Name=proteinB4;product=Methyltransferase
contig_B\thoodini\tCDS\t7400\t8900\t.\t+\t.\tID=gene_B5;Name=proteinB5;product=Restriction enzyme
contig_C\thoodini\tCDS\t800\t2300\t.\t-\t.\tID=gene_C1;Name=proteinC1;product=Hypothetical protein
contig_C\thoodini\tCDS\t2500\t4000\t.\t-\t.\tID=gene_C2;Name=proteinC2;product=ABC transporter
contig_C\thoodini\tCDS\t4300\t5800\t.\t+\t.\tID=gene_C3;Name=proteinC3;product=DNA helicase
contig_C\thoodini\tCDS\t6000\t7500\t.\t-\t.\tID=gene_C4;Name=proteinC4;product=Methyltransferase
contig_C\thoodini\tCDS\t7700\t9200\t.\t-\t.\tID=gene_C5;Name=proteinC5;product=Restriction enzyme
`.trim();

/**
 * Hoods Format: Tab-separated values
 */
const SAMPLE_HOODS_NO_ALIGN = `
hood_id\tseqid\tstart\tend
1\tcontig_A\t0\t10000
2\tcontig_B\t0\t9500
3\tcontig_C\t0\t10000
`.trim();

/**
 * Hoods Format (with align_gene): Tab-separated values
 */
const SAMPLE_HOODS = `
hood_id\tseqid\tstart\tend\talign_gene
1\tcontig_A\t0\t10000\tgene_A3
2\tcontig_B\t0\t9500\tgene_B3
3\tcontig_C\t0\t10000\tgene_C3
`.trim();

/**
 * Newick Format: Phylogenetic tree
 */
const SAMPLE_NEWICK = `((contig_A:0.1,contig_B:0.15):0.05,contig_C:0.2);`;

/**
 * Protein Links Format: gene_id_1, gene_id_2, identity
 */
const SAMPLE_PROTEIN_LINKS = `
gene_A1\tgene_B1\t95.5
gene_A1\tgene_C1\t85.2
gene_B1\tgene_C1\t88.0
gene_A2\tgene_B2\t92.3
gene_A2\tgene_C2\t78.5
gene_B2\tgene_C2\t80.1
gene_A3\tgene_B3\t97.8
gene_A3\tgene_C3\t91.2
gene_B3\tgene_C3\t93.5
gene_A4\tgene_B4\t89.0
gene_A4\tgene_C4\t75.3
gene_B4\tgene_C4\t77.8
gene_A5\tgene_B5\t94.2
gene_A5\tgene_C5\t82.1
gene_B5\tgene_C5\t84.5
`.trim();

/**
 * Nucleotide Links Format: seqid_1, start_1, end_1, seqid_2, start_2, end_2, identity
 */
const SAMPLE_NUCLEOTIDE_LINKS = `
contig_A\t1000\t4200\tcontig_B\t500\t3700\t92.5
contig_A\t4500\t7800\tcontig_B\t4000\t7200\t88.3
contig_A\t1000\t4200\tcontig_C\t800\t4000\t85.1
contig_B\t500\t3700\tcontig_C\t800\t4000\t90.2
contig_A\t8000\t9500\tcontig_B\t7400\t8900\t91.0
contig_B\t7400\t8900\tcontig_C\t7700\t9200\t87.5
`.trim();

/**
 * Domains Format: gene_id, domain_id, start, end, source, evalue, coverage
 */
const SAMPLE_DOMAINS = `
gene_A2\tPF00005\t10.0\t200.0\tpfam\t1e-50\t0.85
gene_A2\tPF00664\t250.0\t400.0\tpfam\t1e-30\t0.75
gene_A3\tPF00271\t5.0\t180.0\tpfam\t1e-45\t0.90
gene_A4\tPF13649\t20.0\t150.0\tpfam\t1e-25\t0.70
gene_B2\tPF00005\t15.0\t205.0\tpfam\t1e-48\t0.83
gene_B2\tPF00664\t255.0\t405.0\tpfam\t1e-28\t0.73
gene_B3\tPF00271\t8.0\t183.0\tpfam\t1e-42\t0.88
gene_B4\tPF13649\t25.0\t155.0\tpfam\t1e-23\t0.68
gene_C2\tPF00005\t12.0\t202.0\tpfam\t1e-45\t0.80
gene_C2\tPF00664\t252.0\t402.0\tpfam\t1e-25\t0.70
gene_C3\tPF00271\t10.0\t185.0\tpfam\t1e-40\t0.85
gene_C4\tPF13649\t22.0\t152.0\tpfam\t1e-20\t0.65
`.trim();

/**
 * Protein Metadata Format: id, sequence, product, cluster
 */
const SAMPLE_PROTEIN_METADATA = `
id\tsequence\tproduct\tcluster
gene_A1\tMKTLLPTAVFVFL\tHypothetical protein\t1
gene_A2\tMGKISILVGPSGAGKSTLLA\tABC transporter\t2
gene_A3\tMSDVQRELQKFLED\tDNA helicase\t3
gene_A4\tMKKIGVLTSGGD\tMethyltransferase\t4
gene_A5\tMLTKFGKTLVVDNG\tRestriction enzyme\t5
gene_B1\tMKTLLPTAVFVFL\tHypothetical protein\t1
gene_B2\tMGKISILVGPSGAGKSTLLA\tABC transporter\t2
gene_B3\tMSDVQRELQKFLED\tDNA helicase\t3
gene_B4\tMKKIGVLTSGGD\tMethyltransferase\t4
gene_B5\tMLTKFGKTLVVDNG\tRestriction enzyme\t5
gene_C1\tMKTLLPTAVFVFL\tHypothetical protein\t1
gene_C2\tMGKISILVGPSGAGKSTLLA\tABC transporter\t2
gene_C3\tMSDVQRELQKFLED\tDNA helicase\t3
gene_C4\tMKKIGVLTSGGD\tMethyltransferase\t4
gene_C5\tMLTKFGKTLVVDNG\tRestriction enzyme\t5
`.trim();

/**
 * Protein Metadata with color column
 */
const SAMPLE_PROTEIN_METADATA_WITH_COLORS = `
id\tsequence\tproduct\tcluster\tcolor
gene_A1\tMKTLLPTAVFVFL\tHypothetical protein\t1\t255,100,50,255
gene_A2\tMGKISILVGPSGAGKSTLLA\tABC transporter\t2\t50,150,255,255
gene_A3\tMSDVQRELQKFLED\tDNA helicase\t3\t100,200,50,255
gene_A4\tMKKIGVLTSGGD\tMethyltransferase\t4\t200,100,200,255
gene_A5\tMLTKFGKTLVVDNG\tRestriction enzyme\t5\t255,200,50,255
gene_B1\tMKTLLPTAVFVFL\tHypothetical protein\t1\t255,100,50,255
gene_B2\tMGKISILVGPSGAGKSTLLA\tABC transporter\t2\t50,150,255,255
gene_B3\tMSDVQRELQKFLED\tDNA helicase\t3\t100,200,50,255
gene_B4\tMKKIGVLTSGGD\tMethyltransferase\t4\t200,100,200,255
gene_B5\tMLTKFGKTLVVDNG\tRestriction enzyme\t5\t255,200,50,255
gene_C1\tMKTLLPTAVFVFL\tHypothetical protein\t1\t255,100,50,255
gene_C2\tMGKISILVGPSGAGKSTLLA\tABC transporter\t2\t50,150,255,255
gene_C3\tMSDVQRELQKFLED\tDNA helicase\t3\t100,200,50,255
gene_C4\tMKKIGVLTSGGD\tMethyltransferase\t4\t200,100,200,255
gene_C5\tMLTKFGKTLVVDNG\tRestriction enzyme\t5\t255,200,50,255
`.trim();

/**
 * Tree Metadata Format: leaf_id, taxonomy columns
 */
const SAMPLE_TREE_METADATA = `
leaf_id\tog_index\tsuperkingdom\tphylum\tclass\torder\tfamily\tgenus\tspecies
contig_A\t0\tBacteria\tProteobacteria\tGammaproteobacteria\tEnterobacterales\tEnterobacteriaceae\tEscherichia\tEscherichia coli
contig_B\t1\tBacteria\tProteobacteria\tGammaproteobacteria\tEnterobacterales\tEnterobacteriaceae\tSalmonella\tSalmonella enterica
contig_C\t2\tBacteria\tProteobacteria\tGammaproteobacteria\tPseudomonadales\tPseudomonadaceae\tPseudomonas\tPseudomonas aeruginosa
`.trim();

/**
 * Tree Metadata with color column
 */
const SAMPLE_TREE_METADATA_WITH_COLORS = `
leaf_id\tsuperkingdom\tphylum\tspecies\tcolor
contig_A\tBacteria\tProteobacteria\tEscherichia coli\t200,50,100,255
contig_B\tBacteria\tProteobacteria\tSalmonella enterica\t50,200,150,255
contig_C\tBacteria\tProteobacteria\tPseudomonas aeruginosa\t150,100,200,255
`.trim();

// ============================================================================
// STORYBOOK META
// ============================================================================

const meta = {
  title: 'Examples/HoodiniViz',
  component: HoodiniViz,
  decorators: [
    (Story) => (
      <div style={{ width: '100%', minWidth: '800px', height: '600px', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: {
        inline: false,
        iframeHeight: 600,
      },
      canvas: {
        sourceState: 'none',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof HoodiniViz>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// STORIES
// ============================================================================

/**
 * 1. Basic - Just genes and hoods (gray genes, no coloring, no alignment)
 */
export const Basic: Story = {
  render: () => {
    const data = useMemo(() => {
      const gffFeatures = parseGFF(SAMPLE_GFF);
      const hoods = parseHoods(SAMPLE_HOODS_NO_ALIGN);
      return { gffFeatures, hoods };
    }, []);

    return (
      <HoodiniViz
        gffFeatures={data.gffFeatures}
        proteinLinks={[]}
        nucleotideLinks={[]}
        domainsByGene={{}}
        hoods={data.hoods}
        visibleGeneIds={null}
        showScrollbar={true}
        showRuler={true}
      />
    );
  },
};

/**
 * 2. Basic With Arrow Heads - Custom arrowhead height for genes
 */
export const BasicWithArrowHeads: Story = {
  render: () => {
    const data = useMemo(() => {
      const gffFeatures = parseGFF(SAMPLE_GFF);
      const hoods = parseHoods(SAMPLE_HOODS_NO_ALIGN);
      return { gffFeatures, hoods };
    }, []);

    return (
      <HoodiniViz
        gffFeatures={data.gffFeatures}
        proteinLinks={[]}
        nucleotideLinks={[]}
        domainsByGene={{}}
        hoods={data.hoods}
        arrowheadHeight={30}
        visibleGeneIds={null}
        showScrollbar={true}
        showRuler={true}
      />
    );
  },
};

/**
 * 3. Basic With Align Gene - Hoods aligned by a specific gene (align_gene column)
 */
export const BasicWithAlignGene: Story = {
  render: () => {
    const data = useMemo(() => {
      const gffFeatures = parseGFF(SAMPLE_GFF);
      const hoods = parseHoods(SAMPLE_HOODS);
      return { gffFeatures, hoods };
    }, []);

    return (
      <HoodiniViz
        gffFeatures={data.gffFeatures}
        proteinLinks={[]}
        nucleotideLinks={[]}
        domainsByGene={{}}
        hoods={data.hoods}
        visibleGeneIds={null}
        showScrollbar={true}
        showRuler={true}
      />
    );
  },
};

/**
 * 4. Basic + Colors - Using geneColors prop for custom gene colors
 */
export const BasicWithColors: Story = {
  render: () => {
    const data = useMemo(() => {
      const gffFeatures = parseGFF(SAMPLE_GFF);
      const hoods = parseHoods(SAMPLE_HOODS);
      return { gffFeatures, hoods };
    }, []);

    // Custom colors for genes (RGBA format)
    const geneColors = useMemo(() => ({
      'gene_A1': [255, 100, 50, 255],   // Orange
      'gene_A2': [50, 150, 255, 255],   // Blue
      'gene_A3': [100, 200, 50, 255],   // Green
      'gene_A4': [200, 100, 200, 255],  // Purple
      'gene_A5': [255, 200, 50, 255],   // Yellow
      'gene_B1': [255, 100, 50, 255],
      'gene_B2': [50, 150, 255, 255],
      'gene_B3': [100, 200, 50, 255],
      'gene_B4': [200, 100, 200, 255],
      'gene_B5': [255, 200, 50, 255],
      'gene_C1': [255, 100, 50, 255],
      'gene_C2': [50, 150, 255, 255],
      'gene_C3': [100, 200, 50, 255],
      'gene_C4': [200, 100, 200, 255],
      'gene_C5': [255, 200, 50, 255],
    }), []);

    return (
      <HoodiniViz
        gffFeatures={data.gffFeatures}
        proteinLinks={[]}
        nucleotideLinks={[]}
        domainsByGene={{}}
        hoods={data.hoods}
        geneColors={geneColors}
        visibleGeneIds={null}
        showScrollbar={true}
        showRuler={true}
      />
    );
  },
};

/**
 * 5. Basic With Protein Metadata - Shows metadata in tooltips
 */
export const BasicWithProteinMetadata: Story = {
  render: () => {
    const data = useMemo(() => {
      const gffFeatures = parseGFF(SAMPLE_GFF);
      const hoods = parseHoods(SAMPLE_HOODS);
      const proteinMetadata = parseProteinMetadata(SAMPLE_PROTEIN_METADATA);
      return { gffFeatures, hoods, proteinMetadata };
    }, []);

    return (
      <HoodiniViz
        gffFeatures={data.gffFeatures}
        proteinLinks={[]}
        nucleotideLinks={[]}
        domainsByGene={{}}
        hoods={data.hoods}
        proteinMetadata={data.proteinMetadata}
        visibleGeneIds={null}
        showScrollbar={true}
        showRuler={true}
      />
    );
  },
};

/**
 * 6. Basic + Palette - Using genePalette prop for automatic coloring by cluster
 * (requires proteinMetadata for cluster info)
 */
export const BasicWithPalette: Story = {
  render: () => {
    const data = useMemo(() => {
      const gffFeatures = parseGFF(SAMPLE_GFF);
      const hoods = parseHoods(SAMPLE_HOODS);
      const proteinMetadata = parseProteinMetadata(SAMPLE_PROTEIN_METADATA);
      return { gffFeatures, hoods, proteinMetadata };
    }, []);

    return (
      <HoodiniViz
        gffFeatures={data.gffFeatures}
        proteinLinks={[]}
        nucleotideLinks={[]}
        domainsByGene={{}}
        hoods={data.hoods}
        proteinMetadata={data.proteinMetadata}
        genePalette={{ type: 'qualitative', name: 'Set2', numColors: 8, enabled: true }}
        geneColorBy="cluster"
        visibleGeneIds={null}
        showScrollbar={true}
        showRuler={true}
      />
    );
  },
};

/**
 * 7. Basic With Protein Metadata + Column Colors - Colors from "color" column in metadata
 */
export const BasicWithProteinMetadataColumnColors: Story = {
  render: () => {
    const data = useMemo(() => {
      const gffFeatures = parseGFF(SAMPLE_GFF);
      const hoods = parseHoods(SAMPLE_HOODS);
      const proteinMetadata = parseProteinMetadata(SAMPLE_PROTEIN_METADATA_WITH_COLORS);
      return { gffFeatures, hoods, proteinMetadata };
    }, []);

    return (
      <HoodiniViz
        gffFeatures={data.gffFeatures}
        proteinLinks={[]}
        nucleotideLinks={[]}
        domainsByGene={{}}
        hoods={data.hoods}
        proteinMetadata={data.proteinMetadata}
        visibleGeneIds={null}
        showScrollbar={true}
        showRuler={true}
      />
    );
  },
};

/**
 * 8. With Tree - Adds phylogenetic tree
 */
export const WithTree: Story = {
  render: () => {
    const data = useMemo(() => {
      const gffFeatures = parseGFF(SAMPLE_GFF);
      const hoods = parseHoods(SAMPLE_HOODS);
      return { gffFeatures, hoods };
    }, []);

    return (
      <HoodiniViz
        newickStr={SAMPLE_NEWICK}
        gffFeatures={data.gffFeatures}
        proteinLinks={[]}
        nucleotideLinks={[]}
        domainsByGene={{}}
        hoods={data.hoods}
        visibleGeneIds={null}
        showScrollbar={true}
        showRuler={true}
      />
    );
  },
};

/**
 * 9. With Tree Metadata + Tree Column Colors - Tree labels colored from "color" column
 */
export const WithTreeMetadataColumnColors: Story = {
  render: () => {
    const data = useMemo(() => {
      const gffFeatures = parseGFF(SAMPLE_GFF);
      const hoods = parseHoods(SAMPLE_HOODS);
      const treeMetadata = parseTreeMetadata(SAMPLE_TREE_METADATA_WITH_COLORS);
      return { gffFeatures, hoods, treeMetadata };
    }, []);

    return (
      <HoodiniViz
        newickStr={SAMPLE_NEWICK}
        gffFeatures={data.gffFeatures}
        proteinLinks={[]}
        nucleotideLinks={[]}
        domainsByGene={{}}
        hoods={data.hoods}
        treeMetadata={data.treeMetadata}
        visibleGeneIds={null}
        showScrollbar={true}
        showRuler={true}
      />
    );
  },
};

/**
 * 10. With Protein Links - Shows synteny relationships (default coloring)
 */
export const WithProteinLinks: Story = {
  render: () => {
    const data = useMemo(() => {
      const gffFeatures = parseGFF(SAMPLE_GFF);
      const hoods = parseHoods(SAMPLE_HOODS);
      const proteinLinks = parseLinks(SAMPLE_PROTEIN_LINKS);
      return { gffFeatures, hoods, proteinLinks };
    }, []);

    return (
      <HoodiniViz
        gffFeatures={data.gffFeatures}
        proteinLinks={data.proteinLinks}
        nucleotideLinks={[]}
        domainsByGene={{}}
        hoods={data.hoods}
        visibleGeneIds={null}
        showScrollbar={true}
        showRuler={true}
      />
    );
  },
};

/**
 * 11. With Protein Links + Source Color - Links colored by source gene
 */
export const WithProteinLinksSourceColor: Story = {
  render: () => {
    const data = useMemo(() => {
      const gffFeatures = parseGFF(SAMPLE_GFF);
      const hoods = parseHoods(SAMPLE_HOODS);
      const proteinLinks = parseLinks(SAMPLE_PROTEIN_LINKS);
      const proteinMetadata = parseProteinMetadata(SAMPLE_PROTEIN_METADATA);
      return { gffFeatures, hoods, proteinLinks, proteinMetadata };
    }, []);

    return (
      <HoodiniViz
        gffFeatures={data.gffFeatures}
        proteinLinks={data.proteinLinks}
        nucleotideLinks={[]}
        domainsByGene={{}}
        hoods={data.hoods}
        proteinMetadata={data.proteinMetadata}
        genePalette={{ type: 'qualitative', name: 'Set2', numColors: 8, enabled: true }}
        geneColorBy="cluster"
        proteinLinkConfig={{ colorBy: 'source_gene', useAlpha: true, minAlpha: 0, maxAlpha: 0.5 }}
        visibleGeneIds={null}
        showScrollbar={true}
        showRuler={true}
      />
    );
  },
};

/**
 * 12. With Nucleotide Links - DNA-level synteny relationships
 */
export const WithNucleotideLinks: Story = {
  render: () => {
    const data = useMemo(() => {
      const gffFeatures = parseGFF(SAMPLE_GFF);
      const hoods = parseHoods(SAMPLE_HOODS);
      const nucleotideLinks = parseNucleotideLinks(SAMPLE_NUCLEOTIDE_LINKS);
      return { gffFeatures, hoods, nucleotideLinks };
    }, []);

    return (
      <HoodiniViz
        gffFeatures={data.gffFeatures}
        proteinLinks={[]}
        nucleotideLinks={data.nucleotideLinks}
        domainsByGene={{}}
        hoods={data.hoods}
        visibleGeneIds={null}
        showScrollbar={true}
        showRuler={true}
      />
    );
  },
};

/**
 * 13. With Domains - Protein domain architecture (default gray)
 */
export const WithDomains: Story = {
  render: () => {
    const data = useMemo(() => {
      const gffFeatures = parseGFF(SAMPLE_GFF);
      const hoods = parseHoods(SAMPLE_HOODS);
      const domainsByGene = parseDomains(SAMPLE_DOMAINS);
      return { gffFeatures, hoods, domainsByGene };
    }, []);

    return (
      <HoodiniViz
        gffFeatures={data.gffFeatures}
        proteinLinks={[]}
        nucleotideLinks={[]}
        domainsByGene={data.domainsByGene}
        hoods={data.hoods}
        visibleGeneIds={null}
        showScrollbar={true}
        showRuler={true}
      />
    );
  },
};

/**
 * 14. With Domains + Palette Colors - Domains colored by palette
 */
export const WithDomainsPaletteColors: Story = {
  render: () => {
    const data = useMemo(() => {
      const gffFeatures = parseGFF(SAMPLE_GFF);
      const hoods = parseHoods(SAMPLE_HOODS);
      const domainsByGene = parseDomains(SAMPLE_DOMAINS);
      return { gffFeatures, hoods, domainsByGene };
    }, []);

    return (
      <HoodiniViz
        gffFeatures={data.gffFeatures}
        proteinLinks={[]}
        nucleotideLinks={[]}
        domainsByGene={data.domainsByGene}
        hoods={data.hoods}
        domainPalette={{ type: 'qualitative', name: 'Set1', numColors: 9, enabled: true }}
        domainColorBy="domainName"
        visibleGeneIds={null}
        showScrollbar={true}
        showRuler={true}
      />
    );
  },
};

/**
 * 15. Complete - All features combined
 */
export const Complete: Story = {
  render: () => {
    const data = useMemo(() => {
      const gffFeatures = parseGFF(SAMPLE_GFF);
      const hoods = parseHoods(SAMPLE_HOODS);
      const proteinLinks = parseLinks(SAMPLE_PROTEIN_LINKS);
      const nucleotideLinks = parseNucleotideLinks(SAMPLE_NUCLEOTIDE_LINKS);
      const domainsByGene = parseDomains(SAMPLE_DOMAINS);
      const proteinMetadata = parseProteinMetadata(SAMPLE_PROTEIN_METADATA);
      const treeMetadata = parseTreeMetadata(SAMPLE_TREE_METADATA);
      return { gffFeatures, hoods, proteinLinks, nucleotideLinks, domainsByGene, proteinMetadata, treeMetadata };
    }, []);

    return (
      <HoodiniViz
        newickStr={SAMPLE_NEWICK}
        gffFeatures={data.gffFeatures}
        proteinLinks={data.proteinLinks}
        nucleotideLinks={data.nucleotideLinks}
        domainsByGene={data.domainsByGene}
        hoods={data.hoods}
        proteinMetadata={data.proteinMetadata}
        treeMetadata={data.treeMetadata}
        genePalette={{ type: 'qualitative', name: 'Set2', numColors: 8, enabled: true }}
        geneColorBy="cluster"
        domainPalette={{ type: 'qualitative', name: 'Set1', numColors: 9, enabled: true }}
        domainColorBy="domainName"
        proteinLinkConfig={{ colorBy: 'source_gene', useAlpha: true, minAlpha: 0, maxAlpha: 0.5 }}
        visibleGeneIds={null}
        showScrollbar={true}
        showRuler={true}
      />
    );
  },
};
