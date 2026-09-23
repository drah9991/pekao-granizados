import React from "react";
import Layout from "@/components/Layout";
import { PekaoDashboardV2 } from "@/components/dashboard/v2/PekaoDashboardV2";
import { FavoritesWidget } from "@/components/dashboard/FavoritesWidget";
import ModuleErrorBoundary from "@/components/ModuleErrorBoundary";

export default function Dashboard() {
  return (
    <Layout>
      <div className="min-h-screen p-4 md:p-8 space-y-6 animate-pro-in transition-all duration-200">
        {/* Quick Favorites Bar */}
        <ModuleErrorBoundary moduleName="Favoritos">
          <FavoritesWidget />
        </ModuleErrorBoundary>

        {/* Pekao V2 Redesigned Operational Dashboard */}
        <ModuleErrorBoundary moduleName="Dashboard">
          <PekaoDashboardV2 />
        </ModuleErrorBoundary>
      </div>
    </Layout>
  );
}
