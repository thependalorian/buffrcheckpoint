/** Copy for the check-in form builder: the purpose note asked for every field above the basic class. */
export const formBuilderCopy = {
  purposeNote: {
    label: "Why do you ask for this?",
    placeholder: "For example: needed to match the vehicle at the gate",
    required: "Publishing needs a reason of at least 10 characters for every field above the basic class.",
  },
} as const;

/** True when a field of this class must carry a purpose note before the form can be published. */
export function needsPurposeNote(classificationCode: string): boolean {
  return classificationCode !== "core" && classificationCode !== "basic";
}

/** True when the note is long enough to publish. */
export function purposeNoteIsValid(note: string | null | undefined): boolean {
  return (note?.trim().length ?? 0) >= 10;
}
