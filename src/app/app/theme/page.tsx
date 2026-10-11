import { requireUser } from "@/lib/auth";
import { Notice, PageHeader } from "@/components/ui";
import ThemeStudio from "./ThemeStudio";

export default async function ThemePage() {
  const { profile } = await requireUser("/app/theme");
  return (
    <>
      <PageHeader eyebrow="Materialverse" title="Theme Studio" subtitle="Fifteen curated palettes, twelve material families, and performance, motion and density modes. Preferences apply instantly and persist on this device; your saved palette also follows your login." />
      <Notice tone="info">Every palette meets contrast requirements for body text; buy/sell and profit/loss colours stay distinguishable in all of them, including High Contrast.</Notice>
      <div className="mt-5"><ThemeStudio savedTheme={profile?.theme ?? "midnight-sovereign"} /></div>
    </>
  );
}
