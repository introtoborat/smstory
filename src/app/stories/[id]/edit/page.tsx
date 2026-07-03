import { use } from "react";
import { StoryEditor } from "@/components/story-editor";

export default function EditStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StoryEditor storyId={id} />;
}
