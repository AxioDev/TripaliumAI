import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'fr' ? 'Politique de confidentialité - TripaliumAI' : 'Privacy Policy - TripaliumAI',
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (locale === 'fr') {
    return <PrivacyContentFR />;
  }
  return <PrivacyContentEN />;
}

function PrivacyContentEN() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-4xl mx-auto">
      <h1>Privacy Policy</h1>
      <p className="lead">Last updated: January 2026</p>

      <p>
        TripaliumAI (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your privacy.
        This Privacy Policy explains how we collect, use, disclose, and safeguard your information
        when you use our job search automation platform.
      </p>

      <h2>1. Data Controller</h2>
      <p>
        TripaliumAI is the data controller for the personal data processed through this platform.
      </p>
      <p>
        <strong>Contact:</strong> privacy@tripalium.projets.work
      </p>

      <h2>2. Information We Collect</h2>
      <h3>2.1 Information You Provide</h3>
      <ul>
        <li><strong>Account Information:</strong> Email address and password when you create an account</li>
        <li><strong>Profile Information:</strong> Name, phone number, location, professional summary, LinkedIn URL, website</li>
        <li><strong>CV/Resume Data:</strong> Work experience, education, skills, certifications, languages</li>
        <li><strong>Campaign Settings:</strong> Target roles, locations, salary preferences, job search criteria</li>
        <li><strong>Applications:</strong> Job applications you create and submit through our platform</li>
      </ul>

      <h3>2.2 Information Collected Automatically</h3>
      <ul>
        <li><strong>Usage Data:</strong> Actions you take on the platform (login, profile updates, job applications)</li>
        <li><strong>Technical Data:</strong> IP address, browser type, device information</li>
      </ul>

      <h2>3. Legal Basis for Processing (GDPR)</h2>
      <p>We process your personal data based on:</p>
      <ul>
        <li><strong>Consent (Article 6(1)(a)):</strong> You consent to processing when you create an account and accept this Privacy Policy</li>
        <li><strong>Contract Performance (Article 6(1)(b)):</strong> Processing necessary to provide our job search automation services</li>
        <li><strong>Legitimate Interest (Article 6(1)(f)):</strong> For security, fraud prevention, and service improvement</li>
      </ul>

      <h2>4. How We Use Your Information</h2>
      <ul>
        <li>To provide job search automation services</li>
        <li>To parse and analyze your CV to match you with relevant jobs</li>
        <li>To generate tailored CVs and cover letters for job applications</li>
        <li>To send job applications on your behalf (when authorized)</li>
        <li>To improve our AI matching and document generation algorithms</li>
        <li>To communicate service updates and notifications</li>
        <li>To comply with legal obligations</li>
      </ul>

      <h2>5. Third-Party Processors</h2>
      <p>We share your data with the following third-party processors:</p>
      <ul>
        <li><strong>OpenAI:</strong> For CV parsing and document generation (AI processing)</li>
        <li><strong>Job Boards:</strong> RemoteOK, Welcome to the Jungle, Indeed (for job discovery and applications)</li>
        <li><strong>Hosting Provider:</strong> Hetzner (data storage)</li>
      </ul>

      <h2>6. Data Retention</h2>
      <ul>
        <li><strong>Account Data:</strong> Retained until you delete your account</li>
        <li><strong>Activity Logs:</strong> Retained for 365 days</li>
        <li><strong>Email Records:</strong> Retained for 90 days</li>
        <li><strong>Deleted Accounts:</strong> Soft-deleted accounts are permanently deleted after 30 days</li>
      </ul>

      <h2>7. Your Rights (GDPR)</h2>
      <p>Under GDPR, you have the following rights:</p>
      <ul>
        <li><strong>Access (Article 15):</strong> Request a copy of your personal data</li>
        <li><strong>Rectification (Article 16):</strong> Correct inaccurate personal data</li>
        <li><strong>Erasure (Article 17):</strong> Delete your account and all associated data</li>
        <li><strong>Data Portability (Article 20):</strong> Export your data in a machine-readable format</li>
        <li><strong>Objection (Article 21):</strong> Object to certain processing activities</li>
        <li><strong>Withdraw Consent:</strong> Withdraw consent at any time by deleting your account</li>
      </ul>

      <h3>How to Exercise Your Rights</h3>
      <ul>
        <li><strong>Export Data:</strong> Go to Settings &gt; Danger Zone &gt; Export My Data</li>
        <li><strong>Delete Account:</strong> Go to Settings &gt; Danger Zone &gt; Delete Account</li>
        <li><strong>Other Requests:</strong> Contact privacy@tripalium.projets.work</li>
      </ul>

      <h2>8. Data Security</h2>
      <p>
        We implement appropriate technical and organizational measures to protect your personal data,
        including encryption in transit (HTTPS), secure password hashing, and access controls.
      </p>

      <h2>9. International Transfers</h2>
      <p>
        Your data may be processed by OpenAI in the United States. Such transfers are covered by
        appropriate safeguards including Standard Contractual Clauses.
      </p>

      <h2>10. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of significant changes
        by email or through the platform. The version number and date will be updated accordingly.
      </p>

      <h2>11. Contact Us</h2>
      <p>
        For any questions about this Privacy Policy or our data practices, please contact us at:
      </p>
      <p>
        <strong>Email:</strong> privacy@tripalium.projets.work
      </p>

      <h2>12. Supervisory Authority</h2>
      <p>
        If you are in France, you have the right to lodge a complaint with the CNIL (Commission
        Nationale de l&apos;Informatique et des Libertés) at www.cnil.fr.
      </p>
    </article>
  );
}

function PrivacyContentFR() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-4xl mx-auto">
      <h1>Politique de confidentialité</h1>
      <p className="lead">Dernière mise à jour : Janvier 2026</p>

      <p>
        TripaliumAI (&quot;nous&quot;, &quot;notre&quot;) s&apos;engage à protéger votre vie privée.
        Cette Politique de confidentialité explique comment nous collectons, utilisons, divulguons
        et protégeons vos informations lorsque vous utilisez notre plateforme d&apos;automatisation
        de recherche d&apos;emploi.
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        TripaliumAI est le responsable du traitement des données personnelles collectées via cette plateforme.
      </p>
      <p>
        <strong>Contact :</strong> privacy@tripalium.projets.work
      </p>

      <h2>2. Données collectées</h2>
      <h3>2.1 Données que vous fournissez</h3>
      <ul>
        <li><strong>Informations de compte :</strong> Adresse e-mail et mot de passe lors de la création de compte</li>
        <li><strong>Informations de profil :</strong> Nom, téléphone, lieu, résumé professionnel, URL LinkedIn, site web</li>
        <li><strong>Données CV :</strong> Expérience professionnelle, formation, compétences, certifications, langues</li>
        <li><strong>Paramètres de campagne :</strong> Postes cibles, lieux, préférences salariales, critères de recherche</li>
        <li><strong>Candidatures :</strong> Les candidatures que vous créez et soumettez via notre plateforme</li>
      </ul>

      <h3>2.2 Données collectées automatiquement</h3>
      <ul>
        <li><strong>Données d&apos;utilisation :</strong> Actions effectuées sur la plateforme (connexion, mises à jour du profil, candidatures)</li>
        <li><strong>Données techniques :</strong> Adresse IP, type de navigateur, informations sur l&apos;appareil</li>
      </ul>

      <h2>3. Base juridique du traitement (RGPD)</h2>
      <p>Nous traitons vos données personnelles sur la base de :</p>
      <ul>
        <li><strong>Consentement (Article 6(1)(a)) :</strong> Vous consentez au traitement lors de la création de compte et l&apos;acceptation de cette Politique</li>
        <li><strong>Exécution du contrat (Article 6(1)(b)) :</strong> Traitement nécessaire pour fournir nos services d&apos;automatisation</li>
        <li><strong>Intérêt légitime (Article 6(1)(f)) :</strong> Pour la sécurité, la prévention de la fraude et l&apos;amélioration du service</li>
      </ul>

      <h2>4. Utilisation de vos données</h2>
      <ul>
        <li>Fournir des services d&apos;automatisation de recherche d&apos;emploi</li>
        <li>Analyser votre CV pour vous faire correspondre avec des emplois pertinents</li>
        <li>Générer des CV et lettres de motivation personnalisés</li>
        <li>Envoyer des candidatures en votre nom (lorsque autorisé)</li>
        <li>Améliorer nos algorithmes de correspondance et de génération de documents</li>
        <li>Communiquer les mises à jour et notifications du service</li>
        <li>Respecter les obligations légales</li>
      </ul>

      <h2>5. Sous-traitants</h2>
      <p>Nous partageons vos données avec les sous-traitants suivants :</p>
      <ul>
        <li><strong>OpenAI :</strong> Pour l&apos;analyse de CV et la génération de documents (traitement IA)</li>
        <li><strong>Sites d&apos;emploi :</strong> RemoteOK, Welcome to the Jungle, Indeed (découverte d&apos;emplois et candidatures)</li>
        <li><strong>Hébergeur :</strong> Hetzner (stockage des données)</li>
      </ul>

      <h2>6. Conservation des données</h2>
      <ul>
        <li><strong>Données de compte :</strong> Conservées jusqu&apos;à la suppression de votre compte</li>
        <li><strong>Journaux d&apos;activité :</strong> Conservés pendant 365 jours</li>
        <li><strong>Enregistrements d&apos;e-mails :</strong> Conservés pendant 90 jours</li>
        <li><strong>Comptes supprimés :</strong> Les comptes supprimés sont définitivement effacés après 30 jours</li>
      </ul>

      <h2>7. Vos droits (RGPD)</h2>
      <p>En vertu du RGPD, vous disposez des droits suivants :</p>
      <ul>
        <li><strong>Accès (Article 15) :</strong> Demander une copie de vos données personnelles</li>
        <li><strong>Rectification (Article 16) :</strong> Corriger des données personnelles inexactes</li>
        <li><strong>Effacement (Article 17) :</strong> Supprimer votre compte et toutes les données associées</li>
        <li><strong>Portabilité (Article 20) :</strong> Exporter vos données dans un format lisible par machine</li>
        <li><strong>Opposition (Article 21) :</strong> S&apos;opposer à certaines activités de traitement</li>
        <li><strong>Retrait du consentement :</strong> Retirer votre consentement à tout moment en supprimant votre compte</li>
      </ul>

      <h3>Comment exercer vos droits</h3>
      <ul>
        <li><strong>Exporter les données :</strong> Paramètres &gt; Zone de danger &gt; Exporter mes données</li>
        <li><strong>Supprimer le compte :</strong> Paramètres &gt; Zone de danger &gt; Supprimer le compte</li>
        <li><strong>Autres demandes :</strong> Contactez privacy@tripalium.projets.work</li>
      </ul>

      <h2>8. Sécurité des données</h2>
      <p>
        Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger
        vos données personnelles, y compris le chiffrement en transit (HTTPS), le hachage sécurisé
        des mots de passe et les contrôles d&apos;accès.
      </p>

      <h2>9. Transferts internationaux</h2>
      <p>
        Vos données peuvent être traitées par OpenAI aux États-Unis. Ces transferts sont couverts
        par des garanties appropriées, notamment les Clauses Contractuelles Types.
      </p>

      <h2>10. Modifications de cette politique</h2>
      <p>
        Nous pouvons mettre à jour cette Politique de confidentialité. Nous vous informerons des
        changements significatifs par e-mail ou via la plateforme. Le numéro de version et la date
        seront mis à jour en conséquence.
      </p>

      <h2>11. Nous contacter</h2>
      <p>
        Pour toute question concernant cette Politique de confidentialité ou nos pratiques en matière
        de données, veuillez nous contacter à :
      </p>
      <p>
        <strong>E-mail :</strong> privacy@tripalium.projets.work
      </p>

      <h2>12. Autorité de contrôle</h2>
      <p>
        Si vous êtes en France, vous avez le droit de déposer une plainte auprès de la CNIL
        (Commission Nationale de l&apos;Informatique et des Libertés) sur www.cnil.fr.
      </p>
    </article>
  );
}
