"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, Loader2, KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

// Two-stage page: ask for email, then (if a ?token= is in the URL) let the
// user enter a new password. Without a token we just send the request.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requested, setRequested] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/password-resets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to request reset");
        return;
      }
      setRequested(true);
      if (data.resetUrl) {
        toast.success("Reset link generated");
        await navigator.clipboard.writeText(data.resetUrl).catch(() => {});
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
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
      const res = await fetch("/api/password-resets/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to reset password");
        return;
      }
      toast.success("Password updated. Please log in.");
      router.push("/login");
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
          <h1 className="text-3xl font-bold tracking-tight">Reset password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {token ? "Set a new password" : "We'll send you a reset link"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{token ? "New password" : "Forgot your password?"}</CardTitle>
            <CardDescription>
              {token
                ? "Enter and confirm your new password below."
                : "Enter the email associated with your account. We'll send you a secure link to reset your password."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!token ? (
              requested ? (
                <div className="text-center py-4 space-y-3">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-600" />
                  <p className="text-sm">If that account exists, a reset link has been sent.</p>
                  <Link href="/login" className="text-xs text-primary hover:underline">Back to login</Link>
                </div>
              ) : (
                <form onSubmit={handleRequest} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <Button type="submit" variant="gradient" disabled={submitting} className="w-full gap-2">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    Send reset link
                  </Button>
                  <Link href="/login" className="block text-center text-xs text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="inline h-3 w-3 mr-1" /> Back to login
                  </Link>
                </form>
              )
            ) : (
              <form onSubmit={handleConfirm} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="np">New password</Label>
                  <Input id="np" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cp">Confirm password</Label>
                  <Input id="cp" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                </div>
                <Button type="submit" variant="gradient" disabled={submitting} className="w-full gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Update password
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}