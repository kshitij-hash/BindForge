"use client";

import React, { useEffect, useRef } from "react";
import * as $3Dmol from "3dmol";

interface DynamicMoleculeViewerProps {
  pdbUrl?: string;
  pdbqtUrl?: string;
  showSurface?: boolean;
  showBindingSite?: boolean;
  showMolecule?: boolean;
  bindingSiteCoords?: { x: number; y: number; z: number };
  poseCoordinates?: string;
}

export default function DynamicMoleculeViewer({
  pdbUrl,
  pdbqtUrl,
  showSurface = false,
  showBindingSite = true,
  showMolecule = true,
  bindingSiteCoords,
  poseCoordinates,
}: DynamicMoleculeViewerProps) {
  const viewerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !pdbUrl) return;

    // Initialize the viewer
    const viewer = $3Dmol.createViewer(containerRef.current, {
      backgroundColor: "white",
    });
    viewerRef.current = viewer;

    // Load the protein structure and then the ligand
    const loadMolecules = async () => {
      try {
        // First load protein
        const proteinResponse = await fetch(pdbUrl);
        const proteinData = await proteinResponse.text();
        viewer.addModel(proteinData, "pdb");
        
        // Style protein
        viewer.setStyle({}, { cartoon: { color: "spectrum" } });
        
        // Add surface if enabled
        if (showSurface) {
          viewer.addSurface($3Dmol.SurfaceType.VDW, {
            opacity: 0.7,
            color: "white",
          });
        }
        
        // Add binding site visualization if coordinates are provided
        if (bindingSiteCoords && showBindingSite) {
          viewer.addSphere({
            center: bindingSiteCoords,
            radius: 3.0,
            color: "yellow",
            opacity: 0.5,
          });
        }
        
        // Try to load ligand from URL if available
        if (pdbqtUrl && showMolecule && pdbqtUrl !== "#") {
          try {
            const ligandResponse = await fetch(pdbqtUrl);
            const ligandData = await ligandResponse.text();
            viewer.addModel(ligandData, "pdbqt");
            viewer.setStyle({ model: -1 }, { stick: { colorscheme: "greenCarbon" } });
          } catch (err) {
            console.error("Error loading ligand from URL:", err);
          }
        } 
        // If pdbqtUrl failed or doesn't exist, try poseCoordinates
        else if (poseCoordinates && showMolecule) {
          try {
            viewer.addModel(poseCoordinates, "pdbqt");
            viewer.setStyle({ model: -1 }, { stick: { colorscheme: "purpleCarbon" } });
          } catch (err) {
            console.error("Error loading pose coordinates:", err);
          }
        }
        
        // Finally, zoom and render
        viewer.zoomTo();
        viewer.render();
        
      } catch (error) {
        console.error("Error in molecule loading:", error);
      }
    };
    
    loadMolecules();

    // Clean up function
    return () => {
      if (viewerRef.current) {
        viewerRef.current.clear();
      }
    };
  }, [pdbUrl, pdbqtUrl, showSurface, showBindingSite, showMolecule, bindingSiteCoords, poseCoordinates]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}