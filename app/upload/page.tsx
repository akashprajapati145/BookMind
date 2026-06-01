import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { PageHeader } from "@/components/page-header";

export default function UploadPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Upload"
        title="Create a knowledge package"
        description="The upload workflow is the next MVP milestone. This screen preserves the primary action and processing promise from the product context."
      />
      <GlassCard className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-3xl font-bold text-on-primary">
          +
        </div>
        <h2 className="font-display text-4xl font-bold text-on-background">Upload PDF</h2>
        <p className="mt-4 max-w-xl leading-7 text-on-surface-variant">
          Soon this will save the PDF into `storage/books/`, extract text, and generate markdown knowledge under
          `storage/knowledge/`.
        </p>
        <button className="mt-8 rounded-full bg-primary px-6 py-3 font-bold text-on-primary" type="button">
          Choose PDF
        </button>
      </GlassCard>
    </AppShell>
  );
}
