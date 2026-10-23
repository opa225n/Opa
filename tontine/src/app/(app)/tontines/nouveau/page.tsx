import { PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreateTontineForm } from "./create-tontine-form";

export default function NewTontinePage() {
  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4 text-[var(--brand-gold)]" /> Créer une tontine rotative
          </CardTitle>
          <CardDescription>
            Chaque membre cotise le même montant à chaque tour ; un bénéficiaire différent reçoit
            la cagnotte à chaque tour.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateTontineForm />
        </CardContent>
      </Card>
    </div>
  );
}
