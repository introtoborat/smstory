"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen, LayoutDashboard, LogOut, Moon, Sun, Menu, X,
  Sparkles, Settings as SettingsIcon, Users, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; name?: string | null; email: string; role?: string } | null>(null);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setUser(data);
      });
  }, []);

  const toggleTheme = () => {
    const newTheme = darkMode ? "light" : "dark";
    setDarkMode(!darkMode);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(newTheme);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/me", { method: "POST" });
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/login");
  };

  const baseLinks = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/stories", label: "Stories", icon: BookOpen },
  ];
  const adminLinks = user?.role === "admin" ? [
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/audit", label: "Audit", icon: Activity },
    { href: "/admin/settings", label: "Settings", icon: SettingsIcon },
  ] : [
    { href: "/admin/settings", label: "Settings", icon: SettingsIcon },
  ];
  const navLinks = [...baseLinks, ...adminLinks];

  if (pathname === "/login") return null;

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 mr-8 group">
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-glow transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="absolute inset-0 rounded-xl bg-brand-gradient opacity-30 blur-lg -z-10" />
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="font-bold text-lg tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
                <span className="text-gradient-static">StoryDB</span>
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
                Story Studio
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {navLinks.map((link) => {
              const active = link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={active ? "soft" : "ghost"}
                    size="sm"
                    className={`gap-2 ${active ? "shadow-soft font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-full hover:bg-accent/60"
              aria-label="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            {user && (
              <div className="hidden sm:flex items-center gap-2.5 pl-2 pr-1 py-1 rounded-full border border-border/70 bg-background/60">
                <div className="h-7 w-7 rounded-full bg-brand-gradient flex items-center justify-center text-xs font-semibold text-white">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium pr-2 max-w-[140px] truncate">
                  {user.name || user.email}
                </span>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border/70 bg-background/95 backdrop-blur-xl animate-fade-in">
            <nav className="flex flex-col gap-1 p-3">
              {navLinks.map((link) => {
                const active = link.href === "/"
                  ? pathname === "/"
                  : pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Button
                      variant={active ? "soft" : "ghost"}
                      size="sm"
                      className="w-full justify-start gap-2"
                    >
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
