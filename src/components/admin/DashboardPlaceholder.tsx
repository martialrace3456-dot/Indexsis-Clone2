import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard } from "lucide-react";

export function DashboardPlaceholder() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <LayoutDashboard className="h-5 w-5" />
            Dashboard Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This dashboard is reserved for future features. Check the Analytics tab for current metrics.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
