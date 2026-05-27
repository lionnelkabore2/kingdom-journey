# 🚀 GUIDE D'INSTALLATION KINGDOM JOURNEY
## Pour débutants — Étape par étape

---

## ⏱️ Temps estimé : 45 minutes

---

## 📦 CE QUE TU VAS INSTALLER

- **Supabase** = ta base de données (gratuit)
- **Vercel** = ton hébergement web (gratuit)
- **Node.js** = pour faire tourner le code sur ton ordinateur

---

## ÉTAPE 1 — Installer Node.js sur ton ordinateur

1. Va sur https://nodejs.org
2. Clique sur le bouton vert **"LTS"** (version recommandée)
3. Télécharge et installe (clique "Suivant" partout)
4. Pour vérifier que c'est installé : ouvre un terminal et tape :
   ```
   node --version
   ```
   Tu dois voir quelque chose comme `v20.0.0`

---

## ÉTAPE 2 — Créer ton projet Supabase (base de données)

1. Va sur https://supabase.com
2. Clique **"Start your project"**
3. Crée un compte gratuit (avec GitHub ou email)
4. Clique **"New Project"**
5. Remplis :
   - **Name** : `kingdom-journey`
   - **Database Password** : invente un mot de passe fort (note-le !)
   - **Region** : choisis le plus proche de toi
6. Clique **"Create new project"** — attends 2 minutes

### Créer la base de données :
1. Dans ton projet Supabase, clique **"SQL Editor"** (menu gauche)
2. Clique **"New query"**
3. Ouvre le fichier `database.sql` de ce projet
4. Copie tout le contenu et colle-le dans l'éditeur
5. Clique **"Run"** — tu verras des tables créées !

### Récupérer tes clés API Supabase :
1. Clique **"Settings"** (engrenage en bas à gauche)
2. Clique **"API"**
3. Note ces deux valeurs :
   - **Project URL** : `https://xxxxxxxx.supabase.co`
   - **anon / public key** : `eyJhbGc...` (longue chaîne)
   - **service_role key** : `eyJhbGc...` (une autre longue chaîne — GARDE-LA SECRÈTE !)

---

## ÉTAPE 3 — Préparer les fichiers du projet

1. Crée un dossier sur ton bureau nommé `kingdom-journey`
2. Copie tous les fichiers de ce projet dedans
3. Renomme `.env.example` en `.env.local`
4. Ouvre `.env.local` avec un éditeur de texte (Notepad, TextEdit...)
5. Remplis les valeurs :

```
NEXT_PUBLIC_SUPABASE_URL=https://ton-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ta-cle-anon
SUPABASE_SERVICE_ROLE_KEY=ta-cle-service-role
JWT_SECRET=une-longue-phrase-secrete-inventee-par-toi
```

Pour la Bible API (optionnel pour commencer) :
1. Va sur https://scripture.api.bible
2. Crée un compte gratuit
3. Copie ta clé dans `BIBLE_API_KEY`

Pour Anthropic (assistant Eli) :
1. Va sur https://console.anthropic.com
2. Crée un compte, ajoute quelques dollars de crédit
3. Copie ta clé dans `ANTHROPIC_API_KEY`

---

## ÉTAPE 4 — Lancer en local (sur ton ordinateur)

Ouvre un terminal dans le dossier du projet et tape :

```bash
# Installer les dépendances (à faire une seule fois)
npm install

# Lancer le serveur de développement
npm run dev
```

Ouvre ton navigateur sur http://localhost:3000
🎉 L'application tourne !

---

## ÉTAPE 5 — Mettre en ligne sur Vercel (gratuit)

### A. Créer un compte GitHub (si tu n'en as pas)
1. Va sur https://github.com
2. Crée un compte gratuit

### B. Mettre le code sur GitHub
1. Va sur https://github.com/new
2. Crée un dépôt nommé `kingdom-journey` (privé)
3. Suis les instructions pour "push" ton code
   (ou utilise GitHub Desktop si tu ne connais pas Git :
    https://desktop.github.com)

### C. Déployer sur Vercel
1. Va sur https://vercel.com
2. Connecte-toi avec ton compte GitHub
3. Clique **"Add New Project"**
4. Sélectionne ton dépôt `kingdom-journey`
5. Dans **"Environment Variables"**, ajoute les mêmes variables que dans `.env.local`
6. Clique **"Deploy"** !

✅ Dans 2 minutes, ton app est en ligne à une URL comme :
`https://kingdom-journey-ton-nom.vercel.app`

---

## ÉTAPE 6 — Mettre à jour le frontend

Dans le fichier `public/index.html`, trouve ces lignes et remplace par tes vraies valeurs :

```javascript
const SUPABASE_URL  = 'https://TON-PROJET.supabase.co'   // ← ta vraie URL
const SUPABASE_ANON = 'ta-cle-anon-supabase'              // ← ta vraie clé
const API_BASE      = 'https://kingdom-journey.vercel.app' // ← ton URL Vercel
```

---

## 🆘 PROBLÈMES COURANTS

### "npm : commande introuvable"
→ Node.js n'est pas installé. Reviens à l'Étape 1.

### "Invalid API key"
→ Vérifie que tu as bien copié tes clés Supabase dans `.env.local`

### La page est blanche
→ Ouvre la console du navigateur (F12) et cherche les erreurs en rouge

### "relation does not exist"
→ Tu n'as pas exécuté le fichier `database.sql` dans Supabase

---

## 📧 STRUCTURE DES FICHIERS

```
kingdom-journey/
├── api/
│   ├── auth/
│   │   ├── register.js   ← Inscription
│   │   └── login.js      ← Connexion
│   ├── quiz.js           ← Jeu quiz
│   ├── eli.js            ← Assistant IA
│   ├── user.js           ← Profil utilisateur
│   └── leaderboard.js    ← Classement
├── lib/
│   └── supabase.js       ← Connexion base de données
├── public/
│   └── index.html        ← L'application complète
├── database.sql          ← Script création base de données
├── .env.example          ← Template des variables d'environnement
├── .env.local            ← TES variables (ne pas partager !)
└── package.json          ← Dépendances du projet
```

---

## 🚀 PROCHAINES ÉTAPES (après le déploiement)

1. **Tester** avec 2-3 amis en leur envoyant le lien
2. **Ajouter des questions** quiz via Supabase (Table Editor)
3. **Activer les notifications** push (Firebase)
4. **Ajouter la Bible complète** (API scripture.api.bible)
5. **App mobile** (Flutter) — disponible en Phase 2

---

Bonne aventure ! ✦
