"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import {
  Plus, Search, SlidersHorizontal, MoreVertical, Eye, Edit, Copy,
  Trash2, FileDown, ArrowUpDown, ArrowUp, ArrowDown, X, BookOpen,
} from "lucide-react";
import { format } from "date-fns";
import { exportToPDF, exportToDocx } from "@/lib/export";

interface Story {
  id: string;
  title: string;
  ageGroup: string;
  genre: string;
  characterGender: string;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
  tagList: { name: string; color: string }[];
  _count?: { pages: number };
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Lookup { id: string; name: string; color?: string; order: number }
interface GenreLookup extends Lookup { color: string }

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

type SortField = "title" | "createdAt" | "updatedAt" | "pageCount";

export default function StoriesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><BookOpen className="h-6 w-6 animate-pulse" /></div>}>
      <StoriesPageInner />
    </Suspense>
  );
}

function StoriesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stories, setStories] = useState<Story[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [ageGroups, setAgeGroups] = useState<Lookup[]>([]);
  const [genres, setGenres] = useState<GenreLookup[]>([]);
  const [genders, setGenders] = useState<Lookup[]>([]);

  // Load lookups
  useEffect(() => {
    fetch("/api/settings/lookups")
      .then((r) => r.json())
      .then((data) => {
        if (data.ageGroups) setAgeGroups(data.ageGroups);
        if (data.genres) setGenres(data.genres);
        if (data.genders) setGenders(data.genders);
      })
      .catch(() => {});
  }, []);

  const [filters, setFilters] = useState({
    query: searchParams.get("query") || "",
    ageGroup: searchParams.get("ageGroup") || "all",
    genre: searchParams.get("genre") || "all",
    characterGender: searchParams.get("characterGender") || "all",
    pageMin: searchParams.get("pageMin") || "",
    pageMax: searchParams.get("pageMax") || "",
    sortBy: (searchParams.get("sortBy") as SortField) || "createdAt",
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    page: parseInt(searchParams.get("page") || "1"),
  });

  const fetchStories = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") params.set(key, String(value));
    });

    try {
      const res = await fetch(`/api/stories?${params}`);
      const data = await res.json();
      if (res.ok) {
        setStories(data.stories);
        setPagination(data.pagination);
      } else {
        toast.error(data.error || "Failed to fetch stories");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const updateFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const toggleSort = (field: SortField) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === "desc" ? "asc" : "desc",
      page: 1,
    }));
  };

  const clearFilters = () => {
    setFilters({
      query: "",
      ageGroup: "all",
      genre: "all",
      characterGender: "all",
      pageMin: "",
      pageMax: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 1,
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/stories/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Story deleted");
        fetchStories();
      } else {
        toast.error("Failed to delete story");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setDeleteId(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/stories/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success("Story duplicated");
        router.push(`/stories/${data.id}/edit`);
      } else {
        toast.error("Failed to duplicate");
      }
    } catch {
      toast.error("Connection error");
    }
  };

  const handleExport = async (id: string, format: "pdf" | "docx") => {
    try {
      toast.loading(`Preparing ${format.toUpperCase()}...`, { id: "export" });
      const res = await fetch(`/api/stories/${id}`);
      const story = await res.json();

      if (format === "pdf") {
        await exportToPDF(story);
      } else {
        await exportToDocx(story);
      }
      toast.success(`${format.toUpperCase()} exported`, { id: "export" });
    } catch {
      toast.error("Export failed", { id: "export" });
    }
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(field)}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {children}
      {filters.sortBy === field ? (
        filters.sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );

  const hasActiveFilters = filters.query || filters.ageGroup !== "all" || filters.genre !== "all" ||
    filters.characterGender !== "all" || filters.pageMin || filters.pageMax;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 animate-fade-up">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 ring-1 ring-primary/20 text-xs font-medium text-primary">
              <BookOpen className="h-3 w-3" />
              <span>Library</span>
            </div>
            <h1
              className="text-4xl sm:text-5xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Stories
            </h1>
            <p className="text-muted-foreground text-base">
              {pagination ? `${pagination.total} total stories` : "Manage your stories"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 h-2 w-2 rounded-full bg-primary ring-2 ring-primary/30" />
              )}
            </Button>
            <Link href="/stories/new">
              <Button variant="gradient" size="default" className="gap-2">
                <Plus className="h-4 w-4" />
                New Story
              </Button>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or story text..."
            value={filters.query}
            onChange={(e) => updateFilter("query", e.target.value)}
            className="pl-10"
          />
          {filters.query && (
            <button
              onClick={() => updateFilter("query", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label>Age Group</Label>
                  <Select value={filters.ageGroup} onValueChange={(v) => updateFilter("ageGroup", v)}>
                    <SelectTrigger><SelectValue placeholder="All ages" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All ages</SelectItem>
                      {ageGroups.map((a) => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Genre</Label>
                  <Select value={filters.genre} onValueChange={(v) => updateFilter("genre", v)}>
                    <SelectTrigger><SelectValue placeholder="All genres" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All genres</SelectItem>
                      {genres.map((g) => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Character Gender</Label>
                  <Select value={filters.characterGender} onValueChange={(v) => updateFilter("characterGender", v)}>
                    <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {genders.map((g) => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Page Count Range</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.pageMin}
                      onChange={(e) => updateFilter("pageMin", e.target.value)}
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.pageMax}
                      onChange={(e) => updateFilter("pageMax", e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {hasActiveFilters && (
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5">
                    <X className="h-3.5 w-3.5" />
                    Clear filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]"><SortButton field="title">Title</SortButton></TableHead>
                    <TableHead className="hidden md:table-cell">Age</TableHead>
                    <TableHead className="hidden md:table-cell">Genre</TableHead>
                    <TableHead className="hidden lg:table-cell">Gender</TableHead>
                    <TableHead className="text-center"><SortButton field="pageCount">Pages</SortButton></TableHead>
                    <TableHead className="hidden lg:table-cell"><SortButton field="updatedAt">Updated</SortButton></TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-4 w-48" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : stories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="text-center py-12 text-muted-foreground">
                          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
                          <p className="font-medium">No stories found</p>
                          <p className="text-sm">Try adjusting your filters or create a new story</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    stories.map((story) => (
                      <TableRow key={story.id} className="cursor-pointer" onClick={() => router.push(`/stories/${story.id}`)}>
                        <TableCell>
                          <Link href={`/stories/${story.id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                            {story.title}
                          </Link>
                          {story.tagList && story.tagList.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {story.tagList.slice(0, 3).map((tag) => (
                                <Badge key={tag.name} variant="outline" className="text-[10px] px-1.5 py-0">
                                  {tag.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary">{story.ageGroup}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary" className={genreColors[story.genre] || ""}>
                            {story.genre}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">{story.characterGender}</TableCell>
                        <TableCell className="text-center font-medium">{story._count?.pages || story.pageCount || 0}</TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                          {format(new Date(story.updatedAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/stories/${story.id}`)}>
                                <Eye className="h-4 w-4 mr-2" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/stories/${story.id}/edit`)}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(story.id)}>
                                <Copy className="h-4 w-4 mr-2" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleExport(story.id, "pdf")}>
                                <FileDown className="h-4 w-4 mr-2" /> Export PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExport(story.id, "docx")}>
                                <FileDown className="h-4 w-4 mr-2" /> Export DOCX
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteId(story.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between flex-wrap gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <Pagination className="mx-0">
              <PaginationContent>
                {pagination.page > 1 && (
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => { e.preventDefault(); setFilters((p) => ({ ...p, page: p.page - 1 })); }}
                    />
                  </PaginationItem>
                )}
                {Array.from({ length: pagination.totalPages }).slice(
                  Math.max(0, pagination.page - 3),
                  Math.min(pagination.totalPages, pagination.page + 2)
                ).map((_, idx) => {
                  const pageNum = Math.max(0, pagination.page - 3) + idx + 1;
                  return (
                    <PaginationItem key={pageNum}>
                      <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); setFilters((p) => ({ ...p, page: pageNum })); }}
                        className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm ${
                          pageNum === pagination.page
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                        }`}
                      >
                        {pageNum}
                      </a>
                    </PaginationItem>
                  );
                })}
                {pagination.page < pagination.totalPages && (
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => { e.preventDefault(); setFilters((p) => ({ ...p, page: p.page + 1 })); }}
                    />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {/* Delete Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this story?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the story and all its pages.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
