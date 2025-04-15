"use client";

import { useState } from "react";
import { 
  ArrowRight, 
  AlertCircle, 
  FileCode,
  FlaskRoundIcon as Flask, 
  Download 
} from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export default function ProteinPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError("Please select a file");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        "http://localhost:8000/api/prepare-protein",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to process protein structure");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-white">
        <div className="container flex h-16 items-center">
          <div className="flex items-center gap-2">
            <Flask className="h-6 w-6 text-teal-600" />
            <span className="text-xl font-bold">Protein Preparation</span>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-2 text-center mb-8">
            <div className="inline-block rounded-lg bg-teal-100 px-3 py-1 text-sm text-teal-700">
              Structure Preparation
            </div>
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Protein Structure Processing
            </h1>
            <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed mx-auto">
              Process PDB files for docking and identify potential covalent binding sites
            </p>
          </div>

          <Card className="mb-8 border-2 border-teal-100">
            <CardHeader>
              <div className="bg-teal-100 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
                <FileCode className="h-5 w-5 text-teal-700" />
              </div>
              <CardTitle>Upload Protein Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload PDB File
                  </label>
                  <input
                    type="file"
                    accept=".pdb"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-teal-50 file:text-teal-700
                      hover:file:bg-teal-100"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Upload a PDB file to prepare it for docking and identify cysteine residues.
                  </p>
                </div>

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {loading ? "Processing..." : "Prepare Protein"}
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

          {result && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Processing Results</h2>
              
              <Card className="border-2 border-teal-100 hover:border-teal-200 transition-colors">
                <CardHeader className="pb-2">
                  <div className="bg-teal-100 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
                    <Download className="h-5 w-5 text-teal-700" />
                  </div>
                  <CardTitle>Cleaned Structure</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500 mb-4">
                    The protein structure has been cleaned and prepared for molecular docking.
                  </p>
                  <Button
                    variant="outline"
                    className="text-teal-600 border-teal-200 hover:bg-teal-50 flex items-center gap-2"
                    asChild
                  >
                    <a
                      href={`http://localhost:8000${result.cleaned_structure_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4" />
                      Download Cleaned PDB
                    </a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 border-teal-100 hover:border-teal-200 transition-colors">
                <CardHeader className="pb-2">
                  <div className="bg-teal-100 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
                    <Flask className="h-5 w-5 text-teal-700" />
                  </div>
                  <CardTitle>Identified Cysteine Residues</CardTitle>
                </CardHeader>
                <CardContent>
                  {result.cysteines.length > 0 ? (
                    <div className="space-y-4">
                      <p className="text-gray-500">
                        {result.cysteines.length} potential covalent binding sites identified:
                      </p>
                      <div className="bg-gray-50 p-4 rounded-lg border">
                        <ul className="divide-y">
                          {result.cysteines.map((cys: any, index: number) => (
                            <li key={index} className="py-2 first:pt-0 last:pb-0 flex items-center">
                              <div className="h-2 w-2 rounded-full bg-teal-500 mr-2"></div>
                              <span>
                                Chain <span className="font-mono font-medium">{cys.chain}</span>, 
                                Residue <span className="font-mono font-medium">{cys.residue_number}</span> 
                                (<span className="font-mono font-medium">{cys.residue_name}</span>)
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center p-4 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-100">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <span>No cysteine residues found in this protein structure.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
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
