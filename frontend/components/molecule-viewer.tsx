"use client";

import { useEffect, useRef } from "react";
import * as $3Dmol from "3dmol";
import { Card } from "./ui/card";

interface MoleculeViewerProps {
  pdbData?: string;
  pdbUrl?: string;
  width?: string;
  height?: string;
  highlights?: {
    resi: number | `${number}-${number}` | (number | `${number}-${number}`)[];
    chain: string;
    color?: string;
    label?: string;
  }[];
  measurements?: {
    atom1: number;
    atom2: number;
    label?: string;
  }[];
}

export default function MoleculeViewer({
  pdbData,
  pdbUrl,
  width = "100%",
  height = "400px",
  highlights = [],
  measurements = [],
}: MoleculeViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!viewerRef.current) return;

    // Initialize viewer
    const viewer = $3Dmol.createViewer(viewerRef.current, {
      defaultcolors: $3Dmol.elementColors.rasmol,
    });
    viewerInstanceRef.current = viewer;

    const loadMolecule = async () => {
      try {
        if (pdbData) {
          viewer.addModel(pdbData, "pdb");
        } else if (pdbUrl) {
          const response = await fetch(pdbUrl);
          const data = await response.text();
          viewer.addModel(data, "pdb");
        } else {
          console.error("No PDB data or URL provided");
          return;
        }

        // Set default styles
        viewer.setStyle({}, { cartoon: { color: "gray" } });
        viewer.setStyle(
          { hetflag: true },
          { stick: { radius: 0.2, colorscheme: "greenCarbon" } }
        );

        // Add highlights for specific residues (like cysteines)
        highlights.forEach((highlight) => {
          viewer.setStyle(
            { chain: highlight.chain, resi: highlight.resi },
            {
              stick: {
                colorscheme: highlight.color || "yellowCarbon",
                radius: 0.15,
              },
            }
          );

          if (highlight.label) {
            // Get atoms that match our selection criteria
            const atoms = viewer.selectedAtoms({
              resi: highlight.resi,
              chain: highlight.chain,
            });
            if (atoms.length > 0) {
              viewer.addLabel(highlight.label, {
                position: {
                  x: atoms[0].x ?? 0,
                  y: atoms[0].y ?? 0,
                  z: atoms[0].z ?? 0,
                },
                backgroundColor: "black",
                fontColor: "white",
              });
            }
          }
        });

        // Add distance measurements
        measurements.forEach((measurement) => {
          const atoms = viewer.selectedAtoms({ serial: measurement.atom1 });
          if (atoms.length > 0) {
            const atom = atoms[0];
            viewer.addLabel(measurement.label || "", {
              position: { x: atom.x ?? 0, y: atom.y ?? 0, z: atom.z ?? 0 },
              backgroundOpacity: 0.7,
              alignment: "center",
            });
          }
        });

        viewer.zoomTo();
        viewer.render();
      } catch (error) {
        console.error("Error loading molecule:", error);
      }
    };

    loadMolecule();

    return () => {
      // Clean up
      if (viewerInstanceRef.current) {
        viewerInstanceRef.current.removeAllModels();
        viewerInstanceRef.current.removeAllShapes();
        viewerInstanceRef.current.removeAllLabels();
      }
    };
  }, [pdbData, pdbUrl, highlights, measurements]);

  return (
    <Card className="overflow-hidden">
      <div ref={viewerRef} style={{ width, height }} className="rounded-md" />
    </Card>
  );
}
