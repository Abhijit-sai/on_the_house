"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createHostProfile } from "@/features/hosts/actions";
import { hostOnboardingSchema, type HostOnboardingInput } from "@/features/hosts/schemas";

export function HostOnboardingForm() {
  const [isPending, startTransition] = useTransition();
  const form = useForm<HostOnboardingInput>({
    resolver: zodResolver(hostOnboardingSchema),
    defaultValues: {
      displayName: "",
    },
  });

  function onSubmit(values: HostOnboardingInput) {
    startTransition(async () => {
      const result = await createHostProfile(values);

      if (!result.ok) {
        form.setError("root", { message: result.message ?? "Could not save profile." });
      }
    });
  }

  return (
    <Card>
      <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            autoComplete="name"
            placeholder="Abhijit"
            {...form.register("displayName")}
          />
          {form.formState.errors.displayName ? (
            <p className="text-sm text-red-danger">{form.formState.errors.displayName.message}</p>
          ) : null}
        </div>
        {form.formState.errors.root ? (
          <p className="rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">
            {form.formState.errors.root.message}
          </p>
        ) : null}
        <Button className="w-full" size="lg" disabled={isPending}>
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          Continue
        </Button>
      </form>
    </Card>
  );
}
