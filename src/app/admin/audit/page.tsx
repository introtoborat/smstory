"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Activity, Search, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AuditEntry {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  metadata: string | null;
  ip: string | null;
  createdAt: string;
  actor: { id: string; name: string | null; email: string; role: string } | null;
}

const ACTION_OPTIONS = [
  "login", "logout", "login_failed",
  "user.create", "user.update", "user.delete", "user.activate", "user.deactivate", "user.role_change",
  "password.change", "password.reset_request", "password.reset_complete",
  "invitation.sent", "invitation.accepted",
  "story.create", "story.update", "story.delete",
];

const ACTION_LABELS: Record<string, string> = {
  login: "Logged in",
  logout: "Logged out",
  login_failed: "Failed login",
  "user.create": "User created",
  "user.update": "User updated",
  "user.delete": "User deleted",
  "user.activate": "User activated",
  "user.deactivate": "User deactivated",
  "user.role_change": "Role changed",
  "password.change": "Password changed",
  "password.reset_request": "Reset requested",
  "password.reset_complete": "Reset completed",
  "invitation.sent": "Invitation sent",
  "invitation.accepted": "Invitation accepted",
  "story.create": "Story created",
  "story.update": "Story updated",
  "story.delete": "Story deleted",
};

const ACTION_COLORS: Record<string, string> = {
  login: "bg-emerald-100 text-emerald-700",
  logout: "bg-slate-100 text-slate-700",
  login_failed: "bg-rose-100 text-rose-700",
  "user.create": "bg-blue-100 text-blue-700",
  "user.update": "bg-amber-100 text-amber-700",
  "user.delete": "bg-rose-100 text-rose-700",
  "user.activate": "bg-emerald-100 text-emerald-700",
  "user.deactivate": "bg-amber-100 text-amber-700",
  "user.role_change": "bg-purple-100 text-purple-700",
  "password.change": "bg-indigo-100 text-indigo-700",
  "password.reset_request": "bg-cyan-100 text-cyan-700",
  "password.reset_complete": "bg-teal-100 text-teal-700",
  "invitation.sent": "bg-blue-100 text-blue-700",
  "invitation.accepted": "bg-emerald-100 text-emerald-700",
  "story.create": "bg-blue-100 text-blue-700",
  "story.update": "bg-amber-100 text-amber-700",
  "story.delete": "bg-rose-100 text-rose-700",
};

export default function AuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/me");
      if (r.ok) {
        const data = await r.json();
        if (data.role !== "admin") router.replace("/");
      }
    })();
  }, [router]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (action) params.set("action", action);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await fetch(`/api/audit?${params}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load audit log");
        return;
      }
      setLogs(data.logs);
      setTotal(data.pagination.total);
    } catch {
      toast.error("Failed to load audit log");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [query, action, page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 ring-1 ring-primary/20 text-xs font-medium text-primary">
          <Activity className="h-3 w-3" />
          <span>Audit log</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Activity log</h1>
        <p className="text-muted-foreground text-sm max-w-xl">
          Every login, user change, story edit, and password event — captured for compliance.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search action, entity, IP…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                className="pl-9 h-10"
              />
            </div>
            <Select value={action || "all"} onValueChange={(v) => { setAction(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {ACTION_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entries ({total})</CardTitle>
          <CardDescription>Sorted by most recent.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No entries match your filters.</div>
          ) : (
            <ul className="divide-y divide-border/40">
              {logs.map((l) => (
                <li key={l.id} className="p-4 flex items-center gap-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${ACTION_COLORS[l.action] || "bg-slate-100 text-slate-700"}`}>
                    {ACTION_LABELS[l.action] || l.action}
                  </span>
                  <div className="flex-1 min-w-0 text-sm">
                    <div className="truncate">
                      {l.actor ? (
                        <span className="font-medium">{l.actor.name || l.actor.email}</span>
                      ) : (
                        <span className="text-muted-foreground italic">System / anonymous</span>
                      )}
                      {l.entity ? <span className="text-muted-foreground"> · {l.entity}{l.entityId ? ` ${l.entityId.slice(0, 6)}…` : ""}</span> : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(l.createdAt), "MMM d, yyyy HH:mm:ss")}
                      {l.ip ? ` · ${l.ip}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border/60">
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
      </main>
    </div>
  );
}