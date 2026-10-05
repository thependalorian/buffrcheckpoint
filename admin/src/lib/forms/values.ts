/** Form text to API value: blank or whitespace-only strings become undefined. */
export function optional(value: string | null | undefined): string | undefined {
  return value?.trim() ? value : undefined;
}
