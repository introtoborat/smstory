"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Mail, User as UserIcon, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Me {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  lastLoginAt: string | null;
}

export default function AccountPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/me");
      if (!r.ok) {
        router.replace("/login");
        return;
      }
      setMe(await r.json());
      setLoading(false);
    })();
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to change password");
        return;
      }
      toast.success("Password updated. Please sign in again.");
      // The API invalidated all sessions; kick the user back to login.
      setTimeout(() => {
        document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        router.push("/login");
      }, 600);
    } catch {
      toast.error("Connection error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !me) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-48 bg-muted rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 ring-1 ring-primary/20 text-xs font-medium text-primary">
            <UserIcon className="h-3 w-3" />
            <span>My account</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Account</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{me.name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium flex items-center gap-1.5"><Mail className="h-3 w-3" />{me.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <Badge variant="outline" className="capitalize">{me.role}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className="capitalize">{me.status}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last login</span>
              <span>{me.lastLoginAt ? format(new Date(me.lastLoginAt), "MMM d, yyyy HH:mm") : "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" /> Change password
            </CardTitle>
            <CardDescription>
              Pick a strong password with at least 8 characters. After changing,
              you'll be signed out of all devices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="cur">Current password</Label>
                <Input id="cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nxt">New password</Label>
                <Input id="nxt" type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cf">Confirm new password</Label>
                <Input id="cf" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              <Button type="submit" variant="gradient" disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>

        {me.role === "admin" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admin shortcuts</CardTitle>
              <CardDescription>Manage users and review audit activity.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button variant="soft" onClick={() => router.push("/admin/users")}>Manage users</Button>
              <Button variant="soft" onClick={() => router.push("/admin/audit")}>View audit log</Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}