import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Download } from 'lucide-react';

interface DockingPose {
  pose_id: number;
  affinity: number;
  rmsd_lb?: number;
  rmsd_ub?: number;
  pdbqt_url?: string;
}

interface DockingResultsTableProps {
  poses: DockingPose[];
}

const DockingResultsTable: React.FC<DockingResultsTableProps> = ({ poses }) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pose ID</TableHead>
            <TableHead>Affinity (kcal/mol)</TableHead>
            <TableHead>RMSD LB</TableHead>
            <TableHead>RMSD UB</TableHead>
            <TableHead>Files</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {poses.map((pose) => (
            <TableRow key={pose.pose_id}>
              <TableCell>{pose.pose_id}</TableCell>
              <TableCell>{pose.affinity.toFixed(2)}</TableCell>
              <TableCell>{pose.rmsd_lb?.toFixed(2) || 'N/A'}</TableCell>
              <TableCell>{pose.rmsd_ub?.toFixed(2) || 'N/A'}</TableCell>
              <TableCell>
                {pose.pdbqt_url ? (
                  <a
                    href={`http://localhost:8000${pose.pdbqt_url}`}
                    download
                    className="flex items-center gap-1 text-teal-600 hover:text-teal-700"
                  >
                    <Download className="h-4 w-4" />
                    <span>PDBQT</span>
                  </a>
                ) : (
                  'No file'
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DockingResultsTable;