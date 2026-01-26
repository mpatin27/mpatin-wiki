export const TEMPLATES = [
  {
    id: 'meeting',
    label: 'Compte Rendu Réunion',
    icon: '📅',
    content: `# Compte Rendu : [Sujet]
**Date :** **Participants :** @...

## 1. Points abordés
- Point A
- Point B

## 2. Décisions
> Décision importante prise.

## 3. Actions à suivre (To-Do)
- [ ] Tâche 1
- [ ] Tâche 2
`
  },
  {
    id: 'tech-doc',
    label: 'Documentation Technique',
    icon: '💻',
    content: `# Documentation : [Nom du Service]

## 🧐 C'est quoi ?
Description courte du service ou de la fonctionnalité.

## ⚙️ Installation
\`\`\`bash
npm install mon-package
\`\`\`

## 🚀 Utilisation
Explication de comment l'utiliser...

## ⚠️ Pièges connus
- Attention à la version X...
`
  },
  {
    id: 'daily',
    label: 'Journal de bord',
    icon: '📓',
    content: `# Journal du ${new Date().toLocaleDateString()}

## 🎯 Objectifs du jour
- 

## 📝 Notes & Réflexions
...

## ✅ Accomplissements
- 
`
  }
];