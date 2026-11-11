import { Sample } from "@/types/game";
import { Card } from "@/components/ui/card";

interface SampleInfoProps {
  samples: Sample[];
  samplesRemaining: number;
}

export const SampleInfo = ({ samples, samplesRemaining }: SampleInfoProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Samples</h3>
        <div className="px-4 py-2 bg-card rounded-lg border border-primary">
          <span className="text-sm text-muted-foreground">Remaining: </span>
          <span className="text-lg font-bold text-primary font-mono">
            {samplesRemaining}
          </span>
        </div>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {samples.map((sample, index) => (
          <Card
            key={index}
            className="p-3 bg-card border-border transition-all hover:border-primary"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-accent flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    Position: ({Math.round(sample.x)}, {Math.round(sample.y)})
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Radius: {Math.round(sample.radius)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Density (ρₗ)</div>
                <div className="text-xl font-bold font-mono text-data-primary">
                  {sample.localDensity.toFixed(6)}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
