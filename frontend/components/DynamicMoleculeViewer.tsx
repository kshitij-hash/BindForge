"use client";

import React, { useEffect, useRef, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !pdbUrl) return;
    
    // Clear any previous errors
    setError(null);

    // Initialize the viewer
    const viewer = $3Dmol.createViewer(containerRef.current, {
      backgroundColor: "white",
    });
    viewerRef.current = viewer;

    // Load the protein structure and then the ligand
    const loadMolecules = async () => {
      try {
        // First load protein
        console.log("Loading protein from:", pdbUrl);
        const proteinResponse = await fetch(pdbUrl);
        
        if (!proteinResponse.ok) {
          throw new Error(`Failed to load protein (${proteinResponse.status}): ${proteinResponse.statusText}`);
        }
        
        const proteinData = await proteinResponse.text();
        
        try {
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
              console.log("Loading ligand from:", pdbqtUrl);
              const ligandResponse = await fetch(pdbqtUrl);
              
              if (!ligandResponse.ok) {
                console.warn(`Failed to load ligand (${ligandResponse.status}): ${ligandResponse.statusText}`);
              } else {
                const ligandData = await ligandResponse.text();
                viewer.addModel(ligandData, "pdbqt");
                viewer.setStyle({ model: -1 }, { stick: { colorscheme: "greenCarbon" } });
              }
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
        } catch (err) {
          console.error("Error processing molecule data:", err);
          setError("Failed to process molecular structure data");
        }
      } catch (error: any) {
        console.error("Error in molecule loading:", error);
        setError(error.message || "Failed to load molecular structures");
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

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {error && (
        <div 
          style={{ 
            position: "absolute", 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: "rgba(255,255,255,0.8)", 
            display: "flex", 
            flexDirection: "column",
            alignItems: "center", 
            justifyContent: "center",
            padding: "1rem",
            textAlign: "center"
          }}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ color: "#e11d48", marginBottom: "0.5rem" }}
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p style={{ color: "#e11d48", fontWeight: "500", marginBottom: "0.25rem" }}>Error Loading 3D View</p>
          <p style={{ fontSize: "0.875rem", color: "#64748b" }}>{error}</p>
        </div>
      )}
    </div>
  );
}