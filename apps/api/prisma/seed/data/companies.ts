// =============================================================================
// French Tech Companies Data
// =============================================================================

export interface CompanyData {
  name: string;
  sector: string;
  description: string;
  location: string;
  size: string;
  website: string;
  hiringEmail?: string;
}

// Major French tech companies for realistic job data
export const frenchTechCompanies: CompanyData[] = [
  // Completed campaign companies (12)
  {
    name: 'Doctolib',
    sector: 'HealthTech',
    description: 'Leader européen de la e-santé, Doctolib accompagne les professionnels de santé dans leur quotidien et facilite l\'accès aux soins pour les patients.',
    location: 'Paris, France',
    size: '2500+ employees',
    website: 'https://www.doctolib.fr',
    hiringEmail: 'careers@doctolib.com',
  },
  {
    name: 'Datadog',
    sector: 'DevOps/Monitoring',
    description: 'Plateforme de monitoring et sécurité pour applications cloud. Bureau français à Paris.',
    location: 'Paris, France',
    size: '5000+ employees',
    website: 'https://www.datadoghq.com',
  },
  {
    name: 'BlaBlaCar',
    sector: 'Mobility',
    description: 'Plateforme de covoiturage leader mondial, connectant des millions de voyageurs.',
    location: 'Paris, France',
    size: '700+ employees',
    website: 'https://www.blablacar.fr',
    hiringEmail: 'jobs@blablacar.com',
  },
  {
    name: 'Swile',
    sector: 'HR Tech',
    description: 'Solution tout-en-un pour les avantages salariés : titres-restaurant, mobilité, culture.',
    location: 'Paris, France',
    size: '700+ employees',
    website: 'https://www.swile.co',
  },
  {
    name: 'Mirakl',
    sector: 'E-commerce',
    description: 'Plateforme marketplace SaaS permettant aux entreprises de lancer leur propre marketplace.',
    location: 'Paris, France',
    size: '700+ employees',
    website: 'https://www.mirakl.com',
  },
  {
    name: 'ContentSquare',
    sector: 'Analytics',
    description: 'Plateforme d\'analyse de l\'expérience digitale pour optimiser les parcours utilisateurs.',
    location: 'Paris, France',
    size: '1500+ employees',
    website: 'https://www.contentsquare.com',
  },
  {
    name: 'Alan',
    sector: 'InsurTech',
    description: 'Assurance santé nouvelle génération pour les entreprises et leurs salariés.',
    location: 'Paris, France',
    size: '500+ employees',
    website: 'https://alan.com',
  },
  {
    name: 'Qonto',
    sector: 'FinTech',
    description: 'Solution de gestion financière pour les PME et indépendants.',
    location: 'Paris, France',
    size: '1000+ employees',
    website: 'https://qonto.com',
  },
  {
    name: 'ManoMano',
    sector: 'E-commerce',
    description: 'Marketplace européenne spécialisée dans le bricolage et le jardinage.',
    location: 'Paris, France',
    size: '1000+ employees',
    website: 'https://www.manomano.fr',
  },
  {
    name: 'PayFit',
    sector: 'HR Tech',
    description: 'Solution de gestion de la paie et des RH pour les PME.',
    location: 'Paris, France',
    size: '1000+ employees',
    website: 'https://payfit.com',
  },
  {
    name: 'Ledger',
    sector: 'Crypto/Security',
    description: 'Leader mondial des solutions de sécurité pour crypto-actifs.',
    location: 'Paris, France',
    size: '700+ employees',
    website: 'https://www.ledger.com',
  },
  {
    name: 'Back Market',
    sector: 'E-commerce',
    description: 'Marketplace de produits électroniques reconditionnés.',
    location: 'Paris, France',
    size: '650+ employees',
    website: 'https://www.backmarket.fr',
  },

  // Active campaign companies (8)
  {
    name: 'Algolia',
    sector: 'Search/AI',
    description: 'Plateforme de recherche et découverte pour sites web et applications.',
    location: 'Paris, France',
    size: '500+ employees',
    website: 'https://www.algolia.com',
  },
  {
    name: 'Criteo',
    sector: 'AdTech',
    description: 'Leader de la publicité en ligne et du retargeting.',
    location: 'Paris, France',
    size: '2500+ employees',
    website: 'https://www.criteo.com',
  },
  {
    name: 'Spendesk',
    sector: 'FinTech',
    description: 'Solution de gestion des dépenses professionnelles.',
    location: 'Paris, France',
    size: '400+ employees',
    website: 'https://www.spendesk.com',
  },
  {
    name: 'Aircall',
    sector: 'Communication',
    description: 'Système de téléphonie cloud pour équipes commerciales et support.',
    location: 'Paris, France',
    size: '700+ employees',
    website: 'https://aircall.io',
  },
  {
    name: 'Pennylane',
    sector: 'FinTech',
    description: 'Plateforme de comptabilité et gestion financière nouvelle génération.',
    location: 'Paris, France',
    size: '400+ employees',
    website: 'https://www.pennylane.com',
  },
  {
    name: 'GitGuardian',
    sector: 'Security',
    description: 'Solution de détection des secrets et fuites de données dans le code.',
    location: 'Paris, France',
    size: '150+ employees',
    website: 'https://www.gitguardian.com',
  },
  {
    name: 'AB Tasty',
    sector: 'Marketing Tech',
    description: 'Plateforme d\'optimisation de l\'expérience client (A/B testing, personnalisation).',
    location: 'Paris, France',
    size: '300+ employees',
    website: 'https://www.abtasty.com',
  },
  {
    name: 'Akeneo',
    sector: 'E-commerce',
    description: 'Solution de gestion de l\'information produit (PIM) open source.',
    location: 'Nantes, France',
    size: '400+ employees',
    website: 'https://www.akeneo.com',
  },
];

/**
 * Get company by name
 */
export function getCompany(name: string): CompanyData | undefined {
  return frenchTechCompanies.find(c => c.name === name);
}

/**
 * Get completed campaign companies
 */
export function getCompletedCampaignCompanies(): CompanyData[] {
  return frenchTechCompanies.slice(0, 12);
}

/**
 * Get active campaign companies
 */
export function getActiveCampaignCompanies(): CompanyData[] {
  return frenchTechCompanies.slice(12, 20);
}
