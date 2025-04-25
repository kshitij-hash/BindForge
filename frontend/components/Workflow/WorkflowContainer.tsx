"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, ArrowLeftRight } from "lucide-react";
import ProteinStep from "./ProteinStep";
import MoleculeStep from "./MoleculeStep";
import DockingStep from "./DockingStep";
import ResultsStep from "./ResultsStep";

interface WorkflowState {
  protein: {
    id?: string;
    pdb?: string;
    cleanedPdb?: string;
    cysteines?: any[];
  } | null;
  molecules: Array<{
    id?: string;
    name?: string;
    smiles: string;
    pdb?: string;
    pdbqt?: string;
  }>;
  dockingConfig: {
    bindingSite?: string;
    covalentTarget?: string;
    algorithm?: string;
  };
  results: any | null;
}

export default function WorkflowContainer() {
  const [currentStep, setCurrentStep] = useState(0);
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    protein: null,
    molecules: [],
    dockingConfig: {},
    results: null,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const steps = [
    {
      id: "protein",
      title: "Protein Structure",
      component: (
        <ProteinStep
          data={workflowState}
          updateData={(data) => setWorkflowState({ ...workflowState, ...data })}
          setIsProcessing={setIsProcessing}
        />
      ),
    },
    {
      id: "molecules",
      title: "Molecule Input",
      component: (
        <MoleculeStep
          data={workflowState}
          updateData={(data) => setWorkflowState({ ...workflowState, ...data })}
          setIsProcessing={setIsProcessing}
        />
      ),
    },
    {
      id: "docking",
      title: "Docking Setup",
      component: (
        <DockingStep
          data={workflowState}
          updateData={(data) => setWorkflowState({ ...workflowState, ...data })}
          setIsProcessing={setIsProcessing}
        />
      ),
    },
    {
      id: "results",
      title: "Results",
      component: <ResultsStep data={workflowState} />,
    },
  ];

  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Determine if current step is complete and we can proceed
  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 0: // Protein step
        return workflowState.protein !== null;
      case 1: // Molecule step
        return workflowState.molecules.length > 0;
      case 2: // Docking step
        return Object.keys(workflowState.dockingConfig).length > 0;
      default:
        return true;
    }
  };

  return (
    <div className="flex flex-col space-y-8 max-w-6xl mx-auto py-8 px-4">
      {/* Step Navigation */}
      <div className="relative">
        <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-gray-200 z-0"></div>
        <ol className="relative z-10 flex justify-between">
          {steps.map((step, index) => (
            <li key={step.id} className={cn("flex flex-col items-center")}>
              <div
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium border-2",
                  index < currentStep
                    ? "bg-teal-600 text-white border-teal-600"
                    : index === currentStep
                    ? "bg-white text-teal-600 border-teal-600"
                    : "bg-white text-gray-400 border-gray-200"
                )}
              >
                {index < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-sm font-medium",
                  index <= currentStep ? "text-teal-600" : "text-gray-500"
                )}
              >
                {step.title}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Current Step Content */}
      <div className="border rounded-lg p-6 min-h-[400px]">
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-50">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 rounded-full border-4 border-teal-600 border-t-transparent animate-spin"></div>
              <p className="text-teal-600 font-medium">Processing...</p>
            </div>
          </div>
        )}

        {steps[currentStep].component}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={goToPreviousStep}
          disabled={currentStep === 0 || isProcessing}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous Step
        </Button>

        {currentStep < steps.length - 1 && (
          <Button
            onClick={goToNextStep}
            disabled={!canProceedToNextStep() || isProcessing}
            className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2"
          >
            Next Step
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
