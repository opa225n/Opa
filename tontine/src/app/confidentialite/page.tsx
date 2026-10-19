import Link from "next/link";
import { TontineLogo } from "@/components/brand/logo";

export const metadata = { title: "Politique de confidentialité — Tontine CI" };

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <Link href="/">
          <TontineLogo size="md" />
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16">
        <h1 className="font-display text-3xl font-semibold text-[var(--foreground)]">
          Politique de confidentialité
        </h1>
        <p className="mt-2 text-sm text-stone-500">Dernière mise à jour : 19 octobre 2026</p>

        <div className="mt-8 flex flex-col gap-6 text-stone-700 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[var(--foreground)] [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
          <section>
            <h2>1. Responsable du traitement</h2>
            <p>
              Tontine CI est édité par Vanié Bi Gohi Roland. Pour toute question relative à vos
              données personnelles : <strong>vaniebigohiroland@gmail.com</strong>
            </p>
          </section>

          <section>
            <h2>2. Données collectées</h2>
            <ul>
              <li>Données de compte : nom complet, numéro de téléphone, email (optionnel), pays, mot de passe (jamais stocké en clair, uniquement sous forme hachée)</li>
              <li>Données de tontine : nom et description des tontines, montants de cotisation, calendrier, rôle des membres</li>
              <li>Données de cotisation et de paiement : montants déclarés et confirmés, méthode, horodatage, références de transaction</li>
              <li>Journal d&apos;audit : actions effectuées dans l&apos;application, horodatées, pour la traçabilité des opérations financières du groupe</li>
            </ul>
          </section>

          <section>
            <h2>3. Finalités</h2>
            <p>
              Ces données sont utilisées exclusivement pour : créer et sécuriser votre compte,
              faire fonctionner les tontines auxquelles vous participez (calendrier, suivi des
              cotisations, notifications), assurer la traçabilité des opérations entre membres, et
              vous contacter en cas de nécessité (ex : réinitialisation de mot de passe).
            </p>
          </section>

          <section>
            <h2>4. Base légale</h2>
            <p>
              Le traitement repose sur l&apos;exécution du service que vous avez demandé en créant
              un compte (base contractuelle), et sur l&apos;intérêt légitime de Tontine CI à
              assurer la sécurité et la traçabilité du service.
            </p>
          </section>

          <section>
            <h2>5. Destinataires et hébergement</h2>
            <p>
              Vos données sont hébergées chez Supabase (base de données PostgreSQL, région
              Europe) et l&apos;application est servie via Vercel. Les emails transactionnels (ex :
              réinitialisation de mot de passe) sont envoyés via Bird. Aucune donnée n&apos;est
              vendue ni partagée à des fins publicitaires. Seuls les membres d&apos;une même
              tontine voient les données relatives à cette tontine.
            </p>
          </section>

          <section>
            <h2>6. Transfert de données</h2>
            <p>
              L&apos;hébergement de la base de données se situe en Union européenne, alors que la
              majorité des utilisateurs se trouvent en Côte d&apos;Ivoire ; ce transfert est limité
              au strict nécessaire pour faire fonctionner le service et est encadré par les
              engagements contractuels de nos hébergeurs en matière de protection des données.
            </p>
          </section>

          <section>
            <h2>7. Durée de conservation</h2>
            <p>
              Vos données sont conservées tant que votre compte est actif. En cas de suppression de
              compte, les données d&apos;identification sont supprimées ; les données liées aux
              tontines auxquelles vous avez participé peuvent être conservées sous forme anonymisée
              dans l&apos;historique du groupe, pour la traçabilité due aux autres membres.
            </p>
          </section>

          <section>
            <h2>8. Sécurité</h2>
            <p>
              Les mots de passe sont stockés sous forme hachée (bcrypt), les communications sont
              chiffrées (HTTPS), et l&apos;accès aux données d&apos;une tontine est strictement
              limité à ses membres actifs.
            </p>
          </section>

          <section>
            <h2>9. Vos droits</h2>
            <p>
              Conformément à la loi ivoirienne n°2013-450 relative à la protection des données à
              caractère personnel, vous disposez d&apos;un droit d&apos;accès, de rectification,
              de suppression et d&apos;opposition sur vos données. Pour exercer ces droits, ou pour
              toute réclamation, contactez-nous à l&apos;adresse ci-dessus ; vous pouvez également
              saisir l&apos;Autorité de Régulation des Télécommunications/TIC de Côte d&apos;Ivoire
              (ARTCI).
            </p>
          </section>

          <section>
            <h2>10. Cookies</h2>
            <p>
              Tontine CI utilise uniquement un cookie de session nécessaire à l&apos;authentification
              (connexion). Aucun cookie publicitaire ou de traçage tiers n&apos;est utilisé.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
