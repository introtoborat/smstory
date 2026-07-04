"use client";

import SettingsClient from "./_components/settings-client";
import { Navbar } from "@/components/navbar";

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
        <SettingsClient />
      </main>
    </div>
  );
}
