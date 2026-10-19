import Link from "next/link";
import { TontineLogo } from "@/components/brand/logo";

export const metadata = { title: "Conditions d'utilisation — Tontine CI" };

export default function CguPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <Link href="/">
          <TontineLogo size="md" />
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16">
        <h1 className="font-display text-3xl font-semibold text-[var(--foreground)]">
          Conditions générales d&apos;utilisation
        </h1>
        <p className="mt-2 text-sm text-stone-500">Dernière mise à jour : 19 octobre 2026</p>

        <div className="mt-8 flex flex-col gap-6 text-stone-700 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[var(--foreground)] [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
          <section>
            <h2>1. Objet</h2>
            <p>
              Tontine CI est un outil numérique de gestion et de suivi de tontines (cotisations,
              calendrier des bénéficiaires, paiements, historique). Tontine CI est un service de{" "}
              <strong>traçabilité et d&apos;organisation</strong> : il ne détient, ne gère ni ne
              transfère aucun fonds. Les cotisations et versements entre membres se font
              directement entre eux (espèces, Mobile Money ou autre moyen choisi par le groupe) ;
              Tontine CI n&apos;est à aucun moment dépositaire de cet argent.
            </p>
          </section>

          <section>
            <h2>2. Acceptation</h2>
            <p>
              L&apos;utilisation de Tontine CI implique l&apos;acceptation pleine et entière des
              présentes conditions, ainsi que de la{" "}
              <Link href="/confidentialite" className="text-brand underline-offset-4 hover:underline">
                politique de confidentialité
              </Link>
              . Le service est réservé aux personnes âgées de 18 ans ou plus, capables de
              s&apos;engager contractuellement.
            </p>
          </section>

          <section>
            <h2>3. Compte utilisateur</h2>
            <p>
              La création d&apos;un compte nécessite un numéro de téléphone et un mot de passe.
              Vous êtes seul responsable de la confidentialité de vos identifiants et de toute
              activité effectuée depuis votre compte. Vous vous engagez à fournir des informations
              exactes et à nous signaler toute utilisation non autorisée de votre compte.
            </p>
          </section>

          <section>
            <h2>4. Fonctionnement des tontines</h2>
            <p>
              Chaque tontine est créée et administrée par ses propres membres (responsable,
              trésorier, membres), selon les règles qu&apos;ils définissent entre eux dans
              l&apos;application. Tontine CI fournit les outils de suivi (calendrier, montants
              attendus, validations) mais n&apos;intervient pas dans les décisions du groupe, ne
              vérifie pas l&apos;identité des membres au-delà des informations déclarées à
              l&apos;inscription, et n&apos;arbitre pas les litiges entre membres.
            </p>
          </section>

          <section>
            <h2>5. Paiements et Mobile Money</h2>
            <p>
              Les paiements en espèces se déclarent manuellement dans l&apos;application et sont
              validés par le responsable ou le trésorier de la tontine. L&apos;intégration Mobile
              Money peut fonctionner en <strong>mode démonstration</strong> tant qu&apos;aucun
              prestataire de paiement réel n&apos;est activé : dans ce mode, clairement indiqué
              dans l&apos;interface, aucun transfert d&apos;argent réel n&apos;a lieu. Tontine CI
              n&apos;est responsable d&apos;aucune perte liée à un paiement effectué en dehors de
              l&apos;application ou à une erreur de déclaration par un utilisateur.
            </p>
          </section>

          <section>
            <h2>6. Suspension et résiliation</h2>
            <p>
              Vous pouvez cesser d&apos;utiliser le service à tout moment. Tontine CI peut
              suspendre ou résilier un compte en cas d&apos;usage frauduleux, de non-respect des
              présentes conditions, ou sur demande légale. Vous pouvez demander la suppression de
              votre compte et de vos données en nous contactant à l&apos;adresse ci-dessous.
            </p>
          </section>

          <section>
            <h2>7. Limitation de responsabilité</h2>
            <p>
              Tontine CI est fourni en l&apos;état, sans garantie de disponibilité continue ou
              d&apos;absence d&apos;erreur. Dans la mesure permise par la loi, Tontine CI ne peut
              être tenu responsable des pertes financières résultant des accords pris entre membres
              d&apos;une tontine, d&apos;une déclaration de paiement incorrecte par un utilisateur,
              ou d&apos;une interruption temporaire du service.
            </p>
          </section>

          <section>
            <h2>8. Droit applicable</h2>
            <p>
              Les présentes conditions sont régies par le droit ivoirien. Tout litige relatif à
              leur interprétation ou leur exécution relève des juridictions compétentes de Côte
              d&apos;Ivoire, sauf disposition légale impérative contraire.
            </p>
          </section>

          <section>
            <h2>9. Modification</h2>
            <p>
              Ces conditions peuvent être mises à jour ; la date de dernière mise à jour en haut de
              cette page est actualisée en conséquence. En cas de changement important, les
              utilisateurs en seront informés via l&apos;application.
            </p>
          </section>

          <section>
            <h2>10. Contact</h2>
            <p>
              Pour toute question relative à ces conditions : <strong>vaniebigohiroland@gmail.com</strong>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
