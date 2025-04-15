import { useEffect, useRef } from "react";

const MoleculeVisual = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = 240;
    canvas.height = 240;

    // Colors
    const atomColors = {
      carbon: "#333333",
      oxygen: "#FF4444",
      nitrogen: "#3366FF",
      sulfur: "#DDDD00",
    };

    // Simple molecule structure representation
    const atoms = [
      { x: 120, y: 120, type: "carbon", radius: 14 },
      { x: 160, y: 90, type: "oxygen", radius: 12 },
      { x: 180, y: 140, type: "carbon", radius: 14 },
      { x: 80, y: 90, type: "nitrogen", radius: 12 },
      { x: 60, y: 140, type: "carbon", radius: 14 },
      { x: 120, y: 170, type: "sulfur", radius: 16 },
    ];

    const bonds = [
      { from: 0, to: 1 },
      { from: 0, to: 3 },
      { from: 0, to: 5 },
      { from: 1, to: 2 },
      { from: 3, to: 4 },
      { from: 4, to: 5 },
      { from: 2, to: 5 },
    ];

    // Animation variables
    let angle = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Rotate molecule slightly
      angle += 0.01;
      const cosAngle = Math.cos(angle);
      const sinAngle = Math.sin(angle);

      // Draw bonds
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#666666";
      bonds.forEach((bond) => {
        const fromAtom = atoms[bond.from];
        const toAtom = atoms[bond.to];

        // Apply simple rotation
        const fromX =
          120 + (fromAtom.x - 120) * cosAngle - (fromAtom.y - 120) * sinAngle;
        const fromY =
          120 + (fromAtom.x - 120) * sinAngle + (fromAtom.y - 120) * cosAngle;

        const toX =
          120 + (toAtom.x - 120) * cosAngle - (toAtom.y - 120) * sinAngle;
        const toY =
          120 + (toAtom.x - 120) * sinAngle + (toAtom.y - 120) * cosAngle;

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
      });

      // Draw atoms
      atoms.forEach((atom) => {
        // Apply simple rotation
        const x = 120 + (atom.x - 120) * cosAngle - (atom.y - 120) * sinAngle;
        const y = 120 + (atom.x - 120) * sinAngle + (atom.y - 120) * cosAngle;

        ctx.beginPath();
        ctx.arc(x, y, atom.radius, 0, Math.PI * 2);
        ctx.fillStyle = atomColors[atom.type as keyof typeof atomColors];
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      // Cleanup
    };
  }, []);

  return (
    <div className="molecule-float relative">
      <canvas
        ref={canvasRef}
        className="mx-auto rounded-full bg-white/50 shadow-lg"
      />
    </div>
  );
};

export default MoleculeVisual;
