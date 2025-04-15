"use client";

import { useState } from "react";
import { ArrowRight, FlaskRoundIcon as Flask, FileCode, Code2, AlertCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

type ProcessingMode = "smiles" | "sdf" | "batch";

interface MoleculeResult {
  name: string;
  smiles: string;
  pdb_url?: string;
  pdbqt_url?: string;
  error?: string;
}

export default function MoleculesPage() {
  const [mode, setMode] = useState<ProcessingMode>("smiles");
  const [smiles, setSmiles] = useState("");
  const [moleculeName, setMoleculeName] = useState("");
  const [batchSmiles, setBatchSmiles] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MoleculeResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processSingleSmiles = async () => {
    if (!smiles.trim()) {
      setError("Please enter a SMILES string");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:8000/api/process-smiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          smiles: smiles,
          name: moleculeName || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to process SMILES");
      }

      setResults(data.molecules);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const processBatchSmiles = async () => {
    if (!batchSmiles.trim()) {
      setError("Please enter SMILES strings");
      return;
    }

    const smilesList = batchSmiles
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    if (smilesList.length === 0) {
      setError("No valid SMILES strings found");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "http://localhost:8000/api/batch-process-smiles",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            smiles_list: smilesList,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to process batch SMILES");
      }

      setResults(data.molecules);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const processSdf = async () => {
    if (!file) {
      setError("Please select an SDF file");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/api/process-sdf", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to process SDF file");
      }

      setResults(data.molecules);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    switch (mode) {
      case "smiles":
        await processSingleSmiles();
        break;
      case "batch":
        await processBatchSmiles();
        break;
      case "sdf":
        await processSdf();
        break;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-white">
        <div className="container flex h-16 items-center">
          <div className="flex items-center gap-2">
            <Flask className="h-6 w-6 text-teal-600" />
            <span className="text-xl font-bold">Molecule Processing</span>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-2 text-center mb-8">
            <div className="inline-block rounded-lg bg-teal-100 px-3 py-1 text-sm text-teal-700">
              Molecular Structure
            </div>
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Process Molecules
            </h1>
            <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed mx-auto">
              Convert SMILES strings or SDF files into 3D structures for docking simulations
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <div className="flex border-b">
                <button
                  className={`py-2 px-4 flex items-center gap-2 ${
                    mode === "smiles"
                      ? "border-b-2 border-teal-500 font-medium text-teal-600"
                      : ""
                  }`}
                  onClick={() => setMode("smiles")}
                >
                  <Code2 className="h-4 w-4" />
                  Single SMILES
                </button>
                <button
                  className={`py-2 px-4 flex items-center gap-2 ${
                    mode === "batch" 
                      ? "border-b-2 border-teal-500 font-medium text-teal-600" 
                      : ""
                  }`}
                  onClick={() => setMode("batch")}
                >
                  <Code2 className="h-4 w-4" />
                  Batch SMILES
                </button>
                <button
                  className={`py-2 px-4 flex items-center gap-2 ${
                    mode === "sdf" 
                      ? "border-b-2 border-teal-500 font-medium text-teal-600" 
                      : ""
                  }`}
                  onClick={() => setMode("sdf")}
                >
                  <FileCode className="h-4 w-4" />
                  SDF File
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "smiles" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SMILES String
                      </label>
                      <input
                        type="text"
                        value={smiles}
                        onChange={(e) => setSmiles(e.target.value)}
                        placeholder="Enter SMILES string"
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-teal-300 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Molecule Name (optional)
                      </label>
                      <input
                        type="text"
                        value={moleculeName}
                        onChange={(e) => setMoleculeName(e.target.value)}
                        placeholder="Enter molecule name"
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-teal-300 focus:outline-none"
                      />
                    </div>
                  </>
                )}

                {mode === "batch" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMILES Strings (one per line)
                    </label>
                    <textarea
                      value={batchSmiles}
                      onChange={(e) => setBatchSmiles(e.target.value)}
                      placeholder="Enter SMILES strings (one per line)"
                      rows={8}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-teal-300 focus:outline-none"
                    />
                  </div>
                )}

                {mode === "sdf" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SDF File
                    </label>
                    <input
                      type="file"
                      accept=".sdf"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-teal-50 file:text-teal-700
                        hover:file:bg-teal-100"
                    />
                  </div>
                )}

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {loading ? "Processing..." : "Process Molecule(s)"}
                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </div>
              </form>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {results.length > 0 && (
            <div className="space-y-2 mb-6">
              <h2 className="text-2xl font-bold">Results</h2>
              <p className="text-gray-500">
                {results.length} molecule{results.length !== 1 && "s"} processed
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {results.map((result, index) => (
                  <Card key={index} className="border-2 border-teal-100 hover:border-teal-200 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="bg-teal-100 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
                        <Flask className="h-5 w-5 text-teal-700" />
                      </div>
                      <CardTitle>{result.name || `Molecule ${index + 1}`}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-mono break-all mt-1 bg-gray-50 p-2 rounded border">
                        {result.smiles}
                      </p>

                      {result.error ? (
                        <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded flex items-center gap-2">
                          <AlertCircle className="h-5 w-5" />
                          <span>{result.error}</span>
                        </div>
                      ) : (
                        <div className="mt-4 flex gap-3">
                          <Button
                            variant="outline"
                            className="text-teal-600 border-teal-200 hover:bg-teal-50"
                            asChild
                          >
                            <a
                              href={`http://localhost:8000${result.pdb_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Download PDB
                            </a>
                          </Button>
                          <Button
                            variant="outline"
                            className="text-teal-600 border-teal-200 hover:bg-teal-50"
                            asChild
                          >
                            <a
                              href={`http://localhost:8000${result.pdbqt_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
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
