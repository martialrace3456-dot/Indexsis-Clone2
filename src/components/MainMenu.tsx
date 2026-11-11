import { useNavigate } from "react-router-dom";
import { Trophy, Swords } from "lucide-react";
import { AnnouncementOverlay } from "@/components/AnnouncementOverlay";
import logoUrl from "@/assets/indexsis-logo-transparent.png";
import { Button } from "@/components/ui/button";

export const MainMenu = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Announcement Overlay */}
      <AnnouncementOverlay targetScreen="main-menu" />
      
      {/* Animated dot background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-cyan-400/30"
            style={{
              width: Math.random() * 4 + 2 + "px",
              height: Math.random() * 4 + 2 + "px",
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
              animation: `twinkle ${Math.random() * 3 + 2}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-5xl space-y-16">
        {/* Game Title */}
        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => navigate("/")} className="h-auto bg-transparent hover:bg-transparent w-full max-w-xl p-4 sm:p-6 hover:opacity-90" aria-label="Indexsis home">
            <h1 className="w-full"><img src={logoUrl} alt="Indexsis" className="w-full h-auto" /></h1>
          </Button>
        </div>

        {/* Game Mode Cards */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Single Player Mode */}
          <button
            onClick={() => navigate("/single-player-setup")}
            className="group relative bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl p-8 md:p-10 text-left transition-all hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/50"
          >
            <div className="flex items-start gap-4 mb-4">
              <Trophy className="w-10 h-10 text-yellow-300" />
              <h2 className="text-2xl md:text-3xl font-bold text-yellow-300">
                THE GLOBAL ESTIMATOR CHALLENGE
              </h2>
            </div>
            <p className="text-white text-base md:text-lg">
              Test your statistical skill over 7 rounds. Compete on global stats.
            </p>
          </button>

          {/* Two Player Mode */}
          <button
            onClick={() => navigate("/multiplayer")}
            className="group relative bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl p-8 md:p-10 text-left transition-all hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/50"
          >
            <div className="flex items-start gap-4 mb-4">
              <Swords className="w-10 h-10 text-slate-900" />
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                DOUBLE PLAYER: LOCAL DUEL
              </h2>
            </div>
            <p className="text-slate-900 text-base md:text-lg">
              Pass-and-play competition against a friend. Highest score after 7 rounds wins.
            </p>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
