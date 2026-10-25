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
import { WEEKDAY_LABELS } from "@/lib/labels";

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
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateTontineFormValues, unknown, CreateTontineInput>({
    resolver: zodResolver(createTontineSchema),
    defaultValues: {
      frequency: "WEEKLY",
      customWeekdays: [],
      feeAmountXof: 0,
      latePenaltyAmountXof: 0,
      latePenaltyGraceDays: 0,
      startDate: defaultStartDate as unknown as Date,
      beneficiarySelectionMode: "FIXED",
    },
  });

  const frequency = watch("frequency");
  const customWeekdays = (watch("customWeekdays") ?? []) as number[];

  function toggleWeekday(day: number) {
    const next = customWeekdays.includes(day)
      ? customWeekdays.filter((d) => d !== day)
      : [...customWeekdays, day].sort((a: number, b: number) => a - b);
    setValue("customWeekdays", next, { shouldValidate: true });
  }

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
            <option value="CUSTOM_WEEKLY">Jours personnalisés (ex : mardi + samedi)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startDate">Date de démarrage</Label>
          <Input id="startDate" type="date" {...register("startDate")} />
          {errors.startDate && <p className="text-sm text-red-600">{errors.startDate.message}</p>}
        </div>
      </div>

      {frequency === "CUSTOM_WEEKLY" && (
        <div className="flex flex-col gap-1.5">
          <Label>Jours des tours</Label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(WEEKDAY_LABELS).map(([day, label]) => {
              const dayNum = Number(day);
              const checked = customWeekdays.includes(dayNum);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleWeekday(dayNum)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    checked
                      ? "bg-emerald-800 text-white"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {errors.customWeekdays && (
            <p className="text-sm text-red-600">{errors.customWeekdays.message}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="latePenaltyAmountXof">Pénalité de retard (FCFA, 0 = désactivée)</Label>
          <Input
            id="latePenaltyAmountXof"
            type="number"
            min={0}
            {...register("latePenaltyAmountXof")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="latePenaltyGraceDays">Délai de grâce (jours)</Label>
          <Input
            id="latePenaltyGraceDays"
            type="number"
            min={0}
            {...register("latePenaltyGraceDays")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="beneficiarySelectionMode">Désignation du bénéficiaire à chaque tour</Label>
        <select
          id="beneficiarySelectionMode"
          className="h-11 rounded-lg border border-stone-300 bg-white px-3"
          {...register("beneficiarySelectionMode")}
        >
          <option value="FIXED">Ordre fixe, défini une fois pour toutes</option>
          <option value="VOTE">Vote collectif avant chaque tour</option>
        </select>
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
