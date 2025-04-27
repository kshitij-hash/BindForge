"use client";

import React from "react";
import dynamic from 'next/dynamic'

// Dynamically import 3DMol with client-side only rendering
// This prevents the "window is not defined" error during SSR
const Viewer = dynamic(
  () => import('./DynamicMoleculeViewer'),
  { ssr: false }
);

interface MoleculeViewer3DProps {
  pdbUrl?: string;
  pdbqtUrl?: string;
  showSurface?: boolean;
  showBindingSite?: boolean;
  showMolecule?: boolean;
  bindingSiteCoords?: { x: number; y: number; z: number };
  poseCoordinates?: string;
}

export default function MoleculeViewer3D({
  pdbUrl,
  pdbqtUrl,
  showSurface = false,
  showBindingSite = true,
  showMolecule = true,
  bindingSiteCoords,
  poseCoordinates,
}: MoleculeViewer3DProps) {
  // Normalize paths to ensure they point to the backend server
  const normalizedPdbUrl = normalizePath(pdbUrl);
  const normalizedPdbqtUrl = normalizePath(pdbqtUrl);
  
  return (
    <Viewer
      pdbUrl={normalizedPdbUrl}
      pdbqtUrl={normalizedPdbqtUrl}
      showSurface={showSurface}
      showBindingSite={showBindingSite}
      showMolecule={showMolecule}
      bindingSiteCoords={bindingSiteCoords}
      poseCoordinates={poseCoordinates}
    />
  );
}

// Helper function to normalize paths to point to backend server
function normalizePath(path?: string): string | undefined {
  if (!path || path === '#') return path;
  
  // If it's already a full URL, return it
  if (path.startsWith('http')) return path;
  
  // If it's a relative path starting with /uploads, make it point to backend
  if (path.startsWith('/uploads')) {
    return `http://localhost:8000${path}`;
  }
  
  // Otherwise, assume it's already a valid path or handle other cases
  return path;
}