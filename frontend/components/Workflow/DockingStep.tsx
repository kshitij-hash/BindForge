"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Settings2, CheckCircle2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DockingStepProps {
  data: any;
  updateData: (data: any) => void;
  setIsProcessing: (isProcessing: boolean) => void;
}

export default function DockingStep({
  data,
  updateData,
  setIsProcessing,
}: DockingStepProps) {
  const [dockingType, setDockingType] = useState("standard");
  const [selectedCysteine, setSelectedCysteine] = useState("");
  const [algorithm, setAlgorithm] = useState("autodock");
  const [error, setError] = useState<string | null>(null);
  const [configComplete, setConfigComplete] = useState(false);

  // Ensure we have data we need to proceed
  if (!data.protein) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
        <h3 className="text-xl font-semibold">Protein Structure Required</h3>
        <p className="text-gray-500 mt-2">
          Please upload a protein structure in the first step before configuring
          docking.
        </p>
      </div>
    );
  }

  if (!data.molecules || data.molecules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
        <h3 className="text-xl font-semibold">Molecules Required</h3>
        <p className="text-gray-500 mt-2">
          Please add at least one molecule in the previous step before
          configuring docking.
        </p>
      </div>
    );
  }

  const handleConfigurationSave = () => {
    setIsProcessing(true);

    // In a real implementation, we might validate the configuration
    // and potentially do some processing on the server

    setTimeout(() => {
      updateData({
        dockingConfig: {
          type: dockingType,
          algorithm,
          covalentTarget:
            dockingType === "covalent" ? selectedCysteine : undefined,
        },
      });
      setConfigComplete(true);
      setIsProcessing(false);
    }, 1000);
  };

  if (configComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="bg-green-100 rounded-full p-3">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold mt-4">
          Docking Configuration Complete
        </h3>
        <p className="text-gray-500 mt-2">
          Your docking job is configured and ready to process. Continue to the
          next step to view results.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Docking Configuration</h2>
        <p className="text-gray-500">
          Configure the parameters for your molecular docking simulation.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 w-10 h-10 rounded-lg flex items-center justify-center">
              <Settings2 className="h-5 w-5 text-teal-700" />
            </div>
            <CardTitle>Docking Parameters</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Docking Type</h3>
              <RadioGroup
                defaultValue="standard"
                value={dockingType}
                onValueChange={setDockingType}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="standard" id="standard" />
                  <Label htmlFor="standard">Standard Docking</Label>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <RadioGroupItem value="covalent" id="covalent" />
                  <Label htmlFor="covalent">Covalent Docking</Label>
                </div>
              </RadioGroup>
            </div>

            {dockingType === "covalent" &&
              data.protein.cysteines &&
              data.protein.cysteines.length > 0 && (
                <div className="mt-4 p-4 bg-teal-50 rounded-md">
                  <h4 className="font-medium mb-2">Select Target Cysteine</h4>
                  <Select
                    value={selectedCysteine}
                    onValueChange={setSelectedCysteine}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a cysteine residue" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.protein.cysteines.map((cys: any, index: number) => (
                        <SelectItem
                          key={index}
                          value={`${cys.chain}_${cys.residue_number}`}
                        >
                          Chain {cys.chain}, Residue {cys.residue_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {!selectedCysteine && dockingType === "covalent" && (
                    <p className="text-amber-600 text-sm mt-2">
                      Please select a target cysteine for covalent docking
                    </p>
                  )}
                </div>
              )}

            {dockingType === "covalent" &&
              (!data.protein.cysteines ||
                data.protein.cysteines.length === 0) && (
                <div className="mt-4 p-4 bg-amber-50 rounded-md text-amber-700">
                  <p>
                    No cysteine residues found in this protein. Covalent docking
                    may not be possible.
                  </p>
                </div>
              )}

            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Docking Algorithm</h3>
              <Select value={algorithm} onValueChange={setAlgorithm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="autodock">AutoDock Vina</SelectItem>
                  <SelectItem value="glide">Schrödinger Glide</SelectItem>
                  <SelectItem value="gold">GOLD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-medium">Advanced Options</h3>

              <div className="flex items-center justify-between">
                <Label htmlFor="exhaustiveness">
                  Increase Exhaustiveness
                  <p className="text-sm text-gray-500">
                    Runs a more thorough but slower search
                  </p>
                </Label>
                <Switch id="exhaustiveness" />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="ensemble">
                  Ensemble Docking
                  <p className="text-sm text-gray-500">
                    Dock against multiple protein conformations
                  </p>
                </Label>
                <Switch id="ensemble" />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={handleConfigurationSave}
              className="bg-teal-600 hover:bg-teal-700 text-white"
              disabled={dockingType === "covalent" && !selectedCysteine}
            >
              Save Configuration
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
