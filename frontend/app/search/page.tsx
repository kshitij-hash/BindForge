"use client";

import { useState } from "react";
import {
  ArrowRight,
  AlertCircle,
  Search,
  Download,
  FlaskRoundIcon as Flask,
  FileCode,
  Database
} from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

interface Compound {
  name: string;
  smiles: string;
  molecular_weight?: string;
  molecular_formula?: string;
  pubchem_cid?: string;
  [key: string]: any;
}

export default function SearchPage() {
  const [results, setResults] = useState<Compound[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompound, setSelectedCompound] = useState<Compound | null>(
    null
  );
  const [processingSmiles, setProcessingSmiles] = useState(false);
  const [processedResult, setProcessedResult] = useState<any | null>(null);

  const searchPubChem = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:8000/api/search/pubchem");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to search PubChem");
      }

      setResults(data.molecules);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const processCompound = async (compound: Compound) => {
    setSelectedCompound(compound);
    setProcessingSmiles(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:8000/api/process-smiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          smiles: compound.smiles,
          name: compound.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to process compound");
      }

      setProcessedResult(data.molecules[0]);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setProcessingSmiles(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-white">
        <div className="container flex h-16 items-center">
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-teal-600" />
            <span className="text-xl font-bold">Compound Search</span>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-2 text-center mb-8">
            <div className="inline-block rounded-lg bg-teal-100 px-3 py-1 text-sm text-teal-700">
              Database Integration
            </div>
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Search PubChem Database
            </h1>
            <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed mx-auto">
              Find and process molecules from the PubChem database for your docking studies
            </p>
          </div>

          <Card className="mb-8 border-2 border-teal-100">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-teal-100 w-10 h-10 rounded-lg flex items-center justify-center">
                    <Search className="h-5 w-5 text-teal-700" />
                  </div>
                  <CardTitle>MK2 Inhibitors Search</CardTitle>
                </div>
                <Button 
                  onClick={searchPubChem} 
                  disabled={loading}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {loading ? "Searching..." : "Search PubChem"}
                  {!loading && <Search className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                This search will query PubChem for known MK2 inhibitors and retrieve their molecular structures.
              </p>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {results.length > 0 && (
            <div className="space-y-4 mb-8">
              <h2 className="text-2xl font-bold">Search Results</h2>
              <p className="text-gray-500">
                Found {results.length} compound{results.length !== 1 && "s"} in PubChem database
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((compound, index) => (
                  <Card 
                    key={index} 
                    className={`border-2 ${
                      selectedCompound === compound 
                        ? "border-teal-500 ring-2 ring-teal-100" 
                        : "border-teal-100 hover:border-teal-200"
                    } transition-colors`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="bg-teal-100 w-8 h-8 rounded-lg flex items-center justify-center">
                            <Flask className="h-4 w-4 text-teal-700" />
                          </div>
                          <CardTitle className="text-lg">{compound.name}</CardTitle>
                        </div>
                        {compound.pubchem_cid && (
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            CID: {compound.pubchem_cid}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-mono break-all mt-1 bg-gray-50 p-2 rounded border">
                        {compound.smiles}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                        {compound.molecular_weight && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">MW:</span>
                            <span>{compound.molecular_weight}</span>
                          </div>
                        )}
                        {compound.molecular_formula && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Formula:</span>
                            <span>{compound.molecular_formula}</span>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => processCompound(compound)}
                        disabled={processingSmiles && selectedCompound === compound}
                        className="mt-4 bg-teal-600 hover:bg-teal-700 text-white w-full"
                        size="sm"
                      >
                        {processingSmiles && selectedCompound === compound
                          ? "Processing..."
                          : "Process Structure"}
                        {!(processingSmiles && selectedCompound === compound) && 
                          <FileCode className="ml-2 h-4 w-4" />
                        }
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {processedResult && (
            <Card className="mb-8 border-2 border-teal-300">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-teal-100 w-10 h-10 rounded-lg flex items-center justify-center">
                    <FileCode className="h-5 w-5 text-teal-700" />
                  </div>
                  <CardTitle>Processed Structure: {processedResult.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-mono break-all mt-1 bg-gray-50 p-2 rounded border">
                  {processedResult.smiles}
                </p>

                {processedResult.error ? (
                  <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>{processedResult.error}</span>
                  </div>
                ) : (
                  <div className="mt-4 flex gap-3">
                    <Button 
                      variant="outline"
                      className="text-teal-600 border-teal-200 hover:bg-teal-50 flex items-center gap-2"
                      asChild
                    >
                      <a 
                        href={`http://localhost:8000${processedResult.pdb_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-4 w-4" />
                        Download PDB
                      </a>
                    </Button>
                    <Button 
                      variant="outline"
                      className="text-teal-600 border-teal-200 hover:bg-teal-50 flex items-center gap-2"
                      asChild
                    >
                      <a 
                        href={`http://localhost:8000${processedResult.pdbqt_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-4 w-4" />
                        Download PDBQT
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 bg-white border-t mt-auto">
        <div className="container flex justify-center">
          <p className="text-sm text-gray-500">
            © 2025 BindForge Biotechnology
          </p>
        </div>
      </footer>
    </div>
  );
}
