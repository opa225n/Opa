"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { createTontineSchema, type CreateTontineInput } from "@/lib/validations/tontine";
import { createTontineAction } from "@/app/actions/tontines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

type CreateTontineFormValues = z.input<typeof createTontineSchema>;

export function CreateTontineForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [defaultStartDate] = useState(() =>
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTontineFormValues, unknown, CreateTontineInput>({
    resolver: zodResolver(createTontineSchema),
    defaultValues: {
      frequency: "WEEKLY",
      feeAmountXof: 0,
      startDate: defaultStartDate as unknown as Date,
    },
  });

  async function onSubmit(values: CreateTontineInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await createTontineAction(values);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      router.push(`/tontines/${result.data.id}/membres`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {serverError && <Alert variant="destructive">{serverError}</Alert>}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nom de la tontine</Label>
        <Input id="name" placeholder="Ex : Tontine des collègues" {...register("name")} />
        {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description (facultatif)</Label>
        <Input id="description" {...register("description")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contributionAmountXof">Montant de cotisation (FCFA)</Label>
          <Input id="contributionAmountXof" type="number" min={1} {...register("contributionAmountXof")} />
          {errors.contributionAmountXof && (
            <p className="text-sm text-red-600">{errors.contributionAmountXof.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="feeAmountXof">Frais par cotisation (FCFA)</Label>
          <Input id="feeAmountXof" type="number" min={0} {...register("feeAmountXof")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="frequency">Fréquence</Label>
          <select
            id="frequency"
            className="h-11 rounded-lg border border-stone-300 bg-white px-3"
            {...register("frequency")}
          >
            <option value="DAILY">Quotidienne</option>
            <option value="WEEKLY">Hebdomadaire</option>
            <option value="MONTHLY">Mensuelle</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startDate">Date de démarrage</Label>
          <Input id="startDate" type="date" {...register("startDate")} />
          {errors.startDate && <p className="text-sm text-red-600">{errors.startDate.message}</p>}
        </div>
      </div>

      <Alert>
        Vous pourrez ajouter les membres et définir l&apos;ordre des bénéficiaires à l&apos;étape
        suivante, avant de démarrer la tontine.
      </Alert>

      <Button type="submit" disabled={submitting} size="lg">
        {submitting ? "Création..." : "Créer la tontine"}
      </Button>
    </form>
  );
}
