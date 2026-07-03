"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function ActivatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <ActivateForm />
    </Suspense>
  );
}

function ActivateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [info, setInfo] = useState<{ email: string; name: string | null; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Missing invitation token");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/invitations/preview?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Invalid invitation");
          return;
        }
        setInfo(data);
      } catch {
        setError("Failed to load invitation");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to activate account");
        return;
      }
      toast.success("Account activated — welcome!");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Connection error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="glow-orb h-[28rem] w-[28rem] -top-40 -left-40" style={{ background: "oklch(0.65 0.22 273)" }} />
        <div className="glow-orb h-[26rem] w-[26rem] top-1/2 -right-40" style={{ background: "oklch(0.65 0.22 320)" }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-up">
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient shadow-glow">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Activate your account</h1>
          <p className="text-sm text-muted-foreground mt-1">Set a password to get started</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Welcome{info?.name ? `, ${info.name}` : ""}!</CardTitle>
            <CardDescription>
              {info ? (
                <>You were invited as <span className="font-medium">{info.email}</span>.</>
              ) : loading ? (
                "Loading invitation…"
              ) : (
                <span className="text-rose-600">{error}</span>
              )}
            </CardDescription>
          </CardHeader>
          {!info && !loading && (
            <CardContent className="text-sm text-muted-foreground">
              Please request a new invitation link from your administrator.
            </CardContent>
          )}
          {info && (
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                  <p className="text-xs text-muted-foreground">Minimum 8 characters. Choose something strong.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                </div>
                <Button type="submit" variant="gradient" disabled={submitting} className="w-full gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Activate account
                </Button>
              </form>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}