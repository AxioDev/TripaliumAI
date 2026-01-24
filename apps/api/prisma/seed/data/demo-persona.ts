// =============================================================================
// Demo Persona: Marie Dupont
// =============================================================================

import { DEMO_USER_ID, DEMO_PROFILE_ID, DEMO_EMAIL, DEMO_PASSWORD } from '../config';

export const demoUser = {
  id: DEMO_USER_ID,
  email: DEMO_EMAIL,
  password: DEMO_PASSWORD, // Will be hashed before insertion
};

export const demoProfile = {
  id: DEMO_PROFILE_ID,
  userId: DEMO_USER_ID,
  firstName: 'Marie',
  lastName: 'Dupont',
  email: DEMO_EMAIL,
  phone: '+33 6 12 34 56 78',
  location: 'Paris, France',
  linkedIn: 'https://linkedin.com/in/marie-dupont-demo',
  website: 'https://marie-dupont.dev',
  summary: `Ingénieure Full-Stack Senior avec 8 ans d'expérience dans le développement d'applications web modernes. Spécialisée en React, Node.js et architecture cloud, j'ai dirigé des équipes techniques et livré des projets à fort impact pour des entreprises tech de premier plan. Passionnée par la qualité du code, les bonnes pratiques DevOps et le mentorat de développeurs juniors.`,
  motivationText: `Je recherche un poste stimulant au sein d'une équipe technique ambitieuse, où je pourrai mettre à profit mon expertise en développement full-stack tout en continuant à évoluer vers des responsabilités de Tech Lead. Je suis particulièrement intéressée par les entreprises qui valorisent l'innovation technique, la qualité du code et le bien-être de leurs équipes.`,
};

export const workExperiences = [
  {
    company: 'TechVision Paris',
    title: 'Senior Full-Stack Engineer',
    location: 'Paris, France',
    startDate: new Date('2021-04-01'),
    endDate: null, // Current position
    description: `Développement et architecture de la plateforme SaaS principale servant 500K+ utilisateurs. Référente technique pour l'équipe frontend (6 développeurs).`,
    highlights: [
      'Architecture et mise en place d\'un système de micro-frontends réduisant le temps de build de 60%',
      'Migration de l\'application legacy vers Next.js avec amélioration du SEO de 40%',
      'Mise en place de la CI/CD avec GitHub Actions et déploiement Kubernetes',
      'Mentorat de 3 développeurs juniors avec revues de code hebdomadaires',
    ],
    sortOrder: 0,
  },
  {
    company: 'DataFlow Solutions',
    title: 'Full-Stack Developer',
    location: 'Lyon, France',
    startDate: new Date('2018-09-01'),
    endDate: new Date('2021-03-31'),
    description: `Développement de solutions de visualisation de données et dashboards pour clients B2B dans le secteur financier.`,
    highlights: [
      'Développement d\'un système de dashboards temps réel avec React et D3.js',
      'Optimisation des requêtes PostgreSQL réduisant les temps de réponse de 70%',
      'Intégration d\'APIs tierces (Stripe, Salesforce, HubSpot)',
      'Participation à la mise en place de l\'architecture GraphQL',
    ],
    sortOrder: 1,
  },
  {
    company: 'StartupLab',
    title: 'Développeur Frontend',
    location: 'Paris, France',
    startDate: new Date('2016-09-01'),
    endDate: new Date('2018-08-31'),
    description: `Développement d'applications web pour diverses startups en incubation. Environnement agile avec sprints de 2 semaines.`,
    highlights: [
      'Développement de 5 MVPs pour startups early-stage',
      'Mise en place de design systems avec Storybook',
      'Introduction de TypeScript dans la stack technique',
    ],
    sortOrder: 2,
  },
  {
    company: 'WebAgency Plus',
    title: 'Développeur Web Junior',
    location: 'Lyon, France',
    startDate: new Date('2014-09-01'),
    endDate: new Date('2016-08-31'),
    description: `Développement de sites web et applications pour clients variés (e-commerce, corporate, événementiel).`,
    highlights: [
      'Développement de sites e-commerce avec WordPress et WooCommerce',
      'Introduction de React pour les projets clients',
      'Formation aux pratiques de versioning avec Git',
    ],
    sortOrder: 3,
  },
];

export const educations = [
  {
    institution: 'INSA Lyon',
    degree: 'Diplôme d\'Ingénieur',
    field: 'Informatique',
    startDate: new Date('2011-09-01'),
    endDate: new Date('2014-06-30'),
    gpa: 'Mention Bien',
    description: 'Spécialisation en génie logiciel et systèmes distribués.',
    sortOrder: 0,
  },
  {
    institution: 'Google Cloud',
    degree: 'Professional Cloud Architect',
    field: 'Cloud Computing',
    startDate: new Date('2022-01-01'),
    endDate: new Date('2022-03-15'),
    description: 'Certification professionnelle en architecture cloud GCP.',
    sortOrder: 1,
  },
];

export const skills = [
  // Frontend
  { name: 'React', category: 'Frontend', level: 'Expert', yearsOfExp: 7, sortOrder: 0 },
  { name: 'TypeScript', category: 'Frontend', level: 'Expert', yearsOfExp: 6, sortOrder: 1 },
  { name: 'Next.js', category: 'Frontend', level: 'Advanced', yearsOfExp: 4, sortOrder: 2 },
  { name: 'Vue.js', category: 'Frontend', level: 'Intermediate', yearsOfExp: 2, sortOrder: 3 },
  { name: 'Tailwind CSS', category: 'Frontend', level: 'Advanced', yearsOfExp: 3, sortOrder: 4 },

  // Backend
  { name: 'Node.js', category: 'Backend', level: 'Expert', yearsOfExp: 7, sortOrder: 5 },
  { name: 'Python', category: 'Backend', level: 'Intermediate', yearsOfExp: 3, sortOrder: 6 },
  { name: 'GraphQL', category: 'Backend', level: 'Advanced', yearsOfExp: 4, sortOrder: 7 },
  { name: 'PostgreSQL', category: 'Database', level: 'Advanced', yearsOfExp: 6, sortOrder: 8 },
  { name: 'MongoDB', category: 'Database', level: 'Intermediate', yearsOfExp: 3, sortOrder: 9 },

  // DevOps
  { name: 'AWS', category: 'DevOps', level: 'Advanced', yearsOfExp: 5, sortOrder: 10 },
  { name: 'Docker', category: 'DevOps', level: 'Advanced', yearsOfExp: 5, sortOrder: 11 },
  { name: 'Kubernetes', category: 'DevOps', level: 'Intermediate', yearsOfExp: 2, sortOrder: 12 },
  { name: 'CI/CD', category: 'DevOps', level: 'Advanced', yearsOfExp: 5, sortOrder: 13 },

  // Other
  { name: 'Git', category: 'Tools', level: 'Expert', yearsOfExp: 8, sortOrder: 14 },
  { name: 'Agile/Scrum', category: 'Methodology', level: 'Advanced', yearsOfExp: 6, sortOrder: 15 },
];

export const languages = [
  { name: 'Français', proficiency: 'Native' },
  { name: 'Anglais', proficiency: 'Fluent' },
  { name: 'Espagnol', proficiency: 'Conversational' },
];

export const certifications = [
  {
    name: 'Google Cloud Professional Cloud Architect',
    issuer: 'Google Cloud',
    issueDate: new Date('2022-03-15'),
    expiryDate: new Date('2024-03-15'),
    url: 'https://google.com/cloud-certification',
  },
];
