"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  CardWarm, CardGradient,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, FileText, Hash, TrendingUp, Plus,
  Users, Palette, Sparkles, ArrowRight, ArrowUpRight, Activity, Library,
} from "lucide-react";
import { format } from "date-fns";

interface Stats {
  totalStories: number;
  totalPages: number;
  avgPagesPerStory: number;
  totalWords: number;
  storiesByAgeGroup: { name: string; count: number }[];
  storiesByGenre: { name: string; count: number }[];
  storiesByGender: { name: string; count: number }[];
  recentStories: {
    id: string;
    title: string;
    ageGroup: string;
    genre: string;
    characterGender: string;
    pageCount: number;
    updatedAt: string;
    tagList: { name: string; color: string }[];
  }[];
  tagsCount: number;
}

const genreColors: Record<string, string> = {
  Confidence: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/40",
  Friendship: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40",
  Kindness: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40",
  Adventure: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40",
  STEM: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200/60 dark:border-violet-800/40",
  Creativity: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200/60 dark:border-yellow-800/40",
  Fantasy: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/40",
  Nature: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200/60 dark:border-teal-800/40",
  Family: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300 border-pink-200/60 dark:border-pink-800/40",
  Other: "bg-stone-100 text-stone-800 dark:bg-stone-900/40 dark:text-stone-300 border-stone-200/60 dark:border-stone-800/40",
};

const ageColors: Record<string, string> = {
  "3-4": "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200/60 dark:border-teal-800/40",
  "5-6": "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/40",
  "7-8": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/40",
  "9-10": "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200/60 dark:border-violet-800/40",
  "11-12": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40",
};

interface StatCardProps {
  loading: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  hint: string;
  variant?: "default" | "warm" | "gradient";
  accentClass?: string;
}

function StatCard({ loading, icon: Icon, label, value, hint, variant = "default", accentClass }: StatCardProps) {
  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (variant === "gradient") {
    return (
      <CardGradient className="relative overflow-hidden p-6">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <div className="relative flex items-center justify-between mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/75 mb-1">{label}</p>
          <p className="text-3xl font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
            {value}
          </p>
          <p className="text-xs text-white/75 mt-1">{hint}</p>
        </div>
      </CardGradient>
    );
  }

  if (variant === "warm") {
    return (
      <CardWarm className="relative overflow-hidden p-6 hover-lift">
        <div className="relative flex items-center justify-between mb-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accentClass || "from-accent/40 to-accent/10"} ring-1 ring-accent/20`}>
            <Icon className="h-5 w-5 text-accent-foreground" />
          </div>
        </div>
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground mb-1">{label}</p>
          <p className="text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
            {value}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{hint}</p>
        </div>
      </CardWarm>
    );
  }

  return (
    <Card className="hover-lift overflow-hidden group">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </CardTitle>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${accentClass || "from-primary/15 to-primary/5"} ring-1 ring-primary/15 transition-transform duration-300 group-hover:scale-110`}>
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>
      </CardContent>
    </Card>
  );
}

interface DistributionCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  data: { name: string; count: number }[];
  loading: boolean;
  colorClass: string;
  emptyLabel?: string;
}

function DistributionCard({ title, icon: Icon, data, loading, colorClass, emptyLabel = "No data" }: DistributionCardProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card className="hover-lift">
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/15">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">{emptyLabel}</div>
        ) : (
          <div className="space-y-3.5">
            {data.map((g) => (
              <div key={g.name} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-foreground">{g.name}</span>
                  <span className="text-muted-foreground tabular-nums">{g.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${colorClass} transition-all duration-700 ease-out`}
                    style={{ width: `${(g.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Decorative ambient glow orbs (subtle warmth) */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="glow-orb h-96 w-96 -top-24 -left-24"
          style={{ background: "oklch(0.7 0.11 180)" }}
        />
        <div
          className="glow-orb h-80 w-80 top-1/3 -right-24"
          style={{ background: "oklch(0.78 0.13 65)" }}
        />
        <div
          className="glow-orb h-72 w-72 bottom-0 left-1/3"
          style={{ background: "oklch(0.85 0.05 85)" }}
        />
      </div>

      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 animate-fade-up">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 ring-1 ring-primary/20 text-xs font-medium text-primary">
              <Activity className="h-3 w-3" />
              <span>Studio overview</span>
            </div>
            <h1
              className="text-4xl sm:text-5xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Welcome to your{" "}
              <span className="text-gradient-static">story studio</span>
            </h1>
            <p className="text-muted-foreground text-base max-w-xl leading-relaxed">
              Craft, organize, and publish engaging children&apos;s stories — a calm
              workspace built for storytellers.
            </p>
          </div>
          <Link href="/stories/new">
            <Button variant="gradient" size="lg" className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              New Story
              <ArrowUpRight className="h-4 w-4 opacity-80" />
            </Button>
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 animate-fade-up [animation-delay:60ms]">
          <StatCard
            loading={loading}
            icon={Library}
            label="Total Stories"
            value={stats?.totalStories || 0}
            hint="Across all age groups"
            variant="gradient"
          />
          <StatCard
            loading={loading}
            icon={FileText}
            label="Total Pages"
            value={stats?.totalPages || 0}
            hint={`Avg ${stats?.avgPagesPerStory || 0} pages per story`}
            variant="warm"
            accentClass="from-amber-200/70 to-amber-100/30"
          />
          <StatCard
            loading={loading}
            icon={Sparkles}
            label="Genres"
            value={stats?.storiesByGenre?.length || 0}
            hint="Different genre types"
            accentClass="from-chart-2/25 to-chart-2/5"
          />
          <StatCard
            loading={loading}
            icon={Hash}
            label="Tags"
            value={stats?.tagsCount || 0}
            hint="Custom tags available"
            accentClass="from-chart-5/25 to-chart-5/5"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10 animate-fade-up [animation-delay:120ms]">
          <DistributionCard
            title="By Age Group"
            icon={Users}
            data={stats?.storiesByAgeGroup || []}
            loading={loading}
            colorClass="from-chart-1 to-chart-4"
          />
          <DistributionCard
            title="By Genre"
            icon={Palette}
            data={stats?.storiesByGenre || []}
            loading={loading}
            colorClass="from-chart-2 to-chart-5"
          />
          <DistributionCard
            title="Character Gender"
            icon={TrendingUp}
            data={stats?.storiesByGender || []}
            loading={loading}
            colorClass="from-chart-4 to-chart-3"
          />
        </div>

        {/* Recent Stories */}
        <Card className="animate-fade-up [animation-delay:180ms] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Recent Stories
              </CardTitle>
              <CardDescription>Your latest updates</CardDescription>
            </div>
            <Link href="/stories">
              <Button variant="outline" size="sm" className="gap-1.5">
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-3">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (stats?.recentStories?.length ?? 0) === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/15 flex items-center justify-center">
                  <BookOpen className="h-7 w-7 text-primary" />
                </div>
                <p className="font-medium text-foreground">No stories yet</p>
                <p className="text-sm mt-1">Create your first story to get started.</p>
                <Link href="/stories/new" className="inline-block mt-4">
                  <Button variant="soft" size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    New Story
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {(stats?.recentStories ?? []).map((story, idx) => (
                  <Link
                    key={story.id}
                    href={`/stories/${story.id}`}
                    className="group flex items-center gap-4 p-3 rounded-xl hover:bg-accent/40 transition-all duration-200"
                    style={{ animation: `fade-up 0.5s cubic-bezier(0.16,1,0.3,1) ${idx * 60}ms both` }}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient shadow-glow shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3">
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-semibold truncate group-hover:text-primary transition-colors"
                        style={{ fontFamily: "var(--font-fraunces)" }}
                      >
                        {story.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <Badge variant="secondary" className={`text-[10px] h-5 px-2 font-medium border ${ageColors[story.ageGroup] || ""}`}>
                          Ages {story.ageGroup}
                        </Badge>
                        <Badge variant="secondary" className={`text-[10px] h-5 px-2 font-medium border ${genreColors[story.genre] || ""}`}>
                          {story.genre}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-1">
                          {story.pageCount} pages
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0 hidden sm:flex flex-col items-end gap-1">
                      <span>{format(new Date(story.updatedAt), "MMM d, yyyy")}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-0 -translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 text-primary" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
