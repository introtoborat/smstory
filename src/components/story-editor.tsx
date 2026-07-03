"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextEditor } from "@/components/rich-text-editor";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, Save, ChevronUp, ChevronDown, X,
  GripVertical, Loader2, Copy, Settings as SettingsIcon,
} from "lucide-react";
import Link from "next/link";

interface Lookup { id: string; name: string; color?: string; order: number }

interface PageData {
  id?: string;
  pageNumber: number;
  sceneDescription: string;
  storyText: string;
  imagePrompt: string;
  notes: string;
  _isNew?: boolean;
  _isDirty?: boolean;
}

interface StoryEditorProps {
  storyId?: string;
}

export function StoryEditor({ storyId }: StoryEditorProps) {
  const router = useRouter();
  const isEdit = !!storyId;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deletePageId, setDeletePageId] = useState<string | number | null>(null);

  const [title, setTitle] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [genre, setGenre] = useState("");
  const [characterGender, setCharacterGender] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [pages, setPages] = useState<PageData[]>([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>("");

  const [ageGroups, setAgeGroups] = useState<Lookup[]>([]);
  const [genres, setGenres] = useState<Lookup[]>([]);
  const [genders, setGenders] = useState<Lookup[]>([]);

  // Load lookup data
  useEffect(() => {
    fetch("/api/settings/lookups")
      .then((r) => r.json())
      .then((data) => {
        if (data.genres) setGenres(data.genres);
        if (data.ageGroups) setAgeGroups(data.ageGroups);
        if (data.genders) setGenders(data.genders);
      })
      .catch(() => toast.error("Failed to load options"));
  }, []);

  // Load existing story
  useEffect(() => {
    if (!storyId) return;
    fetch(`/api/stories/${storyId}`)
      .then((r) => r.json())
      .then((data) => {
        setTitle(data.title);
        setAgeGroup(data.ageGroup);
        setGenre(data.genre);
        setCharacterGender(data.characterGender);
        setTags(data.tagList?.map((t: { name: string }) => t.name) || []);
        setPages(
          data.pages?.map((p: PageData) => ({
            ...p,
            sceneDescription: p.sceneDescription || "",
            imagePrompt: p.imagePrompt || "",
            notes: p.notes || "",
          })) || []
        );
      })
      .catch(() => toast.error("Failed to load story"))
      .finally(() => setLoading(false));
  }, [storyId]);

  // Autosave draft
  useEffect(() => {
    if (!isEdit && !title && pages.length === 0) return;

    const timer = setTimeout(() => {
      const draftData = JSON.stringify({ title, ageGroup, genre, characterGender, tags, pages });
      setAutoSaveStatus("Saving draft...");
      fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: storyId || undefined, data: draftData }),
      })
        .then(() => setAutoSaveStatus("Draft saved"))
        .catch(() => setAutoSaveStatus("Draft save failed"));
    }, 5000);

    return () => clearTimeout(timer);
  }, [title, ageGroup, genre, characterGender, tags, pages, isEdit, storyId]);

  const handleAddPage = () => {
    const newPage: PageData = {
      pageNumber: pages.length + 1,
      sceneDescription: "",
      storyText: "",
      imagePrompt: "",
      notes: "",
      _isNew: true,
      _isDirty: true,
    };
    setPages([...pages, newPage]);
  };

  const updatePage = (index: number, field: keyof PageData, value: string) => {
    setPages(pages.map((p, i) => (i === index ? { ...p, [field]: value, _isDirty: true } : p)));
  };

  const handleDeletePage = (index: number) => {
    const page = pages[index];
    if (page.id) {
      setDeletePageId(page.id);
    } else {
      const filtered = pages.filter((_, i) => i !== index);
      setPages(filtered.map((p, i) => ({ ...p, pageNumber: i + 1 })));
    }
  };

  const confirmDeletePage = async () => {
    if (!deletePageId || !storyId) {
      // Local delete only
      const index = pages.findIndex((p) => p.id === deletePageId || p.pageNumber === deletePageId);
      if (index >= 0) {
        const filtered = pages.filter((_, i) => i !== index);
        setPages(filtered.map((p, i) => ({ ...p, pageNumber: i + 1 })));
      }
      setDeletePageId(null);
      return;
    }

    try {
      const res = await fetch(`/api/pages/${deletePageId}`, { method: "DELETE" });
      if (res.ok) {
        const index = pages.findIndex((p) => p.id === deletePageId);
        const filtered = pages.filter((_, i) => i !== index);
        setPages(filtered.map((p, i) => ({ ...p, pageNumber: i + 1 })));
        toast.success("Page deleted");
      }
    } catch {
      toast.error("Failed to delete page");
    }
    setDeletePageId(null);
  };

  const movePage = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= pages.length) return;

    const newPages = [...pages];
    [newPages[index], newPages[newIndex]] = [newPages[newIndex], newPages[index]];
    setPages(newPages.map((p, i) => ({ ...p, pageNumber: i + 1, _isDirty: true })));

    // If both pages have IDs, persist reorder
    if (storyId && newPages[index].id && newPages[newIndex].id) {
      fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pages: newPages.filter(p => p.id).map((p) => ({ id: p.id, pageNumber: p.pageNumber })),
        }),
      }).catch(() => {});
    }
  };

  const duplicatePage = (index: number) => {
    const pageToCopy = pages[index];
    const newPage: PageData = {
      ...pageToCopy,
      id: undefined,
      _isNew: true,
      _isDirty: true,
    };
    const newPages = [...pages];
    newPages.splice(index + 1, 0, newPage);
    setPages(newPages.map((p, i) => ({ ...p, pageNumber: i + 1 })));
    toast.success("Page duplicated");
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const validate = () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return false;
    }
    if (!ageGroup) {
      toast.error("Age group is required");
      return false;
    }
    if (!genre) {
      toast.error("Genre is required");
      return false;
    }
    if (!characterGender) {
      toast.error("Character gender is required");
      return false;
    }
    for (const page of pages) {
      if (!page.storyText.trim()) {
        toast.error(`Page ${page.pageNumber}: Story text is required`);
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      // 1. Save or update story
      const storyBody = { title, ageGroup, genre, characterGender, tags };
      let savedStoryId = storyId;

      if (isEdit) {
        const res = await fetch(`/api/stories/${storyId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(storyBody),
        });
        if (!res.ok) throw new Error("Failed to save story");
      } else {
        const res = await fetch("/api/stories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(storyBody),
        });
        if (!res.ok) throw new Error("Failed to create story");
        const data = await res.json();
        savedStoryId = data.id;
      }

      // 2. Save pages
      for (const page of pages) {
        if (page._isNew) {
          // Create new page
          await fetch("/api/pages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...page, storyId: savedStoryId }),
          });
        } else if (page._isDirty && page.id) {
          // Update existing page
          await fetch(`/api/pages/${page.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sceneDescription: page.sceneDescription,
              storyText: page.storyText,
              imagePrompt: page.imagePrompt,
              notes: page.notes,
              pageNumber: page.pageNumber,
            }),
          });
        }
      }

      // 3. Persist page reordering for all pages
      const pagesWithIds = pages.filter((p) => p.id);
      if (pagesWithIds.length > 0 && isEdit) {
        await fetch("/api/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pages: pagesWithIds.map((p) => ({ id: p.id, pageNumber: p.pageNumber })),
          }),
        });
      }

      toast.success(isEdit ? "Story updated" : "Story created");
      router.push(`/stories/${savedStoryId}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save story");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
          <Skeleton className="h-9 w-32 mb-6" />
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-64 w-full mb-4" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-up">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{isEdit ? "Edit Story" : "New Story"}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEdit ? "Update your story details and pages" : "Start crafting your story"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {autoSaveStatus && (
              <span className="text-xs text-muted-foreground hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border/60">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                {autoSaveStatus}
              </span>
            )}
            <Button onClick={handleSave} disabled={saving} variant="gradient" className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEdit ? "Save Changes" : "Create Story"}
            </Button>
          </div>
        </div>

        {/* Story Metadata */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Story Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Story Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter story title..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Age Group *</Label>
                  <Link href="/admin/settings" className="text-[10px] text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                    <SettingsIcon className="h-2.5 w-2.5" /> Manage
                  </Link>
                </div>
                <Select value={ageGroup} onValueChange={setAgeGroup}>
                  <SelectTrigger><SelectValue placeholder="Select age group" /></SelectTrigger>
                  <SelectContent>
                    {ageGroups.length === 0 ? (
                      <SelectItem value="__loading" disabled>Loading…</SelectItem>
                    ) : ageGroups.map((a) => (
                      <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Genre *</Label>
                  <Link href="/admin/settings" className="text-[10px] text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                    <SettingsIcon className="h-2.5 w-2.5" /> Manage
                  </Link>
                </div>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger><SelectValue placeholder="Select genre" /></SelectTrigger>
                  <SelectContent>
                    {genres.length === 0 ? (
                      <SelectItem value="__loading" disabled>Loading…</SelectItem>
                    ) : genres.map((g) => (
                      <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Character Gender *</Label>
                  <Link href="/admin/settings" className="text-[10px] text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                    <SettingsIcon className="h-2.5 w-2.5" /> Manage
                  </Link>
                </div>
                <Select value={characterGender} onValueChange={setCharacterGender}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    {genders.length === 0 ? (
                      <SelectItem value="__loading" disabled>Loading…</SelectItem>
                    ) : genders.map((g) => (
                      <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="Add a tag and press Enter..."
                />
                <Button type="button" variant="outline" onClick={addTag} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pages */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Pages ({pages.length})</h2>
          <Button variant="outline" size="sm" onClick={handleAddPage} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Page
          </Button>
        </div>

        {pages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="mb-3">No pages yet. Add your first page to start writing.</p>
              <Button onClick={handleAddPage} variant="outline" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add First Page
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pages.map((page, index) => (
              <Card key={page.id || `new-${index}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">Page {page.pageNumber}</CardTitle>
                      {page._isNew && (
                        <Badge variant="outline" className="text-xs">New</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => movePage(index, "up")}
                        disabled={index === 0}
                        title="Move up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => movePage(index, "down")}
                        disabled={index === pages.length - 1}
                        title="Move down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => duplicatePage(index)}
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeletePage(index)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Story Text *</Label>
                    <RichTextEditor
                      value={page.storyText}
                      onChange={(html) => updatePage(index, "storyText", html)}
                      placeholder="Write the story text for this page..."
                      minHeight={150}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Scene Description (Optional)</Label>
                    <Textarea
                      value={page.sceneDescription}
                      onChange={(e) => updatePage(index, "sceneDescription", e.target.value)}
                      placeholder="Describe the visual scene for this page..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Image Prompt (Optional)</Label>
                    <Textarea
                      value={page.imagePrompt}
                      onChange={(e) => updatePage(index, "imagePrompt", e.target.value)}
                      placeholder="AI image generation prompt..."
                      rows={2}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={page.notes}
                      onChange={(e) => updatePage(index, "notes", e.target.value)}
                      placeholder="Internal notes for this page..."
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" onClick={handleAddPage} className="w-full gap-1.5 border-dashed">
              <Plus className="h-4 w-4" />
              Add Another Page
            </Button>
          </div>
        )}

        {/* Sticky save bar at bottom on mobile */}
        <div className="h-16" />

        {/* Delete page confirmation */}
        <AlertDialog open={deletePageId !== null} onOpenChange={(open) => !open && setDeletePageId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this page?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The page will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeletePage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
