import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { PageHeader } from "@/components/page-header";
import { UploadForm } from "@/components/upload-form";

export default function UploadPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Upload"
        title="Create a knowledge package"
        description="The upload workflow is the next MVP milestone. This screen preserves the primary action and processing promise from the product context."
      />
      <GlassCard className="flex min-h-[520px] flex-col items-center justify-center p-8 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-3xl font-bold text-on-primary">
          +
        </div>
        <h2 className="font-display text-4xl font-bold text-on-background">Upload PDF</h2>
        <p className="mt-4 max-w-xl leading-7 text-on-surface-variant">
          Save the PDF into local storage and add it to your library. Extraction and generation are the next milestones.
        </p>
        <div className="mt-8 w-full">
          <UploadForm />
        </div>
      </GlassCard>
    </AppShell>
  );
}
