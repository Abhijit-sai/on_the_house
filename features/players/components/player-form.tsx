"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Save } from "lucide-react";
import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savePlayer } from "@/features/players/actions";
import { playerSchema, type PlayerInput } from "@/features/players/schemas";

export function PlayerForm({
  player,
  onSaved,
}: {
  player?: PlayerInput;
  onSaved?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<PlayerInput>({
    resolver: zodResolver(playerSchema),
    defaultValues: player ?? {
      name: "",
      upiId: "",
    },
  });

  useEffect(() => {
    form.reset(player ?? { name: "", upiId: "" });
  }, [form, player]);

  function onSubmit(values: PlayerInput) {
    startTransition(async () => {
      const result = await savePlayer(values);

      if (!result.ok) {
        form.setError("root", { message: result.message ?? "Could not save player." });
        return;
      }

      form.reset({ name: "", upiId: "" });
      onSaved?.();
    });
  }

  return (
    <Card>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <input type="hidden" {...form.register("id")} />
        <div className="space-y-2">
          <Label htmlFor={player?.id ? `name-${player.id}` : "name"}>Name</Label>
          <Input id={player?.id ? `name-${player.id}` : "name"} placeholder="Rahul" {...form.register("name")} />
          {form.formState.errors.name ? <p className="text-sm text-red-danger">{form.formState.errors.name.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor={player?.id ? `upi-${player.id}` : "upi"}>UPI ID optional</Label>
          <Input id={player?.id ? `upi-${player.id}` : "upi"} placeholder="name@bank" {...form.register("upiId")} />
          {form.formState.errors.upiId ? <p className="text-sm text-red-danger">{form.formState.errors.upiId.message}</p> : null}
        </div>
        {form.formState.errors.root ? (
          <p className="rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">
            {form.formState.errors.root.message}
          </p>
        ) : null}
        <Button className="w-full" disabled={isPending}>
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : player?.id ? <Save className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          {player?.id ? "Save player" : "Add player"}
        </Button>
      </form>
    </Card>
  );
}
