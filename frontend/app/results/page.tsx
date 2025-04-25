"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import MoleculeViewer3D from "../../components/MoleculeViewer3D";
import MoleculeViewerControls from "../../components/MoleculeViewerControls";
import DockingResultsTable from "../../components/DockingResultsTable";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { AlertCircle, Check, BarChart } from "lucide-react";

interface DockingResults {
  poses?: Array<{
    pose_id: number;
    pdbqt_url: string;
    affinity?: number;
    rmsd_lb?: number;
    rmsd_ub?: number;
    // Add other properties as needed
  }>;
  protein_info?: {
    cysteines: Array<any>;
    // Add other properties as needed
  };
  molecule_info?: {
    name: string;
    // Add other properties as needed
  };
  binding_site_coords?: any;
  best_affinity?: number;
  warhead_distance?: number;
  covalent_potential?: string;
  recommendations?: string[];
}

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DockingResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [showSurface, setShowSurface] = useState(false);
  const [showBindingSite, setShowBindingSite] = useState(true);
  const [showMolecule, setShowMolecule] = useState(true);
  
  // Get parameters from URL
  const smiles = searchParams.get("smiles");
  const proteinUrl = searchParams.get("protein");
  const cysteineId = searchParams.get("cysteine");
  
  useEffect(() => {
    if (!smiles || !proteinUrl) {
      setError("Missing required parameters");
      return;
    }
    
    const fetchDockingResults = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Call docking endpoint
        const response = await fetch("http://localhost:8000/api/dock", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            smiles: smiles,
            protein_path: proteinUrl,
            cysteine_id: cysteineId
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.detail || "Failed to perform docking");
        }
        
        setResults(data);
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    
    fetchDockingResults();
  }, [smiles, proteinUrl, cysteineId]);
  
  const handleDownloadReport = async () => {
    if (!results) return;
    
    try {
      const response = await fetch("http://localhost:8000/api/generate-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          docking_results: results,
          protein_info: {
            name: "Target Protein",
            pdb_id: proteinUrl?.split("/")?.pop()?.split(".")[0] || "Unknown",
            cysteines: results.protein_info?.cysteines || []
          },
          molecule_info: {
            name: results.molecule_info?.name || "Query Molecule",
            smiles: smiles
          }
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || "Failed to generate report");
      }
      
      // Open the report URL in a new tab
      window.open(`http://localhost:8000${data.report_url}`, "_blank");
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    }
  };
  
  if (loading) {
    return <div className="flex-1 flex items-center justify-center p-8">Loading docking results...</div>;
  }
  
  if (error) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 p-4 rounded-md flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!results) {
    return <div className="flex-1 p-8">No results available</div>;
  }
  
  return (
    <div className="flex-1 container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Docking Results</h1>
        
        <div className="mb-6">
          <MoleculeViewerControls
            showSurface={showSurface}
            setShowSurface={setShowSurface}
            showBindingSite={showBindingSite}
            setShowBindingSite={setShowBindingSite}
            showMolecule={showMolecule}
            setShowMolecule={setShowMolecule}
            onDownloadReport={handleDownloadReport}
          />
          
          <div className="border rounded-md overflow-hidden">
            <MoleculeViewer3D
              pdbUrl={proteinUrl || undefined}
              pdbqtUrl={results.poses?.[0]?.pdbqt_url}
              showSurface={showSurface}
              showBindingSite={showBindingSite}
              showMolecule={showMolecule}
              bindingSiteCoords={results.binding_site_coords}
            />
          </div>
        </div>
        
        <Tabs defaultValue="docking">
          <TabsList className="mb-4">
            <TabsTrigger value="docking">Docking Results</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="docking">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-teal-600" />
                  <span>Docking Scores</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DockingResultsTable poses={(results.poses || []).map(pose => ({
                  ...pose,
                  affinity: pose.affinity ?? 0,
                  rmsd_lb: pose.rmsd_lb ?? 0,
                  rmsd_ub: pose.rmsd_ub ?? 0
                }))} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analysis">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-teal-600" />
                  <span>Binding Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-md bg-teal-50">
                    <h3 className="font-semibold text-teal-700 mb-2">Binding Summary</h3>
                    <ul className="space-y-2">
                      <li className="flex justify-between">
                        <span>Best Binding Affinity:</span>
                        <span className="font-mono">{results.best_affinity?.toFixed(2) || 'N/A'} kcal/mol</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Warhead Distance:</span>
                        <span className="font-mono">{results.warhead_distance?.toFixed(2) || 'N/A'} Å</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Covalent Binding Potential:</span>
                        <span className={`font-medium ${
                          results.covalent_potential === 'High' ? 'text-green-600' :
                          results.covalent_potential === 'Medium' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {results.covalent_potential || 'Unknown'}
                        </span>
                      </li>
                    </ul>
                  </div>
                  
                  {results.recommendations && results.recommendations.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Recommendations</h3>
                      <ul className="space-y-1 list-disc list-inside">
                        {results.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
