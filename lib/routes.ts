export const routes = {
  home: "/",
  upload: "/upload",
  library: "/library",
  book: (slug: string) => `/books/${slug}`,
  learn: (slug: string, mode: string) => `/books/${slug}/learn/${mode}`,
  journey: (slug: string) => `/books/${slug}/journey`,
  concepts: (slug: string) => `/books/${slug}/concepts`,
  examples: (slug: string) => `/books/${slug}/examples`,
  chapters: (slug: string) => `/books/${slug}/chapters`,
  actions: (slug: string) => `/books/${slug}/actions`,
  reader: (slug: string) => `/books/${slug}/reader`
};
