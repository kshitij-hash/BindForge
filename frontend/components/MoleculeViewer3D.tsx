"use client";

import React, { useEffect, useRef } from "react";
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
}

export default function MoleculeViewer3D({
  pdbUrl,
  pdbqtUrl,
  showSurface = false,
  showBindingSite = true,
  showMolecule = true,
  bindingSiteCoords,
}: MoleculeViewer3DProps) {
  return (
    <Viewer
      pdbUrl={pdbUrl}
      pdbqtUrl={pdbqtUrl}
      showSurface={showSurface}
      showBindingSite={showBindingSite}
      showMolecule={showMolecule}
      bindingSiteCoords={bindingSiteCoords}
    />
  );
}