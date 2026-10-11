import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAccount, getKyc } from "@/lib/account";
import { Notice, PageHeader } from "@/components/ui";
import OnboardingForm from "./OnboardingForm";

export default async function Onboarding() {
  const { supabase, user, profile } = await requireUser("/app/onboarding");
  const [account, kyc] = await Promise.all([getAccount(supabase, user.id), getKyc(supabase, user.id)]);
  if (account) redirect("/app");
  return (
    <>
      <PageHeader eyebrow="Onboarding" title="Simulated KYC application" subtitle="What a real application collects, minus document uploads, KRA/CKYC verification, eSign and in-person verification. Those integrations are external dependencies and are listed as such in the requirements register." />
      {kyc?.status === "under_review" ? (
        <Notice tone="info">Your application is in the compliance review queue. You will be notified when it is approved.</Notice>
      ) : (
        <>
          {kyc?.status === "rejected" && <div className="mb-4"><Notice tone="bad">Previous application rejected: {kyc.rejection_reason}</Notice></div>}
          <OnboardingForm defaultName={profile?.full_name ?? ""} />
        </>
      )}
    </>
  );
}
