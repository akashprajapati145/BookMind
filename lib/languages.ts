export type Language = {
  code: string;
  label: string;
};

// English is the default and always uses the original, unsuffixed storage path
// (chapters/[slug].json) so existing generated content keeps working unchanged.
// Any language added here beyond English is stored as chapters/[slug].[code].json.
export const LANGUAGES: Language[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "de", label: "German" }
];

export const DEFAULT_LANGUAGE = "en";
