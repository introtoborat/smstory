"use client";

interface StoryPage {
  pageNumber: number;
  storyText: string;
  sceneDescription?: string | null;
  imagePrompt?: string | null;
  notes?: string | null;
}

interface StoryData {
  id: string;
  title: string;
  ageGroup: string;
  genre: string;
  characterGender: string;
  pages: StoryPage[];
}

/**
 * Export a story to PDF by calling the server-side export API.
 * The server generates the actual binary file and returns it as a download.
 */
export async function exportToPDF(story: StoryData) {
  const response = await fetch(`/api/export/${story.id}?format=pdf`, {
    credentials: "include",
    headers: {
      "X-CSRF-Token": getCsrfToken(),
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Export failed" }));
    throw new Error(err.error || "Export failed");
  }

  const blob = await response.blob();
  downloadBlob(blob, `${story.title}.pdf`);
}

/**
 * Export a story to DOCX by calling the server-side export API.
 * The server generates the actual binary file and returns it as a download.
 */
export async function exportToDocx(story: StoryData) {
  const response = await fetch(`/api/export/${story.id}?format=docx`, {
    credentials: "include",
    headers: {
      "X-CSRF-Token": getCsrfToken(),
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Export failed" }));
    throw new Error(err.error || "Export failed");
  }

  const blob = await response.blob();
  downloadBlob(blob, `${story.title}.docx`);
}

/** Read the CSRF token from the cookie for client-side API calls. */
function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match ? match[1] : "";
}

/** Trigger a browser file download from a blob. */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
