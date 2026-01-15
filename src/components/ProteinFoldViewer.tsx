import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProteinViewer from './ProteinViewer3DMol';
import ErrorBoundary from './ErrorBoundary';

// Constants for folding services
const ESMFOLD_MAX_LENGTH = 400; // ESMFold limit for public API
const ESMFOLD_API_URL = 'https://api.esmatlas.com/foldSequence/v1/pdb/';
const BOLTZ2_API_URL = 'https://health.api.nvidia.com/v1/biology/mit/boltz2/predict';
const NVIDIA_API_KEY_STORAGE = 'hoodini_nvidia_api_key';

// Viridis color palette interpolation function
const getViridisColor = (value) => {
  // Normalize value to 0-1 range
  const t = Math.max(0, Math.min(1, value / 100));
  
  // Viridis color interpolation (approximate values)
  const colors = [
    [68, 1, 84],    // Dark purple (0%)
    [59, 82, 139],  // Blue-purple (25%)
    [33, 144, 140], // Teal (50%)
    [93, 201, 99],  // Green (75%)
    [253, 231, 37]  // Yellow (100%)
  ];
  
  const scaledT = t * (colors.length - 1);
  const index = Math.floor(scaledT);
  const fraction = scaledT - index;
  
  if (index >= colors.length - 1) {
    return `rgb(${colors[colors.length - 1].join(', ')})`;
  }
  
  const [r1, g1, b1] = colors[index];
  const [r2, g2, b2] = colors[index + 1];
  
  const r = Math.round(r1 + (r2 - r1) * fraction);
  const g = Math.round(g1 + (g2 - g1) * fraction);
  const b = Math.round(b1 + (b2 - b1) * fraction);
  
  return `rgb(${r}, ${g}, ${b})`;
};

// Generate realistic PDB structure
const generateMockPDB = (sequence) => {
  
  let pdb = `HEADER    MOCK PROTEIN                            01-JAN-25   MOCK            \n`;
  pdb += `TITLE     AI-GENERATED PROTEIN STRUCTURE                                     \n`;
  pdb += `REMARK   2 RESOLUTION.    2.50 ANGSTROMS.                                   \n`;
  
  // Generate protein backbone coordinates for the full sequence (or reasonable subset)
  const numResidues = Math.min(sequence.length, 150); // Reasonable size for visualization
  
  for (let i = 0; i < numResidues; i++) {
    // Get the actual amino acid from the sequence, or default to Alanine
    let residue = 'ALA'; // Default to full 3-letter code
    if (i < sequence.length) {
      const singleLetter = sequence[i].toUpperCase();
      // Convert single letter to 3-letter amino acid code
      const aaMap = {
        'A': 'ALA', 'C': 'CYS', 'D': 'ASP', 'E': 'GLU', 'F': 'PHE',
        'G': 'GLY', 'H': 'HIS', 'I': 'ILE', 'K': 'LYS', 'L': 'LEU',
        'M': 'MET', 'N': 'ASN', 'P': 'PRO', 'Q': 'GLN', 'R': 'ARG',
        'S': 'SER', 'T': 'THR', 'V': 'VAL', 'W': 'TRP', 'Y': 'TYR'
      };
      residue = aaMap[singleLetter] || 'ALA';
    }
    
    const resNum = i + 1;
    const atomNum = i * 4 + 1;
    
    // Create a mixed structure: helix for first part, extended for rest
    let x, y, z;
    
    if (i < numResidues * 0.6) {
      // Alpha helix coordinates
      const t = (i * 2 * Math.PI) / 3.6; // 3.6 residues per turn
      x = 5.0 * Math.cos(t);
      y = 5.0 * Math.sin(t);
      z = i * 1.5; // 1.5Å rise per residue
    } else {
      // Extended strand
      const offset = numResidues * 0.6;
      x = (i - offset) * 3.8;
      y = 10 + Math.sin((i - offset) * 0.5) * 2;
      z = offset * 1.5;
    }
    
    // Backbone atoms with proper PDB formatting
    const nX = (x - 0.5).toFixed(3);
    const nY = (y - 0.8).toFixed(3);
    const nZ = (z - 0.3).toFixed(3);
    const caX = x.toFixed(3);
    const caY = y.toFixed(3);
    const caZ = z.toFixed(3);
    const cX = (x + 1.2).toFixed(3);
    const cY = (y + 0.3).toFixed(3);
    const cZ = z.toFixed(3);
    const oX = (x + 2.0).toFixed(3);
    const oY = (y - 0.5).toFixed(3);
    const oZ = z.toFixed(3);
    
    pdb += `ATOM  ${atomNum.toString().padStart(5)} N   ${residue} A${resNum.toString().padStart(4)}    ${nX.padStart(8)}${nY.padStart(8)}${nZ.padStart(8)}  1.00 20.00           N  \n`;
    pdb += `ATOM  ${(atomNum + 1).toString().padStart(5)} CA  ${residue} A${resNum.toString().padStart(4)}    ${caX.padStart(8)}${caY.padStart(8)}${caZ.padStart(8)}  1.00 15.00           C  \n`;
    pdb += `ATOM  ${(atomNum + 2).toString().padStart(5)} C   ${residue} A${resNum.toString().padStart(4)}    ${cX.padStart(8)}${cY.padStart(8)}${cZ.padStart(8)}  1.00 18.00           C  \n`;
    pdb += `ATOM  ${(atomNum + 3).toString().padStart(5)} O   ${residue} A${resNum.toString().padStart(4)}    ${oX.padStart(8)}${oY.padStart(8)}${oZ.padStart(8)}  1.00 22.00           O  \n`;
  }
  
  pdb += `END                                                                          \n`;
  return pdb;
};

const ProteinFoldViewer = ({ sequence, onClose }) => {
  const [foldingStatus, setFoldingStatus] = useState('idle'); // idle, folding, success, error, needsApiKey
  const [foldedStructure, setFoldedStructure] = useState(null);
  const [error, setError] = useState(null);
  const [nvidiaApiKey, setNvidiaApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [foldingMethod, setFoldingMethod] = useState<'esmfold' | 'boltz2' | null>(null);

  // Load saved API key on mount
  useEffect(() => {
    const savedKey = localStorage.getItem(NVIDIA_API_KEY_STORAGE);
    if (savedKey) {
      setNvidiaApiKey(savedKey);
    }
  }, []);

  // Determine which method to use based on sequence length
  const getRecommendedMethod = () => {
    if (!sequence) return null;
    return sequence.length <= ESMFOLD_MAX_LENGTH ? 'esmfold' : 'boltz2';
  };

  const needsBoltz2 = sequence && sequence.length > ESMFOLD_MAX_LENGTH;

  // Save API key to localStorage
  const saveApiKey = () => {
    if (nvidiaApiKey.trim()) {
      localStorage.setItem(NVIDIA_API_KEY_STORAGE, nvidiaApiKey.trim());
      setShowApiKeyInput(false);
    }
  };

  // Clear saved API key
  const clearApiKey = () => {
    localStorage.removeItem(NVIDIA_API_KEY_STORAGE);
    setNvidiaApiKey('');
  };

  // Fold with ESMFold (for sequences ≤400 aa)
  const foldWithESMFold = async (seq: string) => {
    const response = await fetch(ESMFOLD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: seq,
    });

    if (!response.ok) {
      throw new Error(`ESMFold API error: ${response.status} ${response.statusText}`);
    }

    const pdbData = await response.text();
    
    // Extract pLDDT from B-factor column (ESMFold stores confidence there)
    // Average the B-factors to get overall confidence
    const bFactors: number[] = [];
    const lines = pdbData.split('\n');
    for (const line of lines) {
      if (line.startsWith('ATOM') && line.length >= 66) {
        const bFactor = parseFloat(line.substring(60, 66).trim());
        if (!isNaN(bFactor)) {
          bFactors.push(bFactor);
        }
      }
    }
    const avgConfidence = bFactors.length > 0 
      ? bFactors.reduce((a, b) => a + b, 0) / bFactors.length / 100 
      : 0.5;

    return {
      pdb: pdbData,
      confidence: avgConfidence,
      sequenceLength: seq.length,
      method: 'ESMFold'
    };
  };

  // Fold with Boltz2 (for sequences >400 aa, requires NVIDIA API key)
  const foldWithBoltz2 = async (seq: string, apiKey: string) => {
    const payload = {
      polymers: [
        {
          id: "A",
          molecule_type: "protein",
          sequence: seq,
          msa: {
            uniref90: {
              a3m: {
                alignment: `>seq1\n${seq}`,
                format: "a3m"
              }
            }
          }
        }
      ],
      recycling_steps: 1,
      sampling_steps: 50,
      diffusion_samples: 1,
      step_scale: 1.2,
      without_potentials: true
    };

    const response = await fetch(BOLTZ2_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'NVCF-POLL-SECONDS': '300',
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid or expired NVIDIA API key. Please check your credentials.');
    }

    if (response.status === 202) {
      // Task queued - need to poll for results
      const reqId = response.headers.get('nvcf-reqid');
      throw new Error(`Task queued for processing. Request ID: ${reqId}. Please try again in a few minutes.`);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Boltz2 API error: ${response.status} - ${errorData.detail || response.statusText}`);
    }

    const result = await response.json();
    
    // Extract PDB from response
    if (!result.structures || result.structures.length === 0) {
      throw new Error('No structures returned from Boltz2');
    }

    const structure = result.structures[0];
    const pdbData = structure.structure || structure.pdb;
    
    // Get confidence from response
    const confidence = result.confidence_scores && result.confidence_scores.length > 0
      ? result.confidence_scores[0]
      : 0.7;

    return {
      pdb: pdbData,
      confidence: confidence,
      sequenceLength: seq.length,
      method: 'Boltz2 (NVIDIA)'
    };
  };

  const handleFoldProtein = async () => {
    if (!sequence || sequence.length < 10) {
      setError('Sequence too short for folding (minimum 10 residues)');
      return;
    }

    const method = getRecommendedMethod();
    
    // Check if we need API key for Boltz2
    if (method === 'boltz2' && !nvidiaApiKey) {
      setFoldingStatus('needsApiKey');
      setShowApiKeyInput(true);
      return;
    }

    setFoldingStatus('folding');
    setFoldingMethod(method);
    setError(null);

    try {
      let structure;
      
      if (method === 'esmfold') {
        structure = await foldWithESMFold(sequence);
      } else {
        structure = await foldWithBoltz2(sequence, nvidiaApiKey);
      }

      setFoldedStructure(structure);
      setFoldingStatus('success');
    } catch (err) {
      console.error('Folding error:', err);
      setError(err.message || 'Failed to fold protein structure');
      setFoldingStatus('error');
    }
  };

  const resetViewer = () => {
    setFoldingStatus('idle');
    setFoldedStructure(null);
    setError(null);
    setFoldingMethod(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-card rounded-lg border shadow-sm">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Protein Structure Prediction</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Predict 3D protein structure using ESMFold or Boltz2
              </p>
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ✕
              </Button>
            )}
          </div>
        </div>

        {/* Sequence Display */}
        <div className="p-4 border-b bg-muted/20">
          <h3 className="text-sm font-medium mb-2">Input Sequence</h3>
          <div className="bg-background rounded border p-3 text-sm font-mono">
            {sequence ? (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-muted-foreground">
                    Length: {sequence.length} amino acids
                  </span>
                  {needsBoltz2 ? (
                    <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                      Boltz2 required (&gt;{ESMFOLD_MAX_LENGTH} aa)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      ESMFold compatible
                    </Badge>
                  )}
                </div>
                <p className="break-all">
                  {sequence.substring(0, 100)}
                  {sequence.length > 100 && (
                    <span className="text-muted-foreground">... +{sequence.length - 100} more</span>
                  )}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No sequence provided</p>
            )}
          </div>
        </div>

        {/* API Key Section (for Boltz2) */}
        {needsBoltz2 && (
          <div className="p-4 border-b bg-purple-50 dark:bg-purple-950/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">NVIDIA API Key (required for Boltz2)</h3>
              {nvidiaApiKey && !showApiKeyInput && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    ✓ Key saved
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setShowApiKeyInput(true)}>
                    Change
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearApiKey} className="text-destructive">
                    Clear
                  </Button>
                </div>
              )}
            </div>
            
            {(!nvidiaApiKey || showApiKeyInput) && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="nvapi-..."
                    value={nvidiaApiKey}
                    onChange={(e) => setNvidiaApiKey(e.target.value)}
                    className="flex-1 font-mono text-sm"
                  />
                  <Button onClick={saveApiKey} disabled={!nvidiaApiKey.trim()}>
                    Save Key
                  </Button>
                  {showApiKeyInput && (
                    <Button variant="outline" onClick={() => setShowApiKeyInput(false)}>
                      Cancel
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your API key from{' '}
                  <a 
                    href="https://build.nvidia.com/mit/boltz2" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline hover:no-underline"
                  >
                    NVIDIA Build
                  </a>
                  . Your key is stored locally in your browser.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleFoldProtein} 
              disabled={!sequence || foldingStatus === 'folding'}
              className="min-w-32"
            >
              {foldingStatus === 'folding' && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
              )}
              {foldingStatus === 'folding' ? 'Folding...' : 'Fold Protein'}
            </Button>
            
            {foldedStructure && (
              <Button variant="outline" onClick={resetViewer}>
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="p-4">
          {foldingStatus === 'idle' && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Click "Fold Protein" to predict the 3D structure</p>
              {needsBoltz2 && (
                <p className="text-xs mt-2">
                  This protein requires Boltz2 (NVIDIA) due to its length ({sequence?.length} aa &gt; {ESMFOLD_MAX_LENGTH})
                </p>
              )}
            </div>
          )}

          {foldingStatus === 'needsApiKey' && (
            <div className="text-center py-8">
              <div className="text-amber-500 mb-2">🔑 API Key Required</div>
              <p className="text-sm text-muted-foreground">
                This protein is too long for ESMFold ({sequence?.length} aa &gt; {ESMFOLD_MAX_LENGTH}).
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Please enter your NVIDIA API key above to use Boltz2.
              </p>
            </div>
          )}

          {foldingStatus === 'folding' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                Predicting protein structure with {foldingMethod === 'boltz2' ? 'Boltz2 (NVIDIA)' : 'ESMFold'}...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {foldingMethod === 'boltz2' 
                  ? 'This may take up to a few minutes for large proteins'
                  : 'This may take a few seconds'}
              </p>
            </div>
          )}

          {foldingStatus === 'error' && (
            <div className="text-center py-8">
              <div className="text-destructive mb-2">⚠ Error</div>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          )}

          {foldingStatus === 'success' && foldedStructure && (
            <div className="space-y-4">
              {/* Structure Info */}
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Predicted Structure</h3>
                <Badge 
                  variant="outline" 
                  className="text-xs font-medium text-white border-0" 
                  style={{ 
                    backgroundColor: getViridisColor(foldedStructure.confidence * 100),
                    color: foldedStructure.confidence * 100 > 50 ? '#000' : '#fff'
                  }}
                >
                  Confidence: {(foldedStructure.confidence * 100).toFixed(0)}%
                </Badge>
              </div>

              {/* 3D Viewer */}
              <ErrorBoundary>
                <ProteinViewer 
                  key={`esmfold-${foldedStructure.sequenceLength}-${foldedStructure.confidence}`}
                  pdbData={foldedStructure.pdb}
                  confidence={foldedStructure.confidence}
                  sequenceLength={foldedStructure.sequenceLength}
                  className="w-full"
                />
              </ErrorBoundary>

              {/* Structure Details */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Structure predicted using {foldedStructure.method} • {foldedStructure.sequenceLength} residues</p>
                <p>Confidence score indicates the reliability of the predicted structure</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProteinFoldViewer;
