"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, ShieldCheck, User as UserIcon, Calendar, Activity } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "editor" | "viewer";
  status: "pending" | "active" | "inactive";
  lastLoginAt: string | null;
  createdAt: string;
  createdById: string | null;
  createdBy?: { id: string; name: string | null; email: string } | null;
  hasPassword: boolean;
}

interface AuditLog {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  metadata: string | null;
  ip: string | null;
  createdAt: string;
  actor: { id: string; name: string | null; email: string; role: string } | null;
}

const roleBadgeClass: Record<string, string> = {
  admin: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800/40",
  editor: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800/40",
  viewer: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700/40",
};
const statusBadgeClass: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800/40",
  pending: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800/40",
  inactive: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/40 dark:text-zinc-300 dark:border-zinc-700/40",
};

const ACTION_LABELS: Record<string, string> = {
  login: "Logged in",
  logout: "Logged out",
  login_failed: "Failed login attempt",
  "user.create": "Created user",
  "user.update": "Updated user",
  "user.delete": "Deleted user",
  "user.activate": "Activated user",
  "user.deactivate": "Deactivated user",
  "user.role_change": "Changed role",
  "password.change": "Changed password",
  "password.reset_request": "Requested password reset",
  "password.reset_complete": "Completed password reset",
  "invitation.sent": "Sent invitation",
  "invitation.accepted": "Accepted invitation",
  "story.create": "Created story",
  "story.update": "Updated story",
  "story.delete": "Deleted story",
};

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [user, setUser] = useState<UserDetail | null>(null);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserDetail["role"]>("viewer");
  const [status, setStatus] = useState<UserDetail["status"]>("active");

  const load = async () => {
    setLoading(true);
    try {
      const [u, a] = await Promise.all([
        fetch(`/api/users/${id}`).then((r) => r.json()),
        fetch(`/api/audit?targetUserId=${id}&limit=20`).then((r) => r.json()),
      ]);
      if (u.error) {
        toast.error(u.error);
        return;
      }
      setUser(u.user);
      setAudit(a.logs || []);
      setName(u.user.name || "");
      setEmail(u.user.email);
      setRole(u.user.role);
      setStatus(u.user.status);
    } catch {
      toast.error("Failed to load user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update");
        return;
      }
      toast.success("User updated");
      load();
    } catch {
      toast.error("Connection error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return <div className="text-center text-muted-foreground py-12">User not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to users
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-primary" /> User details
            </CardTitle>
            <CardDescription>Update name, email, role, or status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="u-name">Full name</Label>
                <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-email">Email</Label>
                <Input id="u-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as UserDetail["role"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as UserDetail["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="gradient" onClick={save} disabled={saving} className="gap-1.5">
                <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className={cn("capitalize", statusBadgeClass[user.status])}>{user.status}</Badge>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Role</span>
              <Badge variant="outline" className={cn("capitalize", roleBadgeClass[user.role])}>{user.role}</Badge>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Password set</span>
              <span>{user.hasPassword ? "Yes (hashed)" : "Not yet"}</span>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Last login</span>
              <span>{user.lastLoginAt ? format(new Date(user.lastLoginAt), "MMM d, HH:mm") : "Never"}</span>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Created</span>
              <span>{format(new Date(user.createdAt), "MMM d, yyyy")}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Activity log
          </CardTitle>
          <CardDescription>Most recent 20 actions involving this user.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {audit.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No activity recorded yet.</div>
          ) : (
            <ul className="divide-y divide-border/40">
              {audit.map((a) => (
                <li key={a.id} className="p-4 flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10 shrink-0">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{ACTION_LABELS[a.action] || a.action}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(a.createdAt), "MMM d, yyyy HH:mm:ss")}
                      {a.ip ? ` · ${a.ip}` : ""}
                      {a.actor ? ` · by ${a.actor.name || a.actor.email}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}