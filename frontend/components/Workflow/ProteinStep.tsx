"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCode, AlertCircle } from "lucide-react";

interface ProteinStepProps {
  data: any;
  updateData: (data: any) => void;
  setIsProcessing: (isProcessing: boolean) => void;
}

export default function ProteinStep({
  data,
  updateData,
  setIsProcessing,
}: ProteinStepProps) {
  const [file, setFile] = useState<File | null>(null);
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

    setIsProcessing(true);
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

      updateData({
        protein: {
          id: data.id,
          pdb: data.original_structure_url,
          cleanedPdb: data.cleaned_structure_url,
          cysteines: data.cysteines || [],
        },
      });
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Protein Structure</h2>
        <p className="text-gray-500">
          Upload a protein structure in PDB format to begin the analysis.
        </p>
      </div>

      <Card className="border-2 border-teal-100">
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
                Upload a PDB file to prepare it for docking and identify
                cysteine residues.
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                Prepare Protein
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

      {data.protein && (
        <Card className="border-2 border-teal-300">
          <CardHeader>
            <CardTitle>Protein Preparation Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>Your protein has been successfully prepared for docking.</p>

              <div className="bg-gray-50 p-4 rounded-lg border">
                <h4 className="font-medium mb-2">
                  Identified Cysteine Residues:
                </h4>
                {data.protein.cysteines && data.protein.cysteines.length > 0 ? (
                  <ul className="divide-y">
                    {data.protein.cysteines.map((cys: any, index: number) => (
                      <li
                        key={index}
                        className="py-2 first:pt-0 last:pb-0 flex items-center"
                      >
                        <div className="h-2 w-2 rounded-full bg-teal-500 mr-2"></div>
                        <span>
                          Chain{" "}
                          <span className="font-mono font-medium">
                            {cys.chain}
                          </span>
                          , Residue{" "}
                          <span className="font-mono font-medium">
                            {cys.residue_number}
                          </span>
                          (
                          <span className="font-mono font-medium">
                            {cys.residue_name}
                          </span>
                          )
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-yellow-600">
                    No cysteine residues found in this protein structure.
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="text-teal-600 border-teal-200 hover:bg-teal-50 flex items-center gap-2"
                  asChild
                >
                  <a
                    href={`http://localhost:8000${data.protein.cleanedPdb}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download Cleaned PDB
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
