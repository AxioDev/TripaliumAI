# Comptes TripaliumAI

## URL de Production

**Application:** https://tripalium.projets.work

- Login (FR): https://tripalium.projets.work/fr/login
- Login (EN): https://tripalium.projets.work/en/login

---

## Comptes de Démonstration

### Compte Demo Principal

> **Prêt à utiliser sur https://tripalium.projets.work/fr/login**

| Champ | Valeur |
|-------|--------|
| **Email** | `marie.dupont@demo.tripalium.ai` |
| **Mot de passe** | `demo123456` |

**Profil complet incluant:**
- Identité: Marie Dupont, Paris, France
- 4 expériences professionnelles (Junior → Senior Full-Stack)
- 2 formations (INSA Lyon + Certification Google Cloud)
- 16 compétences (Frontend, Backend, Database, DevOps)
- 3 langues (Français natif, Anglais courant, Espagnol)
- 2 CVs uploadés
- 3 campagnes de recherche (complétée, active, brouillon)
- 20 offres d'emploi découvertes
- 8 candidatures

---

### Compte Test Développeur

| Champ | Valeur |
|-------|--------|
| **Email** | `test@tripalium.local` |
| **Mot de passe** | `testpassword123` |

**Profil basique incluant:**
- 2 expériences professionnelles
- 2 formations
- 7 compétences (TypeScript, Node.js, React, PostgreSQL, AWS, Docker, Python)
- 3 langues
- Campagnes exemple

---

## Création des Comptes Demo

### Commandes de Seed

```bash
# Dans le dossier apps/api/

# Seed de base uniquement (test@tripalium.local)
npx prisma db seed

# Seed de base + données démo (ajoute marie.dupont@demo.tripalium.ai)
npx prisma db seed -- --demo

# Reset complet + tous les seeds
npx prisma db seed -- --reset

# Nettoyer les données démo
npx prisma db seed -- --clean-demo

# Afficher l'aide
npx prisma db seed -- --help
```

### Sur le Serveur de Production

```bash
ssh root@91.107.207.5
cd /opt/tripalium
docker compose exec api npx prisma db seed -- --demo
```

---

## Clés API (pour intégrations)

Deux clés API sont créées avec le compte test:

| Scope | Préfixe |
|-------|---------|
| TEST | `trpl_test_...` |
| WRITE | `trpl_write_...` |

Les clés complètes sont affichées lors du seed et visibles dans **Dashboard > API Keys**.

---

## Configuration Technique

### Variables d'Environnement Requises

```env
# Backend API
JWT_SECRET="votre-secret-jwt"

# Frontend NextAuth
NEXTAUTH_SECRET="votre-secret-nextauth"
NEXTAUTH_URL="https://tripalium.projets.work"
```

### Durée des Sessions

| Type | Durée |
|------|-------|
| Token JWT API | 7 jours |
| Session Web (cookie) | 30 jours |

### Sécurité

- Mots de passe hashés avec bcrypt (12 rounds)
- Cookies httpOnly + secure (HTTPS uniquement)
- Tokens JWT signés avec HS256

---

## Support

Pour créer un nouveau compte de test ou réinitialiser les données:

1. Se connecter au serveur: `ssh root@91.107.207.5`
2. Exécuter le seed: `docker compose exec api npx prisma db seed -- --demo --reset`
