"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCode, Code2, AlertCircle, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MoleculeStepProps {
  data: any;
  updateData: (data: any) => void;
  setIsProcessing: (isProcessing: boolean) => void;
}

type InputMode = "smiles" | "batch" | "sdf";

export default function MoleculeStep({
  data,
  updateData,
  setIsProcessing,
}: MoleculeStepProps) {
  const [mode, setMode] = useState<InputMode>("smiles");
  const [smiles, setSmiles] = useState("");
  const [moleculeName, setMoleculeName] = useState("");
  const [batchSmiles, setBatchSmiles] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingResults, setProcessingResults] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const processSingleSmiles = async () => {
    if (!smiles.trim()) {
      setError("Please enter a SMILES string");
      return;
    }

    setIsProcessing(true);
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

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.detail || "Failed to process SMILES");
      }

      setProcessingResults(responseData.molecules);

      // Add to workflow state
      updateData({
        molecules: [...data.molecules, ...responseData.molecules],
      });

      // Reset form
      setSmiles("");
      setMoleculeName("");
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsProcessing(false);
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

    setIsProcessing(true);
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

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.detail || "Failed to process batch SMILES"
        );
      }

      setProcessingResults(responseData.molecules);

      // Add to workflow state
      updateData({
        molecules: [...data.molecules, ...responseData.molecules],
      });

      // Reset form
      setBatchSmiles("");
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const processSdf = async () => {
    if (!file) {
      setError("Please select an SDF file");
      return;
    }

    setIsProcessing(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/api/process-sdf", {
        method: "POST",
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.detail || "Failed to process SDF file");
      }

      setProcessingResults(responseData.molecules);

      // Add to workflow state
      updateData({
        molecules: [...data.molecules, ...responseData.molecules],
      });

      // Reset form
      setFile(null);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsProcessing(false);
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

  const removeMolecule = (index: number) => {
    const updatedMolecules = [...data.molecules];
    updatedMolecules.splice(index, 1);
    updateData({
      molecules: updatedMolecules,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Molecule Input</h2>
        <p className="text-gray-500">
          Input molecules to analyze with your protein. You can enter SMILES
          strings individually, in batch, or upload an SDF file.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Add Molecules</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="smiles"
            className="w-full"
            onValueChange={(value) => setMode(value as InputMode)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="smiles" className="flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Single SMILES
              </TabsTrigger>
              <TabsTrigger value="batch" className="flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Batch SMILES
              </TabsTrigger>
              <TabsTrigger value="sdf" className="flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                SDF File
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="mt-6">
              <TabsContent value="smiles" className="space-y-4">
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
              </TabsContent>

              <TabsContent value="batch" className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SMILES Strings (one per line)
                  </label>
                  <textarea
                    value={batchSmiles}
                    onChange={(e) => setBatchSmiles(e.target.value)}
                    placeholder="Enter SMILES strings (one per line)"
                    rows={6}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-teal-300 focus:outline-none"
                  />
                </div>
              </TabsContent>

              <TabsContent value="sdf" className="space-y-4">
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
              </TabsContent>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  Process Molecule(s)
                </Button>
              </div>
            </form>
          </Tabs>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {data.molecules.length > 0 && (
        <Card className="border-2 border-teal-100">
          <CardHeader>
            <CardTitle>Added Molecules ({data.molecules.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.molecules.map((molecule: any, index: number) => (
                <div
                  key={index}
                  className="relative border p-4 rounded-md bg-white hover:shadow-md transition-shadow"
                >
                  <h4 className="font-semibold">
                    {molecule.name || `Molecule ${index + 1}`}
                  </h4>
                  <p className="text-xs font-mono mt-2 bg-gray-50 p-2 rounded border break-all">
                    {molecule.smiles}
                  </p>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => removeMolecule(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
