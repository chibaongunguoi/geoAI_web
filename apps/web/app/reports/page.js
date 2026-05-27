import React from "react";
import { redirect } from "next/navigation";
import AppShell from "@/features/auth/AppShell";
import { getCurrentUser } from "@/features/auth/server-auth";
import ReportListPage from "@/features/report/ReportListPage";
import "./reports.css";

export const metadata = {
  title: "Quản lý Phản ánh hiện trường - GeoAI",
};

export default async function ReportsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell user={user} variant="default">
      <main className="reports-page-container">
        <ReportListPage user={user} />
      </main>
    </AppShell>
  );
}
