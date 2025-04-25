"use client";

import { useState } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface FeedbackModuleProps {
  dockingResult: {
    affinity: number;
    distance_to_cysteine?: number;
    covalent_prediction?: {
      prediction: string;
      reason: string;
    };
  };
}

interface Suggestion {
  type: string;
  title: string;
  message: string;
  examples?: Array<{
    smiles: string;
    description: string;
  }>;
}

export function FeedbackModule({ dockingResult }: FeedbackModuleProps) {
  const [showExamples, setShowExamples] = useState<Record<string, boolean>>({});
  
  const toggleExamples = (type: string) => {
    setShowExamples(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };
  
  const generateSuggestions = (): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    const distance = dockingResult.distance_to_cysteine ?? Infinity;
    const affinity = dockingResult.affinity;
    
    // If warhead is too far from cysteine
    if (distance > 4.0 && distance < 8.0) {
      suggestions.push({
        type: "extend-linker",
        title: "Consider Extending Linker",
        message: "Your warhead is positioned too far from the cysteine residue. Consider extending the linker between your core scaffold and the warhead.",
        examples: [
          {
            smiles: "CC(=O)NCCC1=CC=C(NC(=O)C2=CC=CC=C2)C=C1", 
            description: "Example with extended linker (added -CH2- group)"
          },
          {
            smiles: "CC(=O)NCCCC1=CC=C(NC(=O)C2=CC=CC=C2)C=C1",
            description: "Example with further extended linker (added -CH2CH2- group)"
          }
        ]
      });
    }
    
    // If poor docking score
    if (affinity > -6.0) {
      suggestions.push({
        type: "improve-binding",
        title: "Improve Binding Interactions",
        message: "The docking score suggests weak binding. Consider adding H-bond donors/acceptors or hydrophobic groups to improve interactions.",
        examples: [
          {
            smiles: "CC(=O)NCC1=CC=C(NC(=O)C2=CC=C(O)C=C2)C=C1",
            description: "Added hydroxyl group to improve H-bonding"
          },
          {
            smiles: "CC(=O)NCC1=CC=C(NC(=O)C2=CC=C(N)C=C2)C=C1",
            description: "Added amine group to improve H-bonding"
          }
        ]
      });
    }
    
    // If good position but high energy
    if (distance <= 4.0 && affinity > -7.0) {
      suggestions.push({
        type: "alternative-warhead",
        title: "Consider Alternative Warhead",
        message: "Your warhead is well-positioned but may not be optimal. Consider trying different warhead types.",
        examples: [
          {
            smiles: "C=CC(=O)NCC1=CC=C(NC(=O)C2=CC=CC=C2)C=C1",
            description: "Acrylamide warhead"
          },
          {
            smiles: "ClCC(=O)NCC1=CC=C(NC(=O)C2=CC=CC=C2)C=C1",
            description: "Chloroacetamide warhead"
          }
        ]
      });
    }
    
    return suggestions;
  };
  
  const suggestions = generateSuggestions();
  
  if (suggestions.length === 0) {
    return (
      <Card className="p-6 bg-green-50 border-green-200">
        <h2 className="text-xl font-bold text-green-700 mb-2">Excellent Design</h2>
        <p className="text-green-700">
          Your molecule appears to be well-designed for covalent binding to the target.
          No specific improvements are suggested at this time.
        </p>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Improvement Suggestions</h2>
      
      {suggestions.map((suggestion) => (
        <Card key={suggestion.type} className="p-6 bg-blue-50 border-blue-200">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-bold text-blue-700">{suggestion.title}</h3>
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
              Suggestion
            </Badge>
          </div>
          
          <p className="mt-2 text-blue-700">{suggestion.message}</p>
          
          {suggestion.examples && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleExamples(suggestion.type)}
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                {showExamples[suggestion.type] ? "Hide Examples" : "Show Examples"}
              </Button>
              
              {showExamples[suggestion.type] && (
                <div className="mt-4 space-y-4">
                  {suggestion.examples.map((example, i) => (
                    <div key={i} className="p-3 bg-white rounded-md border border-blue-200">
                      <p className="text-sm font-medium">{example.description}</p>
                      <code className="mt-1 block p-2 bg-gray-50 rounded text-xs font-mono break-all">
                        {example.smiles}
                      </code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}