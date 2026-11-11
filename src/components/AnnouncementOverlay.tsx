import { useState, useEffect } from "react";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { X, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnnouncementOverlayProps {
  targetScreen: string;
}

const TYPE_CONFIG = {
  info: { icon: Info, bgColor: "bg-blue-500/95", borderColor: "border-blue-400" },
  warning: { icon: AlertTriangle, bgColor: "bg-amber-500/95", borderColor: "border-amber-400" },
  success: { icon: CheckCircle, bgColor: "bg-green-500/95", borderColor: "border-green-400" },
  error: { icon: XCircle, bgColor: "bg-red-500/95", borderColor: "border-red-400" },
};

export function AnnouncementOverlay({ targetScreen }: AnnouncementOverlayProps) {
  const { activeAnnouncements } = useAnnouncements(targetScreen);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Reset dismissed IDs when announcements change
  useEffect(() => {
    // Keep only the dismissed IDs that are still in active announcements
    setDismissedIds(prev => {
      const activeIds = new Set(activeAnnouncements.map(a => a.id));
      const newDismissed = new Set<string>();
      prev.forEach(id => {
        if (activeIds.has(id)) {
          newDismissed.add(id);
        }
      });
      return newDismissed;
    });
  }, [activeAnnouncements]);

  const visibleAnnouncements = activeAnnouncements.filter(a => !dismissedIds.has(a.id));

  if (visibleAnnouncements.length === 0) return null;

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {visibleAnnouncements.map((announcement) => {
        const config = TYPE_CONFIG[announcement.type];
        const Icon = config.icon;

        return (
          <div
            key={announcement.id}
            className={`${config.bgColor} ${config.borderColor} border rounded-lg shadow-lg p-4 animate-in slide-in-from-right duration-300`}
          >
            <div className="flex items-start gap-3">
              <Icon className="h-5 w-5 text-white shrink-0 mt-0.5" />
              <p className="text-white text-sm flex-1">{announcement.message}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/20 shrink-0"
                onClick={() => handleDismiss(announcement.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
