"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, ListPlus } from "lucide-react";
import { addToPlanner, toggleSaved } from "@/lib/actions/library";

export function SaveActions({
  universityId,
  programId,
  saved,
  planned,
  signedIn,
}: {
  universityId: string;
  programId?: string | null;
  saved: boolean;
  planned: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(saved);
  const [isPlanned, setIsPlanned] = useState(planned);
  const [pending, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <button type="button" className="btn" onClick={() => router.push("/login")}>
        <Bookmark size={15} /> Sign in to save
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={isSaved ? "btn btn-accent" : "btn"}
        disabled={pending}
        onClick={() => {
          const next = !isSaved;
          setIsSaved(next);
          startTransition(async () => {
            try {
              await toggleSaved(universityId);
            } catch {
              setIsSaved(!next);
            }
          });
        }}
      >
        {isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
        {isSaved ? "Saved" : "Save"}
      </button>

      <button
        type="button"
        className="btn"
        disabled={pending || isPlanned}
        onClick={() => {
          setIsPlanned(true);
          startTransition(async () => {
            const result = await addToPlanner(universityId, programId ?? null);
            if (!result || "error" in result) setIsPlanned(false);
            else router.push("/planner");
          });
        }}
      >
        <ListPlus size={15} /> {isPlanned ? "In your planner" : "Add to planner"}
      </button>
    </div>
  );
}
