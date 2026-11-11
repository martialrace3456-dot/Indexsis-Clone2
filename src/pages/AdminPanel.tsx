import { useState } from "react";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { ContestApproval } from "@/components/admin/ContestApproval";
import { AnnouncementManager } from "@/components/admin/AnnouncementManager";
import { GameSettingsPanel } from "@/components/admin/GameSettingsPanel";
import { DashboardPlaceholder } from "@/components/admin/DashboardPlaceholder";
import { PaymentsPlaceholder } from "@/components/admin/PaymentsPlaceholder";
import { AccountsManager } from "@/components/admin/AccountsManager";
import { AdvertisersManager } from "@/components/admin/AdvertisersManager";
import { ServicesPanel } from "@/components/admin/ServicesPanel";
import { useContestApproval } from "@/hooks/useContestApproval";

export default function AdminPanel() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const { pendingContests } = useContestApproval();

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardPlaceholder />;
      case "analytics":
        return <AnalyticsDashboard />;
      case "contests":
        return <ContestApproval />;
      case "announcements":
        return <AnnouncementManager />;
      case "accounts":
        return <AccountsManager />;
      case "advertisers":
        return <AdvertisersManager />;
      case "services":
        return <ServicesPanel />;
      case "payments":
        return <PaymentsPlaceholder />;
      case "settings":
        return <GameSettingsPanel />;
      default:
        return <DashboardPlaceholder />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <AdminNavigation
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        pendingCount={pendingContests.length}
      />
      <main className="flex-1 p-6 overflow-auto">{renderContent()}</main>
    </div>
  );
}
