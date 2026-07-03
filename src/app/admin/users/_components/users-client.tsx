"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, Search, MoreHorizontal, Trash2, UserCheck, UserX,
  KeyRound, ShieldCheck, Edit3, ChevronLeft, ChevronRight, ShieldAlert,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "editor" | "viewer";
  status: "pending" | "active" | "inactive";
  lastLoginAt: string | null;
  createdAt: string;
  createdById: string | null;
  hasPassword: boolean;
}

interface AuditEntry {
  id: string;
  action: string;
  createdAt: string;
  ip?: string | null;
}

const ROLES: UserRow["role"][] = ["admin", "editor", "viewer"];
const STATUSES: UserRow["status"][] = ["pending", "active", "inactive"];

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

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ id: string; role: string } | null>(null);

  // Filters
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Actions
  const [actionTarget, setActionTarget] = useState<UserRow | null>(null);
  const [actionType, setActionType] = useState<"deactivate" | "activate" | "delete" | "reset" | null>(null);
  const [busy, setBusy] = useState(false);

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRow["role"]>("viewer");
  const [inviteResult, setInviteResult] = useState<{ url?: string; expiresAt: string; emailSent?: boolean } | null>(null);

  const fetchMe = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me");
      if (r.ok) {
        const data = await r.json();
        setMe({ id: data.id, role: data.role });
        if (data.role !== "admin") router.replace("/");
      }
    } catch {}
  }, [router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load users");
        return;
      }
      setUsers(data.users);
      setTotal(data.pagination.total);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [query, roleFilter, statusFilter, page]);

  useEffect(() => { fetchMe(); }, [fetchMe]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const confirmAction = async () => {
    if (!actionTarget || !actionType) return;
    setBusy(true);
    try {
      let res: Response | null = null;
      if (actionType === "delete") {
        res = await fetch(`/api/users/${actionTarget.id}`, { method: "DELETE" });
      } else if (actionType === "deactivate") {
        res = await fetch(`/api/users/${actionTarget.id}/deactivate`, { method: "POST" });
      } else if (actionType === "activate") {
        res = await fetch(`/api/users/${actionTarget.id}/activate`, { method: "POST" });
      } else if (actionType === "reset") {
        res = await fetch(`/api/users/${actionTarget.id}/reset-password`, { method: "POST" });
      }
      if (!res) return;
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }
      if (actionType === "reset" && data.resetUrl) {
        await navigator.clipboard.writeText(data.resetUrl).catch(() => {});
        toast.success("Reset link generated and copied to clipboard");
      } else if (actionType === "reset") {
        toast.success(data.emailSent ? "Password reset email sent" : "Password reset created");
      } else if (actionType === "delete") {
        toast.success("User deleted");
      } else if (actionType === "deactivate") {
        toast.success("User deactivated");
      } else if (actionType === "activate") {
        toast.success("User activated");
      }
      setActionTarget(null);
      setActionType(null);
      fetchUsers();
    } catch {
      toast.error("Connection error");
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inviteName.trim(), email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to invite user");
        return;
      }
      toast.success("Invitation created");
      setInviteResult({ url: data.activationUrl, expiresAt: data.expiresAt, emailSent: data.emailSent });
      setInviteName("");
      setInviteEmail("");
      setInviteRole("viewer");
      fetchUsers();
    } catch {
      toast.error("Connection error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 ring-1 ring-primary/20 text-xs font-medium text-primary">
            <ShieldCheck className="h-3 w-3" />
            <span>Admin · User Management</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Invite users, assign roles, activate or deactivate accounts, and reset passwords.
            Passwords are never visible to anyone — only the user can set their own.
          </p>
        </div>
        <Button variant="gradient" size="lg" className="gap-2" onClick={() => { setShowInvite(true); setInviteResult(null); }}>
          <Plus className="h-4 w-4" />
          Invite user
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                className="pl-9 h-10"
              />
            </div>
            <Select value={roleFilter || "all"} onValueChange={(v) => { setRoleFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter || "all"} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">All users ({total})</CardTitle>
            <CardDescription>Click a row to view activity or change role.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-foreground">No users yet</p>
              <p className="text-sm mt-1">Invite your first teammate to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">
                          {u.name || "—"}
                        </Link>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("capitalize", roleBadgeClass[u.role])}>{u.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("capitalize", statusBadgeClass[u.status])}>{u.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.lastLoginAt ? format(new Date(u.lastLoginAt), "MMM d, yyyy HH:mm") : "Never"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(u.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/admin/users/${u.id}`}>
                          <Button variant="ghost" size="icon" title="View / edit"><Edit3 className="h-4 w-4" /></Button>
                        </Link>
                        {u.status !== "active" ? (
                          <Button variant="ghost" size="icon" title="Activate" onClick={() => { setActionTarget(u); setActionType("activate"); }}>
                            <UserCheck className="h-4 w-4 text-emerald-600" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" title="Deactivate" onClick={() => { setActionTarget(u); setActionType("deactivate"); }}>
                            <UserX className="h-4 w-4 text-amber-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" title="Send password reset" onClick={() => { setActionTarget(u); setActionType("reset"); }}>
                          <KeyRound className="h-4 w-4 text-blue-600" />
                        </Button>
                        {me?.id !== u.id && (
                          <Button variant="ghost" size="icon" title="Delete" onClick={() => { setActionTarget(u); setActionType("delete"); }}>
                            <Trash2 className="h-4 w-4 text-rose-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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

      {/* Invite user modal */}
      <AlertDialog open={showInvite} onOpenChange={setShowInvite}>
        <AlertDialogContent>
          {!inviteResult ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Invite a new user</AlertDialogTitle>
                <AlertDialogDescription>
                  We&apos;ll create the account (no password yet) and generate an activation link.
                  The user must set their own password when they activate.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <form onSubmit={handleInvite} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-name">Full name</Label>
                  <Input id="invite-name" value={inviteName} onChange={(e) => setInviteName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">Email address</Label>
                  <Input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRow["role"])}>
                    <SelectTrigger id="invite-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin — full access</SelectItem>
                      <SelectItem value="editor">Editor — view, create, update stories</SelectItem>
                      <SelectItem value="viewer">Viewer — read-only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <AlertDialogFooter className="pt-2">
                  <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
                  <Button type="submit" variant="gradient" disabled={busy}>
                    {busy ? "Sending…" : "Send invitation"}
                  </Button>
                </AlertDialogFooter>
              </form>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Invitation created</AlertDialogTitle>
                <AlertDialogDescription>
                  {inviteResult.url ? "Share this activation link with the new user. " : inviteResult.emailSent ? "The activation email has been sent. " : "The invitation has been created. "}
                  It expires on{" "}
                  {format(new Date(inviteResult.expiresAt), "MMM d, yyyy HH:mm")}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {inviteResult.url && (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs font-mono break-all">
                  {inviteResult.url}
                </div>
              )}
              <div className="flex gap-2">
                {inviteResult.url && (
                  <Button
                    variant="soft"
                    className="flex-1"
                    onClick={() => navigator.clipboard.writeText(inviteResult.url as string).then(() => toast.success("Copied to clipboard"))}
                  >
                    Copy link
                  </Button>
                )}
                <AlertDialogAction onClick={() => setShowInvite(false)}>Done</AlertDialogAction>
              </div>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* Action confirmation modal */}
      <AlertDialog open={!!actionTarget && !!actionType} onOpenChange={(open) => { if (!open) { setActionTarget(null); setActionType(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {actionType === "delete" && <Trash2 className="h-5 w-5 text-rose-600" />}
              {actionType === "deactivate" && <UserX className="h-5 w-5 text-amber-600" />}
              {actionType === "activate" && <UserCheck className="h-5 w-5 text-emerald-600" />}
              {actionType === "reset" && <KeyRound className="h-5 w-5 text-blue-600" />}
              {actionType === "delete" && "Delete user?"}
              {actionType === "deactivate" && "Deactivate user?"}
              {actionType === "activate" && "Activate user?"}
              {actionType === "reset" && "Send password reset?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "delete" && `This will permanently remove ${actionTarget?.email} and all related data. This cannot be undone.`}
              {actionType === "deactivate" && `They won't be able to log in until reactivated. Their existing sessions will be invalidated.`}
              {actionType === "activate" && `They will regain access to the system immediately.`}
              {actionType === "reset" && `A reset link will be emailed to the user. The link is valid for 1 hour.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => { e.preventDefault(); confirmAction(); }}
              className={cn(
                actionType === "delete" && "bg-rose-600 hover:bg-rose-700",
              )}
            >
              {busy ? "Working…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
