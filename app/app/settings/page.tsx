import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-black text-white">Settings</h1>
      <Card>
        <CardTitle>Host settings</CardTitle>
        <CardDescription className="mt-2">
          Display name, motion, sound, haptics, and sign-out controls will be expanded after the foundation is stable.
        </CardDescription>
      </Card>
    </div>
  );
}
