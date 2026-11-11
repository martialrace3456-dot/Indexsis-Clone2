import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainMenu } from "@/components/MainMenu";
import SinglePlayerSetupPage from "./pages/SinglePlayerSetup";
import SinglePlayerGame from "./pages/SinglePlayerGame";
import MultiplayerGame from "./pages/MultiplayerGame";
import AdminPanel from "./pages/AdminPanel";
import AdvertiserPortal from "./pages/AdvertiserPortal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/single-player-setup" element={<SinglePlayerSetupPage />} />
          <Route path="/single-player" element={<SinglePlayerGame />} />
          <Route path="/multiplayer" element={<MultiplayerGame />} />
          <Route path="/indexsis-mngr-019910" element={<AdminPanel />} />
          <Route path="/indexsis-advtsr-019910" element={<AdvertiserPortal />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
