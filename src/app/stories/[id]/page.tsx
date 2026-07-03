"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ArrowLeft, Edit, MoreVertical, Trash2, Copy, FileDown,
  Calendar, Hash, Users, Palette, Copy as CopyIcon, StickyNote, ImageIcon, FileText
} from "lucide-react";
import { format } from "date-fns";
import { exportToPDF, exportToDocx } from "@/lib/export";

interface StoryPage {
  id: string;
  pageNumber: number;
  sceneDescription: string | null;
  storyText: string;
  imagePrompt: string | null;
  notes: string | null;
}

interface Story {
  id: string;
  title: string;
  ageGroup: string;
  genre: string;
  characterGender: string;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
  pages: StoryPage[];
  tagList: { name: string; color: string }[];
}

const genreColors: Record<string, string> = {
  Confidence: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Friendship: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  Kindness: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Adventure: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  STEM: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  Creativity: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  Fantasy: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  Nature: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  Family: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  Other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export default function StoryViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/stories/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => setStory(data))
      .catch(() => {
        toast.error("Story not found");
        router.push("/stories");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/stories/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Story deleted");
        router.push("/stories");
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Connection error");
    }
  };

  const handleDuplicate = async () => {
    try {
      const res = await fetch(`/api/stories/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success("Story duplicated");
        router.push(`/stories/${data.id}`);
      }
    } catch {
      toast.error("Failed to duplicate");
    }
  };

  const handleExport = async (format: "pdf" | "docx") => {
    if (!story) return;
    try {
      toast.loading(`Preparing ${format.toUpperCase()}...`, { id: "export" });
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

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
          <Skeleton className="h-9 w-32 mb-6" />
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!story) return null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => router.push("/stories")} className="mb-6 gap-1.5 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Stories
        </Button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 animate-fade-up">
          <div className="flex-1 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 ring-1 ring-primary/20 text-xs font-medium text-primary">
              <FileText className="h-3 w-3" />
              <span>Story</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              {story.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs font-medium">
                Ages {story.ageGroup}
              </Badge>
              <Badge variant="secondary" className={`text-xs font-medium border ${genreColors[story.genre] || ""}`}>
                {story.genre}
              </Badge>
              <Badge variant="outline" className="text-xs">{story.characterGender}</Badge>
              <Badge variant="outline" className="text-xs gap-1">
                <Hash className="h-3 w-3" /> {story.pageCount} pages
              </Badge>
            </div>
            {story.tagList && story.tagList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {story.tagList.map((tag) => (
                  <Badge key={tag.name} variant="outline" className="gap-1.5 text-xs" style={{ borderColor: tag.color }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/stories/${id}/edit`)} className="gap-1.5">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="h-4 w-4 mr-2" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport("pdf")}>
                  <FileDown className="h-4 w-4 mr-2" /> Export PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("docx")}>
                  <FileDown className="h-4 w-4 mr-2" /> Export DOCX
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 animate-fade-up [animation-delay:60ms]">
          <Card className="hover-lift">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-chart-1/20 to-chart-1/5 ring-1 ring-chart-1/20 shrink-0">
                <Users className="h-4 w-4 text-chart-1" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Age Group</p>
                <p className="font-semibold truncate">{story.ageGroup}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover-lift">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-chart-2/20 to-chart-2/5 ring-1 ring-chart-2/20 shrink-0">
                <Palette className="h-4 w-4 text-chart-2" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Genre</p>
                <p className="font-semibold truncate">{story.genre}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover-lift">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-chart-3/20 to-chart-3/5 ring-1 ring-chart-3/20 shrink-0">
                <Hash className="h-4 w-4 text-chart-3" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Pages</p>
                <p className="font-semibold truncate">{story.pageCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover-lift">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-chart-4/20 to-chart-4/5 ring-1 ring-chart-4/20 shrink-0">
                <Calendar className="h-4 w-4 text-chart-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Created</p>
                <p className="font-semibold truncate">{format(new Date(story.createdAt), "MMM d, yyyy")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pages */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Story Pages</h2>
            <span className="text-sm text-muted-foreground">{story.pages.length} pages</span>
          </div>

          {story.pages.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No pages yet. Edit this story to add pages.</p>
              </CardContent>
            </Card>
          ) : (
            story.pages.map((page) => (
              <Card key={page.id} className="overflow-hidden">
                <CardHeader className="bg-muted/30 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Page {page.pageNumber}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => copyToClipboard(page.storyText, "Story text")}
                    >
                      <CopyIcon className="h-3.5 w-3.5" />
                      Copy
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Story Text - always present */}
                  <div>
                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> Story Text
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{page.storyText}</p>
                  </div>

                  {/* Scene Description */}
                  {page.sceneDescription && (
                    <div className="pt-3 border-t">
                      <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5" /> Scene Description
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 ml-auto gap-1 text-xs"
                          onClick={() => copyToClipboard(page.sceneDescription!, "Scene description")}
                        >
                          <CopyIcon className="h-3 w-3" /> Copy
                        </Button>
                      </div>
                      <p className="text-sm italic text-muted-foreground">{page.sceneDescription}</p>
                    </div>
                  )}

                  {/* Image Prompt */}
                  {page.imagePrompt && (
                    <div className="pt-3 border-t">
                      <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5" /> Image Prompt
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 ml-auto gap-1 text-xs"
                          onClick={() => copyToClipboard(page.imagePrompt!, "Image prompt")}
                        >
                          <CopyIcon className="h-3 w-3" /> Copy
                        </Button>
                      </div>
                      <p className="text-sm font-mono bg-muted p-2 rounded">{page.imagePrompt}</p>
                    </div>
                  )}

                  {/* Notes */}
                  {page.notes && (
                    <div className="pt-3 border-t">
                      <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
                        <StickyNote className="h-3.5 w-3.5" /> Notes
                      </div>
                      <p className="text-sm text-muted-foreground">{page.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Delete Dialog */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this story?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete &quot;{story.title}&quot; and all its pages.
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
