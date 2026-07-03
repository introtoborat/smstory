"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>, mode: "login" | "register") {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData) as Record<string, string>;

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Something went wrong");
        return;
      }

      toast.success(mode === "login" ? "Welcome back!" : "Account created successfully!");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="glow-orb h-[28rem] w-[28rem] -top-40 -left-40"
          style={{ background: "oklch(0.7 0.11 180)" }}
        />
        <div
          className="glow-orb h-[26rem] w-[26rem] top-1/2 -right-40"
          style={{ background: "oklch(0.8 0.13 65)" }}
        />
        <div
          className="glow-orb h-96 w-96 bottom-0 left-1/4"
          style={{ background: "oklch(0.85 0.05 85)" }}
        />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient shadow-glow">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-brand-gradient opacity-30 blur-2xl -z-10" />
          </div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            <span className="text-gradient-static">StoryDB</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2 text-center max-w-xs">
            Children&apos;s Story Studio — a calm place to craft and organize tales.
          </p>
        </div>

        <Card className="glass-strong backdrop-blur-xl">
          <Tabs defaultValue="login" className="w-full">
            <div className="px-6 pt-6">
              <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-muted/60">
                <TabsTrigger value="login" className="data-[state=active]:bg-background data-[state=active]:shadow-soft">
                  Login
                </TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-background data-[state=active]:shadow-soft">
                  Register
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="login" className="mt-0">
              <form onSubmit={(e) => handleSubmit(e, "login")}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Welcome back
                  </CardTitle>
                  <CardDescription>Sign in to your account to continue</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="admin@storydb.com"
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      className="h-11"
                    />
                  </div>

                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                  <a href="/reset-password" className="text-xs text-muted-foreground hover:text-primary">
                    Forgot your password?
                  </a>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-0">
              <form onSubmit={(e) => handleSubmit(e, "register")}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Create an account
                  </CardTitle>
                  <CardDescription>Available only on first-time setup. After that, an admin must invite you.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Name</Label>
                    <Input id="reg-name" name="name" placeholder="Your name" className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      name="password"
                      type="password"
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      className="h-11"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Crafted with care for storytellers.
        </p>
      </div>
    </div>
  );
}