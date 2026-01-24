// =============================================================================
// Job Offer Templates
// =============================================================================

export interface JobTemplate {
  title: string;
  company: string;
  matchScore?: number;
  status: 'DISCOVERED' | 'ANALYZING' | 'MATCHED' | 'REJECTED' | 'APPLIED';
  rejectionReason?: string;
  description: string;
  requirements: string[];
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  contractType: string;
  remoteType: string;
}

// Completed campaign jobs (12 total)
export const completedCampaignJobs: JobTemplate[] = [
  // APPLIED - High match jobs that went through
  {
    title: 'Senior Frontend Engineer',
    company: 'Doctolib',
    matchScore: 92,
    status: 'APPLIED',
    description: `Nous recherchons un(e) Senior Frontend Engineer pour rejoindre notre équipe Plateforme et contribuer au développement de notre application de prise de rendez-vous utilisée par des millions de patients.

Votre mission :
- Développer des fonctionnalités frontend complexes avec React et TypeScript
- Participer à l'architecture technique et aux choix technologiques
- Assurer la qualité du code via les code reviews et les tests
- Collaborer avec les équipes produit et design
- Mentorer les développeurs moins expérimentés`,
    requirements: [
      '5+ ans d\'expérience en développement frontend',
      'Expertise React et TypeScript',
      'Expérience avec les tests automatisés (Jest, Cypress)',
      'Bonne connaissance des principes d\'accessibilité',
      'Capacité à travailler en équipe agile',
    ],
    salary: '65K - 85K EUR',
    salaryMin: 65000,
    salaryMax: 85000,
    contractType: 'CDI',
    remoteType: 'Hybrid',
  },
  {
    title: 'Lead React Developer',
    company: 'Datadog',
    matchScore: 88,
    status: 'APPLIED',
    description: `Join Datadog's Paris office as a Lead React Developer to help build the future of cloud monitoring dashboards.

Your role:
- Lead technical decisions for the frontend team
- Design and implement complex data visualization features
- Work with product managers to define technical roadmap
- Drive best practices and code quality standards
- Contribute to the growth of the frontend community`,
    requirements: [
      '7+ years of frontend development experience',
      'Strong React/TypeScript expertise',
      'Experience leading technical projects',
      'Knowledge of data visualization libraries',
      'Fluent English required',
    ],
    salary: '70K - 90K EUR',
    salaryMin: 70000,
    salaryMax: 90000,
    contractType: 'CDI',
    remoteType: 'Hybrid',
  },
  {
    title: 'Senior Full-Stack Engineer',
    company: 'BlaBlaCar',
    matchScore: 85,
    status: 'APPLIED',
    description: `BlaBlaCar recherche un(e) Senior Full-Stack Engineer pour rejoindre l'équipe Growth et développer les fonctionnalités qui aident des millions de voyageurs à se connecter.

Responsabilités :
- Développer des features full-stack (React, Node.js, PostgreSQL)
- Optimiser les performances et la scalabilité de la plateforme
- Participer aux décisions d'architecture technique
- Collaborer étroitement avec les équipes produit et data`,
    requirements: [
      '5+ ans d\'expérience full-stack',
      'Maîtrise de React, Node.js, TypeScript',
      'Expérience avec PostgreSQL ou bases relationnelles',
      'Sensibilité aux performances et à l\'UX',
      'Français et anglais courants',
    ],
    salary: '60K - 80K EUR',
    salaryMin: 60000,
    salaryMax: 80000,
    contractType: 'CDI',
    remoteType: 'Hybrid',
  },
  {
    title: 'Senior React Developer',
    company: 'Swile',
    matchScore: 80,
    status: 'APPLIED',
    description: `Swile recrute un(e) Senior React Developer pour son équipe Mobile Web, en charge de l'application utilisée par plus de 2 millions de salariés.

Mission :
- Développer l'application web responsive avec React
- Assurer la qualité et maintenabilité du code
- Optimiser les performances de l'application
- Travailler en collaboration avec les équipes mobile natives`,
    requirements: [
      '4+ ans d\'expérience React',
      'Expertise TypeScript',
      'Expérience PWA appréciée',
      'Sensibilité UX/UI',
      'Travail en équipe agile',
    ],
    salary: '55K - 75K EUR',
    salaryMin: 55000,
    salaryMax: 75000,
    contractType: 'CDI',
    remoteType: 'Hybrid',
  },

  // MATCHED - Good fit but not yet applied
  {
    title: 'Frontend Tech Lead',
    company: 'Mirakl',
    matchScore: 82,
    status: 'MATCHED',
    description: `Mirakl is looking for a Frontend Tech Lead to guide our merchant dashboard team and shape the future of marketplace technology.

Your impact:
- Lead the frontend architecture for our SaaS platform
- Coach and mentor a team of 5 frontend developers
- Drive technical excellence through code reviews and best practices
- Collaborate with product and design teams`,
    requirements: [
      '6+ years of frontend development',
      '2+ years of technical leadership',
      'Deep React/TypeScript knowledge',
      'Experience with design systems',
      'Strong communication skills',
    ],
    salary: '70K - 90K EUR',
    salaryMin: 70000,
    salaryMax: 90000,
    contractType: 'CDI',
    remoteType: 'Hybrid',
  },
  {
    title: 'Senior Frontend Developer',
    company: 'Alan',
    matchScore: 75,
    status: 'MATCHED',
    description: `Alan recherche un(e) Senior Frontend Developer pour développer notre app santé utilisée par plus de 500 000 membres.

Vos missions :
- Créer des interfaces utilisateur élégantes et performantes
- Contribuer à notre design system
- Améliorer continuellement l'expérience utilisateur
- Participer aux choix techniques de l'équipe`,
    requirements: [
      '4+ ans d\'expérience frontend',
      'Maîtrise React et TypeScript',
      'Goût pour l\'UX et le design',
      'Esprit startup et autonomie',
    ],
    salary: '55K - 70K EUR',
    salaryMin: 55000,
    salaryMax: 70000,
    contractType: 'CDI',
    remoteType: 'Remote-first',
  },
  {
    title: 'Full-Stack Developer',
    company: 'Qonto',
    matchScore: 72,
    status: 'MATCHED',
    description: `Qonto recrute des Full-Stack Developers pour construire la solution de gestion financière de demain.

Votre quotidien :
- Développer des fonctionnalités full-stack
- Travailler sur des sujets techniques variés (paiements, comptabilité)
- Collaborer dans une équipe autonome
- Contribuer à l'amélioration continue des process`,
    requirements: [
      '3+ ans d\'expérience full-stack',
      'React et Node.js/Ruby',
      'Expérience API REST/GraphQL',
      'Rigueur et attention aux détails',
    ],
    salary: '50K - 70K EUR',
    salaryMin: 50000,
    salaryMax: 70000,
    contractType: 'CDI',
    remoteType: 'Hybrid',
  },
  {
    title: 'Senior Frontend Developer',
    company: 'ManoMano',
    matchScore: 74,
    status: 'MATCHED',
    description: `ManoMano recherche un(e) Senior Frontend Developer pour développer les interfaces de notre marketplace B2C et B2B.

Missions :
- Développer des composants React réutilisables
- Optimiser les performances (Core Web Vitals)
- Participer au design system commun
- Assurer la qualité via tests et code reviews`,
    requirements: [
      '4+ ans d\'expérience React',
      'TypeScript, HTML, CSS',
      'Sensibilité performance web',
      'E-commerce apprécié',
    ],
    salary: '55K - 72K EUR',
    salaryMin: 55000,
    salaryMax: 72000,
    contractType: 'CDI',
    remoteType: 'Hybrid',
  },

  // REJECTED by user
  {
    title: 'Senior React Developer',
    company: 'ContentSquare',
    matchScore: 78,
    status: 'REJECTED',
    rejectionReason: 'user',
    description: `ContentSquare recherche un(e) Senior React Developer pour son équipe Analytics Dashboard.`,
    requirements: [
      '5+ ans React',
      'Data visualization',
      'Performance optimization',
    ],
    salary: '60K - 80K EUR',
    salaryMin: 60000,
    salaryMax: 80000,
    contractType: 'CDI',
    remoteType: 'Hybrid',
  },
  {
    title: 'Frontend Engineer',
    company: 'PayFit',
    matchScore: 68,
    status: 'REJECTED',
    rejectionReason: 'user',
    description: `PayFit recrute un(e) Frontend Engineer pour son équipe Core Platform.`,
    requirements: [
      '3+ ans d\'expérience',
      'React, TypeScript',
      'Agile methodology',
    ],
    salary: '50K - 65K EUR',
    salaryMin: 50000,
    salaryMax: 65000,
    contractType: 'CDI',
    remoteType: 'Hybrid',
  },

  // REJECTED - Low match score (below threshold)
  {
    title: 'Web3 Frontend Engineer',
    company: 'Ledger',
    matchScore: 45,
    status: 'REJECTED',
    rejectionReason: 'low_match',
    description: `Ledger recherche un(e) Web3 Frontend Engineer avec expertise blockchain et DeFi.`,
    requirements: [
      'Experience Web3/Ethereum',
      'Solidity basics',
      'React + web3.js',
      'Crypto/blockchain passion',
    ],
    salary: '60K - 90K EUR',
    salaryMin: 60000,
    salaryMax: 90000,
    contractType: 'CDI',
    remoteType: 'Hybrid',
  },
  {
    title: 'React Native Developer',
    company: 'Back Market',
    matchScore: 55,
    status: 'REJECTED',
    rejectionReason: 'low_match',
    description: `Back Market recrute un(e) React Native Developer pour son app mobile.`,
    requirements: [
      'React Native expertise',
      'iOS/Android deployment',
      'Native modules experience',
      'Mobile-first mindset',
    ],
    salary: '55K - 75K EUR',
    salaryMin: 55000,
    salaryMax: 75000,
    contractType: 'CDI',
    remoteType: 'Hybrid',
  },
];

// Active campaign jobs (8 total)
export const activeCampaignJobs: JobTemplate[] = [
  {
    title: 'Senior Full-Stack Engineer',
    company: 'Algolia',
    matchScore: undefined,
    status: 'DISCOVERED',
    description: `Algolia is hiring a Senior Full-Stack Engineer to work on our developer experience tools.`,
    requirements: ['5+ years experience', 'React/Node.js', 'API design'],
    salary: '65K - 85K EUR',
    salaryMin: 65000,
    salaryMax: 85000,
    contractType: 'CDI',
    remoteType: 'Remote-friendly',
  },
  {
    title: 'Tech Lead Frontend',
    company: 'Criteo',
    matchScore: undefined,
    status: 'ANALYZING',
    description: `Criteo recherche un(e) Tech Lead Frontend pour diriger l'équipe Campaign Manager.`,
    requirements: ['7+ ans', 'Leadership', 'React/TypeScript'],
    salary: '70K - 95K EUR',
    salaryMin: 70000,
    salaryMax: 95000,
    contractType: 'CDI',
    remoteType: 'Hybrid',
  },
  {
    title: 'Senior Full-Stack Developer',
    company: 'Spendesk',
    matchScore: 85,
    status: 'MATCHED',
    description: `Spendesk recrute un(e) Senior Full-Stack Developer pour l'équipe Expense Management.

Vos missions :
- Développer des fonctionnalités full-stack complexes
- Participer à l'architecture technique
- Travailler en collaboration étroite avec le produit`,
    requirements: [
      '5+ ans d\'expérience',
      'React et Node.js/Ruby',
      'PostgreSQL',
      'API design',
    ],
    salary: '60K - 80K EUR',
    salaryMin: 60000,
    salaryMax: 80000,
    contractType: 'CDI',
    remoteType: 'Hybrid',
  },
  {
    title: 'Senior Frontend Engineer',
    company: 'Aircall',
    matchScore: 82,
    status: 'MATCHED',
    description: `Aircall is looking for a Senior Frontend Engineer to join the Phone App team.`,
    requirements: ['5+ years', 'React expertise', 'WebRTC appreciated'],
    salary: '60K - 80K EUR',
    salaryMin: 60000,
    salaryMax: 80000,
    contractType: 'CDI',
    remoteType: 'Remote-first',
  },
  {
    title: 'Full-Stack Engineer',
    company: 'Pennylane',
    matchScore: 79,
    status: 'MATCHED',
    description: `Pennylane recherche un(e) Full-Stack Engineer pour développer la comptabilité de demain.`,
    requirements: ['4+ ans', 'React', 'Node.js/Python', 'Fintech appreciated'],
    salary: '55K - 75K EUR',
    salaryMin: 55000,
    salaryMax: 75000,
    contractType: 'CDI',
    remoteType: 'Hybrid',
  },
  {
    title: 'Senior React Developer',
    company: 'GitGuardian',
    matchScore: undefined,
    status: 'DISCOVERED',
    description: `GitGuardian is hiring a Senior React Developer to build security dashboards.`,
    requirements: ['5+ years React', 'Security awareness', 'Data visualization'],
    salary: '60K - 80K EUR',
    salaryMin: 60000,
    salaryMax: 80000,
    contractType: 'CDI',
    remoteType: 'Hybrid',
  },
  {
    title: 'Frontend Developer',
    company: 'AB Tasty',
    matchScore: undefined,
    status: 'ANALYZING',
    description: `AB Tasty recrute un(e) Frontend Developer pour son équipe Experimentation Platform.`,
    requirements: ['4+ ans', 'React/Vue', 'A/B testing knowledge'],
    salary: '50K - 70K EUR',
    salaryMin: 50000,
    salaryMax: 70000,
    contractType: 'CDI',
    remoteType: 'Hybrid',
  },
  {
    title: 'Backend Developer',
    company: 'Akeneo',
    matchScore: 45,
    status: 'REJECTED',
    rejectionReason: 'low_match',
    description: `Akeneo recrute un(e) Backend Developer PHP pour son équipe PIM Core.`,
    requirements: ['PHP/Symfony', 'Elasticsearch', 'MySQL'],
    salary: '45K - 60K EUR',
    salaryMin: 45000,
    salaryMax: 60000,
    contractType: 'CDI',
    remoteType: 'Remote-friendly',
  },
];

/**
 * Get all jobs for a campaign type
 */
export function getJobsForCampaign(type: 'completed' | 'active'): JobTemplate[] {
  return type === 'completed' ? completedCampaignJobs : activeCampaignJobs;
}
