import React from "react";
import Layout from "@/components/Layout";
import { PekaoDashboardV2 } from "@/components/dashboard/v2/PekaoDashboardV2";
import { FavoritesWidget } from "@/components/dashboard/FavoritesWidget";

export default function Dashboard() {
  return (
    <Layout>
      <div className="min-h-screen p-4 md:p-8 space-y-6 animate-pro-in transition-all duration-200">
        {/* Quick Favorites Bar */}
        <FavoritesWidget />

        {/* Pekao V2 Redesigned Operational Dashboard */}
        <PekaoDashboardV2 />
      </div>
    </Layout>
  );
}
