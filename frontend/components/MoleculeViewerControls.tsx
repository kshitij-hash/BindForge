import React from 'react';
import { Toggle } from '../components/ui/toggle';
import { 
  Layers, 
  Target, 
  FlaskConical,
  Download
} from 'lucide-react';
import { Button } from '../components/ui/button';

interface MoleculeViewerControlsProps {
  showSurface: boolean;
  setShowSurface: (show: boolean) => void;
  showBindingSite: boolean;
  setShowBindingSite: (show: boolean) => void;
  showMolecule: boolean;
  setShowMolecule: (show: boolean) => void;
  onDownloadReport: () => void;
}

const MoleculeViewerControls: React.FC<MoleculeViewerControlsProps> = ({
  showSurface,
  setShowSurface,
  showBindingSite,
  setShowBindingSite,
  showMolecule,
  setShowMolecule,
  onDownloadReport
}) => {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <div className="flex items-center gap-2 border rounded-md px-3 py-1">
        <Layers className="h-4 w-4 text-gray-500" />
        <span className="text-sm">Surface</span>
        <Toggle
          aria-label="Toggle protein surface"
          pressed={showSurface}
          onPressedChange={setShowSurface}
          className="data-[state=on]:bg-teal-100 data-[state=on]:text-teal-700"
        />
      </div>
      
      <div className="flex items-center gap-2 border rounded-md px-3 py-1">
        <Target className="h-4 w-4 text-gray-500" />
        <span className="text-sm">Binding Site</span>
        <Toggle
          aria-label="Toggle binding site"
          pressed={showBindingSite}
          onPressedChange={setShowBindingSite}
          className="data-[state=on]:bg-teal-100 data-[state=on]:text-teal-700"
        />
      </div>
      
      <div className="flex items-center gap-2 border rounded-md px-3 py-1">
        <FlaskConical className="h-4 w-4 text-gray-500" />
        <span className="text-sm">Molecule</span>
        <Toggle
          aria-label="Toggle molecule visibility"
          pressed={showMolecule}
          onPressedChange={setShowMolecule}
          className="data-[state=on]:bg-teal-100 data-[state=on]:text-teal-700"
        />
      </div>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={onDownloadReport}
        className="ml-auto flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        <span>Download Report</span>
      </Button>
    </div>
  );
};

export default MoleculeViewerControls;