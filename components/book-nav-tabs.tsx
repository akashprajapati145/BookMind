import Link from "next/link";
import { routes } from "@/lib/routes";

type BookNavTabsProps = {
  slug: string;
  active: "overview" | "chapters";
};

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "chapters", label: "Chapters" }
] as const;

export function BookNavTabs({ slug, active }: BookNavTabsProps) {
  return (
    <div className="mb-8 flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const href = tab.key === "overview" ? routes.book(slug) : routes.chapters(slug);
        const isActive = tab.key === active;

        return (
          <Link
            key={tab.key}
            href={href}
            className={
              isActive
                ? "rounded-full bg-primary px-5 py-3 font-bold text-on-primary"
                : "glass rounded-full px-5 py-3 font-bold text-on-surface-variant hover:text-on-background"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
