export function shouldInitializeProfileEditDraft(
  initializedUserExtId: string | null,
  nextUserExtId: string | null | undefined,
): boolean {
  return Boolean(nextUserExtId) && initializedUserExtId !== nextUserExtId;
}
