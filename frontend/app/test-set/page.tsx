"use client";

import { useEffect, useState } from "react";
import { 
  ArrowRight, 
  AlertCircle, 
  FlaskRoundIcon as Flask, 
  Download,
  FileCode,
  Loader2,
  Database,
  BeakerIcon
} from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

interface Molecule {
  name: string;
  smiles: string;
  pdb_url?: string;
  pdbqt_url?: string;
  error?: string;
  [key: string]: any;
}

export default function TestSetPage() {
  const [testMolecules, setTestMolecules] = useState<Record<string, any>>({});
  const [processedMolecules, setProcessedMolecules] = useState<Molecule[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the test set on component mount
    fetchTestSet();
  }, []);

  const fetchTestSet = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "http://localhost:8000/api/library/test-set"
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to fetch test set");
      }

      setTestMolecules(data.molecules);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const processTestSet = async () => {
    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(
        "http://localhost:8000/api/library/process-test-set"
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to process test set");
      }

      setProcessedMolecules(data.molecules);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-white">
        <div className="container flex h-16 items-center">
          <div className="flex items-center gap-2">
            <BeakerIcon className="h-6 w-6 text-teal-600" />
            <span className="text-xl font-bold">Test Molecule Library</span>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-2 text-center mb-8">
            <div className="inline-block rounded-lg bg-teal-100 px-3 py-1 text-sm text-teal-700">
              Validation Dataset
            </div>
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Test Molecules Library
            </h1>
            <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed mx-auto">
              Pre-curated set of molecules for benchmarking and validation
            </p>
          </div>

          <Card className="mb-8 border-2 border-teal-100">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-teal-100 w-10 h-10 rounded-lg flex items-center justify-center">
                    <Database className="h-5 w-5 text-teal-700" />
                  </div>
                  <CardTitle>Available Test Set</CardTitle>
                </div>
                <Button 
                  onClick={processTestSet}
                  disabled={
                    processing || loading || Object.keys(testMolecules).length === 0
                  }
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Process All Molecules
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 text-teal-600 animate-spin mr-2" />
                  <p className="text-teal-600 font-medium">Loading test set...</p>
                </div>
              ) : error ? (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              ) : Object.keys(testMolecules).length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 mb-4">
                    {Object.keys(testMolecules).length} molecules available in the test library
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(testMolecules).map(([name, molecule]) => (
                      <Card key={name} className="border-2 border-teal-50 hover:border-teal-100 transition-colors">
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-2">
                            <div className="bg-teal-50 w-8 h-8 rounded-lg flex items-center justify-center">
                              <Flask className="h-4 w-4 text-teal-700" />
                            </div>
                            <CardTitle className="text-lg">{name}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm font-mono break-all mt-1 bg-gray-50 p-2 rounded border">
                            {(molecule as any).smiles}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                    <Database className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">No Test Molecules</h3>
                  <p className="text-gray-500 max-w-md">
                    No test molecules are available in the library. Please check back later or contact the system administrator.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {processedMolecules.length > 0 && (
            <div className="space-y-4 mb-8">
              <h2 className="text-2xl font-bold">Processed Results</h2>
              <p className="text-gray-500 mb-4">
                {processedMolecules.length} molecule{processedMolecules.length !== 1 && 's'} successfully processed
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {processedMolecules.map((molecule, index) => (
                  <Card key={index} className="border-2 border-teal-100 hover:border-teal-200 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-teal-100 w-8 h-8 rounded-lg flex items-center justify-center">
                          <FileCode className="h-4 w-4 text-teal-700" />
                        </div>
                        <CardTitle className="text-lg">{molecule.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-mono break-all mt-1 bg-gray-50 p-2 rounded border">
                        {molecule.smiles}
                      </p>

                      {molecule.error ? (
                        <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded flex items-center gap-2">
                          <AlertCircle className="h-5 w-5" />
                          <span>{molecule.error}</span>
                        </div>
                      ) : (
                        <div className="mt-4 flex gap-3">
                          <Button 
                            variant="outline"
                            className="text-teal-600 border-teal-200 hover:bg-teal-50 flex items-center gap-2"
                            asChild
                          >
                            <a 
                              href={`http://localhost:8000${molecule.pdb_url}`}
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
                              href={`http://localhost:8000${molecule.pdbqt_url}`}
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
                ))}
              </div>
            </div>
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
