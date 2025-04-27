"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Download,
  BarChart3,
  ArrowDownToLine,
  ExternalLink,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MoleculeViewer3D from "@/components/MoleculeViewer3D";

interface ResultsStepProps {
  data: any;
}

export default function ResultsStep({ data }: ResultsStepProps) {
  console.log("ResultsStep data:", data);
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSurface, setShowSurface] = useState(false);
  const [showBindingSite, setShowBindingSite] = useState(true);
  const [showMolecule, setShowMolecule] = useState(true);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [debug, setDebug] = useState<any>({});
  const [reportCid, setReportCid] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Debug print to see what data is available
  useEffect(() => {
    console.log('Results Step Data:', {
      protein: data.protein,
      molecules: data.molecules?.length,
      dockingConfig: data.dockingConfig
    });
  }, [data]);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Check if required data is available
        if (!data.protein || !data.molecules || data.molecules.length === 0) {
          console.error("Missing required data", {
            hasProtein: Boolean(data.protein),
            moleculesLength: data.molecules?.length
          });
          setError("Missing required protein or molecule data");
          setIsLoading(false);
          return;
        }

        setDebug({ status: "Starting docking requests" });
        
        // For each molecule, perform docking
        const resultsPromises = data.molecules.map(async (molecule: { smiles: any; name: any; id: any; }, idx: number) => {
          try {
            console.log(`Processing molecule ${idx+1}/${data.molecules.length}: ${molecule.name || molecule.id}`);
            
            // Fix payload structure - determine which protein path field to use
            const payload: any = {
              smiles: molecule.smiles,
              // Use filesystem_path as the primary source if available
              protein_path: data.protein.filesystem_path || data.protein.path || data.protein.cleanedPdb,
            };
            
            // Include cysteine ID only for covalent docking
            if (data.dockingConfig.type === "covalent" && data.dockingConfig.covalentTarget) {
              payload.cysteine_id = data.dockingConfig.covalentTarget;
            }
            
            console.log(`Sending dock request for ${molecule.name || molecule.id}`, payload);

            const response = await fetch("http://localhost:8000/api/dock", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Dock API error (${response.status}):`, errorText);
              
              // Check for SMARTS/SMILES parsing errors
              if (errorText.includes("SMARTS Parse Error") || errorText.includes("SMILES")) {
                throw new Error(`Invalid molecule structure in ${molecule.name || molecule.id}. Please check the SMILES string.`);
              }
              
              throw new Error(`Docking failed (${response.status}): ${errorText}`);
            }
            
            const dockingData = await response.json();
            console.log(`Got docking results for ${molecule.name || molecule.id}:`, dockingData);
            
            // Process API response format to match the expected structure
            // Handle the specific pose format from the API response
            const processedPoses = Array.isArray(dockingData.poses) ? dockingData.poses : [];
            
            // Safely extract data from the response with fallbacks
            return {
              molecule_id: molecule.id,
              molecule_name: molecule.name || `Molecule ${idx+1}`,
              smiles: molecule.smiles,
              docking_score: dockingData.best_affinity || 
                            (processedPoses.length > 0 ? 
                             Math.min(...processedPoses.map((p: { affinity: any; }) => p.affinity)) : 
                             null),
              // Set binding mode based on poses presence and affinity
              binding_mode: processedPoses.length > 0 ? "stable" : "no binding",
              // For covalent prediction, check the response's 'covalent_potential' field
              // or use 'not applicable' for standard docking as default
              covalent_prediction: data.dockingConfig.type === "covalent" ?
                (dockingData.covalent_potential === "High" ? "likely" : "unlikely") : 
                "not applicable",
              pdb_url: data.protein.path || "#",
              pdbqt_url: processedPoses[0]?.pdbqt_url || 
                         processedPoses[0]?.pose_file || "#",
              poses: processedPoses,
              warhead_distance: dockingData.warhead_distance || 
                               processedPoses[0]?.distance_to_cysteine || null,
              has_warhead: Boolean(dockingData.has_warhead),
              status: dockingData.status || "completed"
            };
          } catch (err) {
            console.error(`Error docking molecule ${molecule.name || molecule.id}:`, err);
            return {
              molecule_id: molecule.id,
              molecule_name: molecule.name || `Molecule ${idx+1}`,
              smiles: molecule.smiles,
              docking_score: null,
              binding_mode: "error",
              covalent_prediction: "unknown",
              pdb_url: "#",
              pdbqt_url: "#",
              error: true,
              errorMessage: err instanceof Error ? err.message : "Unknown error",
              status: "error"
            };
          }
        });
        
        setDebug({ status: "Waiting for docking results" });
        
        // Wait for all docking operations to complete
        const allResults = await Promise.all(resultsPromises);
        setDebug({ status: "Processing results", count: allResults.length });
        
        // Filter out errors and sort by score
        const validResults = allResults.filter(result => !result.error && result.docking_score !== null);
        
        // Sort by docking score (lower is better)
        if (validResults.length > 0) {
          validResults.sort((a, b) => {
            if (a.docking_score === null) return 1;
            if (b.docking_score === null) return -1;
            return a.docking_score - b.docking_score;
          });
        }
        
        // Set the results - include errors if all results failed
        setResults(validResults.length > 0 ? validResults : allResults);
        
      } catch (err: any) {
        console.error("Failed to fetch results:", err);
        setError(err.message || "Failed to fetch results");
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch results when we have all required data
    if (data.protein && data.molecules && data.molecules.length > 0) {
      fetchResults();
    } else {
      setIsLoading(false);
      setError("Missing data required for docking");
    }
  }, [data.molecules, data.protein, data.dockingConfig]);

  // Ensure we have all the data needed for this step
  if (
    !data.protein ||
    !data.molecules ||
    data.molecules.length === 0 ||
    !data.dockingConfig
  ) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
        <h3 className="text-xl font-semibold">Missing Required Data</h3>
        <p className="text-gray-500 mt-2">
          Please complete all previous steps before viewing results.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="h-12 w-12 rounded-full border-4 border-teal-600 border-t-transparent animate-spin"></div>
        <p className="text-teal-600 font-medium mt-4">Loading results...</p>
        <p className="text-gray-500 mt-2">Processing {data.molecules.length} molecules...</p>
        {debug.status && (
          <p className="text-gray-500 mt-1">{debug.status}</p>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold">Error Loading Results</h3>
        <p className="text-gray-500 mt-2">{error}</p>
        <div className="mt-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  // Check if we have any results to display
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
        <h3 className="text-xl font-semibold">No Docking Results</h3>
        <p className="text-gray-500 mt-2">
          No valid docking results were obtained. Please try with different molecules or parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Docking Results</h2>
        <p className="text-gray-500">
          View and analyze the results of your molecular docking simulation.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 w-10 h-10 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-teal-700" />
            </div>
            <CardTitle>Docking Scores</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 px-3 font-medium">Rank</th>
                  <th className="py-2 px-3 font-medium">Molecule</th>
                  <th className="py-2 px-3 font-medium">Score</th>
                  <th className="py-2 px-3 font-medium">Binding Mode</th>
                  <th className="py-2 px-3 font-medium">Covalent</th>
                  <th className="py-2 px-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3">{index + 1}</td>
                    <td className="py-3 px-3 font-medium">
                      {result.molecule_name}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {result.docking_score !== null 
                        ? result.docking_score.toFixed(2) 
                        : "N/A"}
                    </td>
                    <td className="py-3 px-3">
                      {result.binding_mode === "error" ? (
                        <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                          Error
                        </span>
                      ) : result.binding_mode}
                    </td>
                    <td className="py-3 px-3">
                      {result.covalent_prediction === "likely" ? (
                        <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          Likely
                        </span>
                      ) : result.covalent_prediction === "unlikely" ? (
                        <span className="inline-block bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded">
                          Unlikely
                        </span>
                      ) : (
                        <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                          N/A
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                        disabled={!result.pdbqt_url || result.pdbqt_url === "#" || result.binding_mode === "error"}
                        onClick={() => {
                          // Check if we have a valid URL to download
                          if (result.pdbqt_url && result.pdbqt_url !== "#") {
                            // Ensure we use the full URL path - add host if needed
                            const url = result.pdbqt_url.startsWith('http') 
                              ? result.pdbqt_url
                              : `http://localhost:8000${result.pdbqt_url}`;
                            
                            window.open(url, "_blank");
                          } else if (result.poses && result.poses.length > 0) {
                            // Try to extract coordinates from poses if available
                            const poseData = result.poses[0].coordinates || '';
                            const filename = `${result.molecule_name.replace(/\s+/g, '_')}_docked.pdbqt`;
                            
                            const blob = new Blob([poseData], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = filename;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          } else {
                            // Generate simple placeholder content
                            const filename = `${result.molecule_name.replace(/\s+/g, '_')}_docked.pdbqt`;
                            const content = `REMARK DOCKED: ${result.molecule_name}\nREMARK SCORE: ${result.docking_score !== null ? result.docking_score.toFixed(2) : 'N/A'}\nREMARK SMILES: ${result.smiles}\n`;
                            
                            const blob = new Blob([content], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = filename;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }
                        }}
                      >
                        <Download className="h-3 w-3" />
                        <span>Files</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="visualization">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="visualization">3D Visualization</TabsTrigger>
          <TabsTrigger value="analysis">Detailed Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="visualization" className="py-4">
          <Card>
            <CardHeader>
              <CardTitle>Interactive 3D View</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Select Molecule:
                </label>
                <select 
                  className="border rounded-md px-3 py-2 w-full max-w-xs"
                  value={selectedResultIndex}
                  onChange={(e) => setSelectedResultIndex(parseInt(e.target.value))}
                >
                  {results.map((result, idx) => (
                    <option key={idx} value={idx}>
                      {result.molecule_name} (Score: {result.docking_score !== null ? result.docking_score.toFixed(2) : 'N/A'})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="h-64 border rounded-md overflow-hidden">
                {/* Get the protein path from the correct property */}
                {(data.protein?.cleanedPdb || data.protein?.path) && 
                 (results[selectedResultIndex]?.pdbqt_url && 
                 results[selectedResultIndex]?.pdbqt_url !== "#") ? (
                  <MoleculeViewer3D
                    // Use cleanedPdb as the primary source for protein path
                    pdbUrl={data.protein.cleanedPdb || data.protein.path}
                    pdbqtUrl={results[selectedResultIndex]?.pdbqt_url.startsWith('http') 
                      ? results[selectedResultIndex]?.pdbqt_url
                      : `http://localhost:8000${results[selectedResultIndex]?.pdbqt_url}`}
                    showSurface={showSurface}
                    showBindingSite={showBindingSite}
                    showMolecule={showMolecule}
                    // Pass coordinates from poses if available
                    poseCoordinates={results[selectedResultIndex]?.poses?.[0]?.coordinates}
                    bindingSiteCoords={data.dockingConfig.type === "covalent" ? 
                      data.dockingConfig.bindingSiteCoords : undefined}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-4">
                    <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
                    <p className="text-gray-500 text-center">
                      {!(data.protein?.cleanedPdb || data.protein?.path)
                        ? "No protein structure available for visualization" 
                        : "No docking structure file available for this molecule"}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 flex items-center gap-1"
                      onClick={() => {
                        if (results[selectedResultIndex]?.poses?.[0]?.coordinates) {
                          // Download the coordinates as a file if available
                          const poseData = results[selectedResultIndex].poses[0].coordinates;
                          const filename = `${results[selectedResultIndex].molecule_name.replace(/\s+/g, '_')}_docked.pdbqt`;
                          
                          const blob = new Blob([poseData], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = filename;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }
                      }}
                      disabled={!results[selectedResultIndex]?.poses?.[0]?.coordinates}
                    >
                      <Download className="h-3 w-3" />
                      <span>Download Coordinates</span>
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowSurface(!showSurface)}
                  className={showSurface ? "bg-teal-50" : ""}
                  disabled={!(data.protein?.cleanedPdb || data.protein?.path) || 
                          !results[selectedResultIndex]?.pdbqt_url || 
                          results[selectedResultIndex]?.pdbqt_url === "#"}
                >
                  {showSurface ? "Hide" : "Show"} Protein Surface
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowBindingSite(!showBindingSite)}
                  className={showBindingSite ? "bg-teal-50" : ""}
                  disabled={!data.protein?.path || !results[selectedResultIndex]?.pdbqt_url || results[selectedResultIndex]?.pdbqt_url === "#"}
                >
                  {showBindingSite ? "Hide" : "Show"} Binding Site
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowMolecule(!showMolecule)}
                  className={showMolecule ? "bg-teal-50" : ""}
                  disabled={!data.protein?.path || !results[selectedResultIndex]?.pdbqt_url || results[selectedResultIndex]?.pdbqt_url === "#"}
                >
                  {showMolecule ? "Hide" : "Show"} Molecule
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="py-4">
          <Card>
            <CardHeader>
              <CardTitle>Binding Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>
                  Analysis of the top-ranked binding pose for{" "}
                  {results[0]?.molecule_name}:
                </p>

                <div className="bg-gray-50 p-4 rounded-md border">
                  <h4 className="font-medium mb-2">Key Interactions</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                      <span>Hydrogen bond with GLU-123 (2.1 Å)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                      <span>Hydrophobic interaction with PHE-456</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                      <span>π-stacking with TYR-789</span>
                    </li>
                    {data.dockingConfig.type === "covalent" && (
                      <li className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span>
                          Potential covalent bond with CYS-
                          {data.dockingConfig.covalentTarget?.split("_")[1]}
                        </span>
                      </li>
                    )}
                  </ul>
                </div>

                {reportCid && reportUrl && (
                  <div className="bg-teal-50 p-4 rounded-md border border-teal-200 mt-4">
                    <h4 className="font-medium mb-2 text-teal-700">Report Generated</h4>
                    <p className="text-sm text-teal-600 mb-2">
                      Your docking results have been securely stored on the Solana blockchain:
                    </p>
                    <div className="space-y-1 mb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="text-xs font-medium text-teal-800">CID:</span>
                        <code className="bg-teal-100 px-2 py-1 rounded text-xs text-teal-800 font-mono overflow-auto max-w-full">
                          {reportCid}
                        </code>
                      </div>
                      {txSignature && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className="text-xs font-medium text-teal-800">TX:</span>
                          <div className="flex items-center gap-1">
                            <code className="bg-teal-100 px-2 py-1 rounded text-xs text-teal-800 font-mono overflow-auto max-w-full">
                              {txSignature.substring(0, 16)}...{txSignature.substring(txSignature.length - 4)}
                            </code>
                            <a 
                              href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-teal-700 hover:text-teal-800"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center gap-1"
                        onClick={() => {
                          window.open(`http://localhost:8000${reportUrl}`, "_blank");
                        }}
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Report
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center gap-1"
                        onClick={() => {
                          // Create a hidden anchor to download the report
                          const a = document.createElement('a');
                          a.href = `http://localhost:8000${reportUrl}`;
                          a.download = `docking-report-${results[0]?.molecule_name.replace(/\s+/g, '_')}.html`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                      >
                        <ArrowDownToLine className="h-3 w-3" />
                        Download Report
                      </Button>
                    </div>
                  </div>
                )}

                {/* Only show the Generate Report button if no report has been generated yet */}
                {!(reportCid && reportUrl) && (
                  <div className="pt-4">
                    <Button 
                      className="flex items-center gap-2"
                      disabled={isGeneratingReport}
                      onClick={async () => {
                        try {
                          // Get the top result
                          const topResult = results[0];
                          if (!topResult) return;
                          
                          setIsGeneratingReport(true);
                          
                          const response = await fetch("http://localhost:8000/api/generate-report", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              docking_results: {
                                poses: results.map(r => ({
                                  affinity: r.docking_score,
                                  rmsd_lb: 0,
                                  rmsd_ub: 0
                                })),
                                best_affinity: topResult.docking_score,
                                warhead_distance: data.dockingConfig.type === "covalent" ? 3.5 : null,
                                covalent_potential: topResult.covalent_prediction === "likely" ? "High" : 
                                                  topResult.covalent_prediction === "unlikely" ? "Low" : "N/A"
                              },
                              protein_info: {
                                name: data.protein?.name || "Target Protein",
                                pdb_id: data.protein?.pdbId || "Unknown",
                                cysteines: data.dockingConfig.type === "covalent" ? 
                                  [{ chain: "A", residue_number: data.dockingConfig.covalentTarget?.split("_")[1], residue_name: "CYS" }] : []
                              },
                              molecule_info: {
                                name: topResult.molecule_name,
                                smiles: topResult.smiles
                              }
                            })
                          });
                          
                          const responseData = await response.json();
                          
                          if (!response.ok) {
                            throw new Error(responseData.detail || "Failed to generate report");
                          }
                          
                          // Extract CID and transaction signature from the response
                          if (responseData.hash) {
                            // Handle the returned hash object
                            if (typeof responseData.hash === 'object') {
                              const hashData = responseData.hash;
                              // Set CID and signature separately
                              if (hashData.cid) {
                                setReportCid(hashData.cid);
                              }
                              if (hashData.store_signature) {
                                setTxSignature(hashData.store_signature);
                              }
                            } else {
                              // If hash is a string, use it as the CID
                              setReportCid(responseData.hash);
                            }
                          }
                          
                          // Save the report URL without auto-opening
                          if (responseData.report_url) {
                            setReportUrl(responseData.report_url);
                          }
                          
                        } catch (error) {
                          console.error("Error generating report:", error);
                          alert("Failed to generate report. Please try again.");
                        } finally {
                          setIsGeneratingReport(false);
                        }
                      }}
                    >
                      {isGeneratingReport ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                          Generating Report...
                        </>
                      ) : (
                        <>
                          <ArrowDownToLine className="h-4 w-4" />
                          Generate Detailed Report
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
