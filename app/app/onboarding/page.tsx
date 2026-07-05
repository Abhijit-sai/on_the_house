import { redirect } from "next/navigation";
import { getCurrentHost } from "@/features/hosts/queries";
import { HostOnboardingForm } from "@/features/hosts/components/host-onboarding-form";

export default async function OnboardingPage() {
  const host = await getCurrentHost();

  if (host) {
    redirect("/app/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gold-brand">First round</p>
        <h1 className="text-3xl font-black text-white">Set up your host profile</h1>
        <p className="leading-6 text-muted">
          This name appears on your private game-night controls and shared read-only links.
        </p>
      </div>
      <HostOnboardingForm />
    </div>
  );
}
