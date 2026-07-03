"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus, Trash2, Edit3, Save, X, Palette, Users, Sparkles, ArrowUpDown,
  Settings as SettingsIcon, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- shared types ----------
type Lookup = { id: string; name: string; order: number };
type Genre = Lookup & { color: string };

// ---------- color palette for new genres ----------
const SUGGESTED_COLORS = [
  "#3b82f6", "#ec4899", "#22c55e", "#f97316", "#a855f7",
  "#eab308", "#6366f1", "#10b981", "#f43f5e", "#06b6d4",
  "#8b5cf6", "#14b8a6", "#f59e0b", "#ef4444", "#64748b",
];

function zodMessage(parsed: { error: { issues: { message: string }[] } }): string {
  return parsed.error.issues[0]?.message ?? "Invalid input";
}

// =================================================================
// Genres tab
// =================================================================
function GenresTab() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#6366f1");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchGenres = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/genres");
      const data = await res.json();
      if (res.ok) setGenres(data.genres);
    } catch {
      toast.error("Failed to load genres");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGenres(); }, [fetchGenres]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/settings/genres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create genre");
        return;
      }
      toast.success("Genre added");
      setNewName("");
      setNewColor("#6366f1");
      fetchGenres();
    } catch {
      toast.error("Connection error");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (g: Genre) => {
    setEditingId(g.id);
    setEditName(g.name);
    setEditColor(g.color);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("#6366f1");
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/settings/genres/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update");
        return;
      }
      toast.success("Genre updated");
      cancelEdit();
      fetchGenres();
    } catch {
      toast.error("Connection error");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/settings/genres/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete");
        return;
      }
      toast.success("Genre deleted");
      fetchGenres();
    } catch {
      toast.error("Connection error");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add new */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Add new genre
          </CardTitle>
          <CardDescription>
            Genres appear in story forms, filters, and dashboard stats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label htmlFor="genre-name" className="sr-only">Name</Label>
              <Input
                id="genre-name"
                placeholder="e.g. Mystery, Emotions, Animals…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="genre-color" className="sr-only">Color</Label>
              <div className="flex items-center gap-2 px-3 h-10 rounded-lg border border-input bg-background/60">
                <input
                  id="genre-color"
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="h-6 w-8 rounded cursor-pointer border-0 bg-transparent p-0"
                />
                <span className="text-xs font-mono text-muted-foreground">{newColor}</span>
              </div>
            </div>
            <Button type="submit" variant="gradient" disabled={creating || !newName.trim()} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </form>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SUGGESTED_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={cn(
                  "h-6 w-6 rounded-full ring-2 transition-all",
                  newColor === c ? "ring-foreground scale-110" : "ring-transparent hover:scale-105"
                )}
                style={{ backgroundColor: c }}
                aria-label={`Pick ${c}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Existing genres ({genres.length})</CardTitle>
          <CardDescription>Edit names/colors or remove unused genres.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : genres.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Palette className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No genres yet. Add your first one above.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {genres.map((g) => (
                <div key={g.id} className="flex items-center gap-3 py-3 group">
                  {editingId === g.id ? (
                    <>
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="h-9 w-9 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                      />
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-9 flex-1"
                        autoFocus
                      />
                      <Button size="sm" variant="gradient" onClick={() => saveEdit(g.id)} className="gap-1">
                        <Check className="h-3.5 w-3.5" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit} className="gap-1">
                        <X className="h-3.5 w-3.5" /> Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <div
                        className="h-9 w-9 rounded-lg ring-1 ring-border/60 shrink-0 transition-transform group-hover:scale-105"
                        style={{ backgroundColor: g.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{g.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{g.color}</div>
                      </div>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => startEdit(g)}
                        aria-label="Edit"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setDeleteId(g.id)}
                        aria-label="Delete"
                        title="Delete"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this genre?</AlertDialogTitle>
            <AlertDialogDescription>
              Genres in use by stories cannot be deleted. You&apos;ll be notified if that&apos;s the case.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =================================================================
// Simple lookup tab — Age Groups / Genders
// =================================================================
function LookupTab({
  title,
  description,
  endpoint,
  icon: Icon,
  emptyHint,
}: {
  title: string;
  description: string;
  endpoint: "age-groups" | "genders";
  icon: React.ComponentType<{ className?: string }>;
  emptyHint: string;
}) {
  const [items, setItems] = useState<Lookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/${endpoint}`);
      const data = await res.json();
      if (res.ok) setItems(endpoint === "age-groups" ? data.ageGroups : data.genders);
    } catch {
      toast.error(`Failed to load ${title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }, [endpoint, title]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/settings/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create");
        return;
      }
      toast.success("Added");
      setNewName("");
      fetchItems();
    } catch {
      toast.error("Connection error");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (it: Lookup) => {
    setEditingId(it.id);
    setEditName(it.name);
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/settings/${endpoint}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update");
        return;
      }
      toast.success("Updated");
      setEditingId(null);
      fetchItems();
    } catch {
      toast.error("Connection error");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/settings/${endpoint}/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete");
        return;
      }
      toast.success("Deleted");
      fetchItems();
    } catch {
      toast.error("Connection error");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Add new {title.toLowerCase().replace(/s$/, "")}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-2">
            <Input
              placeholder={emptyHint}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-10 flex-1"
            />
            <Button type="submit" variant="gradient" disabled={creating || !newName.trim()} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Existing {title.toLowerCase()} ({items.length})</CardTitle>
          <CardDescription>Edit names or remove unused values.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Icon className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>None yet. Add your first one above.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 py-3 group">
                  {editingId === it.id ? (
                    <>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-9 flex-1"
                        autoFocus
                      />
                      <Button size="sm" variant="gradient" onClick={() => saveEdit(it.id)} className="gap-1">
                        <Check className="h-3.5 w-3.5" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="gap-1">
                        <X className="h-3.5 w-3.5" /> Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge variant="secondary" className="font-medium">
                        <ArrowUpDown className="h-3 w-3 mr-1 opacity-60" />
                        #{it.order}
                      </Badge>
                      <span className="font-medium flex-1 truncate">{it.name}</span>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => startEdit(it)}
                        aria-label="Edit"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setDeleteId(it.id)}
                        aria-label="Delete"
                        title="Delete"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {title.toLowerCase().replace(/s$/, "")}?</AlertDialogTitle>
            <AlertDialogDescription>
              Values in use by stories cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =================================================================
// Page
// =================================================================
export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 ring-1 ring-primary/20 text-xs font-medium text-primary">
          <SettingsIcon className="h-3 w-3" />
          <span>Settings</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Customization</h1>
        <p className="text-muted-foreground text-base max-w-xl">
          Manage the genres, age groups, and character genders available to writers across the app.
        </p>
      </div>

      <Tabs defaultValue="genres" className="animate-fade-up [animation-delay:60ms]">
        <TabsList className="grid w-full max-w-md grid-cols-3 h-11 p-1">
          <TabsTrigger value="genres" className="gap-1.5 data-[state=active]:shadow-soft">
            <Palette className="h-3.5 w-3.5" />
            Genres
          </TabsTrigger>
          <TabsTrigger value="age-groups" className="gap-1.5 data-[state=active]:shadow-soft">
            <Users className="h-3.5 w-3.5" />
            Ages
          </TabsTrigger>
          <TabsTrigger value="genders" className="gap-1.5 data-[state=active]:shadow-soft">
            <Sparkles className="h-3.5 w-3.5" />
            Genders
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="genres" className="mt-0">
            <GenresTab />
          </TabsContent>
          <TabsContent value="age-groups" className="mt-0">
            <LookupTab
              title="Age Groups"
              description="Used to categorize stories by target age range."
              endpoint="age-groups"
              icon={Users}
              emptyHint="e.g. 4-5, 6-8, Teen…"
            />
          </TabsContent>
          <TabsContent value="genders" className="mt-0">
            <LookupTab
              title="Genders"
              description="Used for the main character&apos;s gender."
              endpoint="genders"
              icon={Sparkles}
              emptyHint="e.g. Male, Female, Non-binary…"
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
