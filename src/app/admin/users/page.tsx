"use client";

import UsersClient from "./_components/users-client";
import { Navbar } from "@/components/navbar";

export default function UsersPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <UsersClient />
      </main>
    </div>
  );
}