import { setRequestLocale } from 'next-intl/server';
import { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'fr' ? "Conditions d'utilisation - TripaliumAI" : 'Terms of Service - TripaliumAI',
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (locale === 'fr') {
    return <TermsContentFR />;
  }
  return <TermsContentEN />;
}

function TermsContentEN() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-4xl mx-auto">
      <h1>Terms of Service</h1>
      <p className="lead">Last updated: January 2026</p>

      <p>
        Welcome to TripaliumAI. By creating an account and using our services, you agree to these
        Terms of Service. Please read them carefully.
      </p>

      <h2>1. Service Description</h2>
      <p>
        TripaliumAI is a job search automation platform that helps users:
      </p>
      <ul>
        <li>Upload and parse CVs/resumes using AI</li>
        <li>Discover job opportunities matching their profile</li>
        <li>Generate tailored CVs and cover letters</li>
        <li>Submit job applications (with user authorization)</li>
      </ul>

      <h2>2. User Accounts</h2>
      <h3>2.1 Account Creation</h3>
      <p>
        To use our services, you must create an account with a valid email address and password.
        You must provide accurate information and keep your account credentials secure.
      </p>

      <h3>2.2 Account Responsibilities</h3>
      <p>You are responsible for:</p>
      <ul>
        <li>All activities that occur under your account</li>
        <li>Maintaining the confidentiality of your password</li>
        <li>Notifying us immediately of any unauthorized use</li>
      </ul>

      <h2>3. User Obligations</h2>
      <p>When using TripaliumAI, you agree to:</p>
      <ul>
        <li>Provide accurate and truthful information in your profile and CVs</li>
        <li>Use the service only for legitimate job search purposes</li>
        <li>Not misrepresent your qualifications or experience</li>
        <li>Not use the service to harass, spam, or deceive employers</li>
        <li>Not attempt to circumvent security measures or access restrictions</li>
        <li>Comply with all applicable laws and regulations</li>
      </ul>

      <h2>4. Practice Mode vs. Production Mode</h2>
      <h3>4.1 Practice Mode</h3>
      <p>
        In Practice Mode, documents are generated but never sent to employers. This mode is
        recommended for testing the platform and reviewing generated content.
      </p>

      <h3>4.2 Production Mode</h3>
      <p>
        In Production Mode, applications may be sent to employers. You are solely responsible for
        reviewing all generated documents before submission. TripaliumAI is not responsible for
        the content or consequences of applications you authorize.
      </p>

      <h2>5. AI-Generated Content</h2>
      <p>
        TripaliumAI uses artificial intelligence to parse CVs and generate application documents.
        While we strive for accuracy:
      </p>
      <ul>
        <li>AI-generated content may contain errors or inaccuracies</li>
        <li>You must review all generated documents before use</li>
        <li>You are responsible for the accuracy of any applications you submit</li>
        <li>We recommend proofreading all content carefully</li>
      </ul>

      <h2>6. Intellectual Property</h2>
      <h3>6.1 Your Content</h3>
      <p>
        You retain ownership of all content you upload (CVs, profile information). By using our
        services, you grant us a license to process this content to provide the service.
      </p>

      <h3>6.2 Generated Content</h3>
      <p>
        AI-generated CVs and cover letters created for you may be used freely for your job search.
        We retain no ownership of content generated specifically for your applications.
      </p>

      <h2>7. Limitations and Disclaimers</h2>
      <h3>7.1 No Guarantee of Employment</h3>
      <p>
        TripaliumAI is a tool to assist your job search. We do not guarantee:
      </p>
      <ul>
        <li>That you will receive job offers</li>
        <li>That matched jobs are suitable for you</li>
        <li>That applications will be received or considered by employers</li>
        <li>The accuracy of job posting information from third-party sources</li>
      </ul>

      <h3>7.2 Service Availability</h3>
      <p>
        We strive for high availability but do not guarantee uninterrupted service. We may
        perform maintenance, updates, or experience technical issues that affect availability.
      </p>

      <h3>7.3 Third-Party Services</h3>
      <p>
        We integrate with third-party job boards and services. We are not responsible for
        their availability, accuracy, or policies.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, TripaliumAI shall not be liable for:
      </p>
      <ul>
        <li>Indirect, incidental, or consequential damages</li>
        <li>Loss of employment opportunities</li>
        <li>Errors in AI-generated content</li>
        <li>Actions taken by employers based on your applications</li>
        <li>Third-party service failures</li>
      </ul>

      <h2>9. Account Termination</h2>
      <h3>9.1 By You</h3>
      <p>
        You may delete your account at any time through Settings &gt; Danger Zone &gt; Delete Account.
        This will permanently remove all your data.
      </p>

      <h3>9.2 By Us</h3>
      <p>
        We may suspend or terminate your account if you:
      </p>
      <ul>
        <li>Violate these Terms of Service</li>
        <li>Engage in fraudulent or abusive behavior</li>
        <li>Misuse the platform in any way</li>
      </ul>

      <h2>10. Changes to Terms</h2>
      <p>
        We may update these Terms of Service from time to time. We will notify you of significant
        changes by email or through the platform. Continued use after changes constitutes acceptance.
      </p>

      <h2>11. Governing Law</h2>
      <p>
        These Terms are governed by French law. Any disputes shall be resolved in the courts of
        Paris, France.
      </p>

      <h2>12. Contact</h2>
      <p>
        For questions about these Terms, please contact:
      </p>
      <p>
        <strong>Email:</strong> legal@tripalium.projets.work
      </p>
    </article>
  );
}

function TermsContentFR() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-4xl mx-auto">
      <h1>Conditions d&apos;utilisation</h1>
      <p className="lead">Dernière mise à jour : Janvier 2026</p>

      <p>
        Bienvenue sur TripaliumAI. En créant un compte et en utilisant nos services, vous acceptez
        ces Conditions d&apos;utilisation. Veuillez les lire attentivement.
      </p>

      <h2>1. Description du service</h2>
      <p>
        TripaliumAI est une plateforme d&apos;automatisation de recherche d&apos;emploi qui aide les utilisateurs à :
      </p>
      <ul>
        <li>Téléverser et analyser des CV grâce à l&apos;IA</li>
        <li>Découvrir des offres d&apos;emploi correspondant à leur profil</li>
        <li>Générer des CV et lettres de motivation personnalisés</li>
        <li>Soumettre des candidatures (avec autorisation de l&apos;utilisateur)</li>
      </ul>

      <h2>2. Comptes utilisateurs</h2>
      <h3>2.1 Création de compte</h3>
      <p>
        Pour utiliser nos services, vous devez créer un compte avec une adresse e-mail valide et
        un mot de passe. Vous devez fournir des informations exactes et sécuriser vos identifiants.
      </p>

      <h3>2.2 Responsabilités du compte</h3>
      <p>Vous êtes responsable de :</p>
      <ul>
        <li>Toutes les activités effectuées sous votre compte</li>
        <li>La confidentialité de votre mot de passe</li>
        <li>Nous notifier immédiatement de toute utilisation non autorisée</li>
      </ul>

      <h2>3. Obligations de l&apos;utilisateur</h2>
      <p>En utilisant TripaliumAI, vous vous engagez à :</p>
      <ul>
        <li>Fournir des informations exactes et véridiques dans votre profil et vos CV</li>
        <li>Utiliser le service uniquement pour des recherches d&apos;emploi légitimes</li>
        <li>Ne pas falsifier vos qualifications ou votre expérience</li>
        <li>Ne pas utiliser le service pour harceler, spammer ou tromper les employeurs</li>
        <li>Ne pas tenter de contourner les mesures de sécurité</li>
        <li>Respecter toutes les lois et réglementations applicables</li>
      </ul>

      <h2>4. Mode pratique vs. Mode production</h2>
      <h3>4.1 Mode pratique</h3>
      <p>
        En mode pratique, les documents sont générés mais jamais envoyés aux employeurs. Ce mode
        est recommandé pour tester la plateforme et examiner le contenu généré.
      </p>

      <h3>4.2 Mode production</h3>
      <p>
        En mode production, les candidatures peuvent être envoyées aux employeurs. Vous êtes seul
        responsable de la révision de tous les documents générés avant envoi. TripaliumAI n&apos;est pas
        responsable du contenu ou des conséquences des candidatures que vous autorisez.
      </p>

      <h2>5. Contenu généré par l&apos;IA</h2>
      <p>
        TripaliumAI utilise l&apos;intelligence artificielle pour analyser les CV et générer des documents.
        Bien que nous visions la précision :
      </p>
      <ul>
        <li>Le contenu généré par l&apos;IA peut contenir des erreurs ou inexactitudes</li>
        <li>Vous devez réviser tous les documents générés avant utilisation</li>
        <li>Vous êtes responsable de l&apos;exactitude des candidatures que vous soumettez</li>
        <li>Nous recommandons de relire attentivement tout le contenu</li>
      </ul>

      <h2>6. Propriété intellectuelle</h2>
      <h3>6.1 Votre contenu</h3>
      <p>
        Vous conservez la propriété de tout le contenu que vous téléversez (CV, informations de profil).
        En utilisant nos services, vous nous accordez une licence pour traiter ce contenu afin de
        fournir le service.
      </p>

      <h3>6.2 Contenu généré</h3>
      <p>
        Les CV et lettres de motivation générés par l&apos;IA pour vous peuvent être utilisés librement
        pour votre recherche d&apos;emploi. Nous ne conservons aucun droit de propriété sur le contenu
        généré spécifiquement pour vos candidatures.
      </p>

      <h2>7. Limitations et avertissements</h2>
      <h3>7.1 Aucune garantie d&apos;emploi</h3>
      <p>
        TripaliumAI est un outil pour assister votre recherche d&apos;emploi. Nous ne garantissons pas :
      </p>
      <ul>
        <li>Que vous recevrez des offres d&apos;emploi</li>
        <li>Que les emplois correspondants vous conviennent</li>
        <li>Que les candidatures seront reçues ou considérées par les employeurs</li>
        <li>L&apos;exactitude des informations d&apos;offres d&apos;emploi provenant de sources tierces</li>
      </ul>

      <h3>7.2 Disponibilité du service</h3>
      <p>
        Nous visons une haute disponibilité mais ne garantissons pas un service ininterrompu.
        Nous pouvons effectuer des maintenances, mises à jour, ou rencontrer des problèmes techniques.
      </p>

      <h3>7.3 Services tiers</h3>
      <p>
        Nous intégrons des sites d&apos;emploi et services tiers. Nous ne sommes pas responsables de
        leur disponibilité, exactitude ou politiques.
      </p>

      <h2>8. Limitation de responsabilité</h2>
      <p>
        Dans la limite permise par la loi, TripaliumAI ne sera pas responsable de :
      </p>
      <ul>
        <li>Dommages indirects, accessoires ou consécutifs</li>
        <li>Perte d&apos;opportunités d&apos;emploi</li>
        <li>Erreurs dans le contenu généré par l&apos;IA</li>
        <li>Actions prises par les employeurs suite à vos candidatures</li>
        <li>Défaillances de services tiers</li>
      </ul>

      <h2>9. Résiliation du compte</h2>
      <h3>9.1 Par vous</h3>
      <p>
        Vous pouvez supprimer votre compte à tout moment via Paramètres &gt; Zone de danger &gt;
        Supprimer le compte. Cela supprimera définitivement toutes vos données.
      </p>

      <h3>9.2 Par nous</h3>
      <p>
        Nous pouvons suspendre ou résilier votre compte si vous :
      </p>
      <ul>
        <li>Violez ces Conditions d&apos;utilisation</li>
        <li>Avez un comportement frauduleux ou abusif</li>
        <li>Utilisez abusivement la plateforme</li>
      </ul>

      <h2>10. Modifications des conditions</h2>
      <p>
        Nous pouvons mettre à jour ces Conditions d&apos;utilisation. Nous vous informerons des
        changements significatifs par e-mail ou via la plateforme. L&apos;utilisation continue après
        les modifications vaut acceptation.
      </p>

      <h2>11. Droit applicable</h2>
      <p>
        Ces Conditions sont régies par le droit français. Tout litige sera résolu devant les
        tribunaux de Paris, France.
      </p>

      <h2>12. Contact</h2>
      <p>
        Pour toute question concernant ces Conditions, veuillez contacter :
      </p>
      <p>
        <strong>E-mail :</strong> legal@tripalium.projets.work
      </p>
    </article>
  );
}
