import { useEffect, useRef } from "react";
import { Dot, Sample } from "@/types/game";
import { AdCampaignLayer } from "./AdCampaignLayer";
import { AdBoardControls } from "./AdBoardControls";
import { useActiveAdCampaigns } from "@/hooks/useActiveAdCampaigns";
import { useState } from "react";
import type { AdAudience } from "@/utils/adDelivery";

interface GameBoardProps {
  dots: Dot[];
  boardSize: number;
  samples: Sample[];
  showDots: boolean;
  onSample?: (x: number, y: number) => void;
  canSample: boolean;
  adAudience?: AdAudience;
  onVisibleCampaigns?: (ids: string[]) => void;
}

export const GameBoard = ({
  dots,
  boardSize,
  samples,
  showDots,
  onSample,
  canSample,
  adAudience,
  onVisibleCampaigns,
}: GameBoardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { campaigns: adCampaigns } = useActiveAdCampaigns(adAudience);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "hsl(220, 25%, 10%)";
    ctx.fillRect(0, 0, boardSize, boardSize);

    // Draw dots if visible
    if (showDots) {
      ctx.fillStyle = "hsl(180, 70%, 55%)";
      dots.forEach((dot) => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      // Draw bright cover pattern
      const gradient = ctx.createLinearGradient(0, 0, boardSize, boardSize);
      gradient.addColorStop(0, "hsl(220, 40%, 35%)");
      gradient.addColorStop(0.5, "hsl(240, 45%, 40%)");
      gradient.addColorStop(1, "hsl(220, 40%, 35%)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, boardSize, boardSize);

      // Add brighter noise pattern
      for (let i = 0; i < 1000; i++) {
        ctx.fillStyle = `hsl(220, 30%, ${35 + Math.random() * 8}%)`;
        ctx.fillRect(
          Math.random() * boardSize,
          Math.random() * boardSize,
          Math.random() * 3,
          Math.random() * 3
        );
      }
      
      // Add subtle glow border
      ctx.strokeStyle = "hsl(240, 50%, 50%)";
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, boardSize - 4, boardSize - 4);
    }

    // Draw sample circles on canvas only when dots are visible (otherwise SVG layer handles it above ads)
    if (showDots) {
      samples.forEach((sample, index) => {
        ctx.strokeStyle = index === samples.length - 1 
          ? "hsl(320, 70%, 60%)" 
          : "hsl(260, 60%, 55%)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sample.x, sample.y, sample.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw center point
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(sample.x, sample.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Draw density value text
        ctx.fillStyle = "white";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(sample.localDensity.toFixed(4), sample.x, sample.y);
      });
    }
  }, [dots, boardSize, samples, showDots]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canSample || !onSample) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const scaleX = boardSize / rect.width;
    const scaleY = boardSize / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    onSample(x, y);
  };

  return (
    <div className="w-full max-w-[600px] mx-auto">
    <div
      ref={containerRef}
      className={`relative w-full h-full max-w-[600px] max-h-[600px] mx-auto ${
        canSample ? "cursor-crosshair" : "cursor-default"
      }`}
      style={{ aspectRatio: "1 / 1" }}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        width={boardSize}
        height={boardSize}
        className="w-full h-full rounded-lg shadow-lg"
        style={{ aspectRatio: "1 / 1" }}
      />
      <AdCampaignLayer visible={!showDots} campaigns={adCampaigns} muted={muted} onVisibleCampaigns={onVisibleCampaigns} />
      {/* SVG overlay for sample circles - renders ABOVE ads */}
      {samples.length > 0 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none rounded-lg"
          viewBox={`0 0 ${boardSize} ${boardSize}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {samples.map((sample, index) => {
            const isLatest = index === samples.length - 1;
            const color = isLatest ? "hsl(320, 70%, 60%)" : "hsl(260, 60%, 55%)";
            return (
              <g key={index}>
                <circle
                  cx={sample.x}
                  cy={sample.y}
                  r={sample.radius}
                  fill="none"
                  stroke={color}
                  strokeWidth={3}
                />
                <circle
                  cx={sample.x}
                  cy={sample.y}
                  r={5}
                  fill={color}
                />
                <text
                  x={sample.x}
                  y={sample.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize={sample.radius * 0.35}
                  fontWeight="bold"
                  fontFamily="monospace"
                  style={{ textShadow: "0 0 4px rgba(0,0,0,0.8)" }}
                >
                  {sample.localDensity.toFixed(4)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
    {!showDots && (
      <AdBoardControls campaigns={adCampaigns} muted={muted} onToggleMute={() => setMuted((m) => !m)} />
    )}
    </div>
  );
};
