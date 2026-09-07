# Carnet Système Fluide

Carnet d'entraînement **hors-ligne**, installable sur iPhone, qui s'ouvre aussi
dans un navigateur PC. Pas de compte, pas de serveur, pas de synchro : tout est
stocké dans l'appareil, avec export/import JSON dans les réglages.

Le programme, les cibles de volume et toute la logique de calcul viennent du
classeur *Carnet Entrainement — Système Fluide* : 5 séances, 35 exercices,
101 séries par semaine.

---

## Installer sur iPhone

L'app n'est pas sur l'App Store — elle s'installe depuis Safari, en trois gestes.

1. Ouvre l'URL de l'app **dans Safari** (pas Chrome, pas Firefox : sur iOS,
   seul Safari sait installer une PWA).
2. Touche le bouton **Partager** (le carré avec la flèche vers le haut, en bas
   de l'écran).
3. Fais défiler et choisis **« Sur l'écran d'accueil »**, puis **Ajouter**.

L'icône apparaît sur l'écran d'accueil. Lancée depuis là, l'app s'ouvre en plein
écran, sans barre d'adresse, et **fonctionne en mode avion** : tout le code, les
polices et les données sont sur le téléphone.

> Ouvre-la une fois avec du réseau avant d'aller à la salle : c'est ce premier
> lancement qui met le service worker en place.

### Sur Android

Chrome propose « Installer l'application » ou « Ajouter à l'écran d'accueil »
directement dans son menu.

### Sur PC

Rien à installer : ouvre l'URL. Chrome et Edge proposent aussi une installation
depuis l'icône dans la barre d'adresse. Même code, mêmes données locales à ce
navigateur.

---

## Développement

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # les 44 tests de la couche de calcul
npm run build      # tsc + vite build → dist/
npm run preview    # sert dist/ pour tester le service worker
```

Le service worker ne tourne **pas** en `dev`. Pour tester l'installation et le
hors-ligne, il faut passer par `npm run build && npm run preview`.

## Déploiement sur Vercel

```bash
npx vercel --prod
```

C'est tout : `vercel.json` est déjà là, Vercel détecte Vite tout seul
(build `npm run build`, sortie `dist/`). Aucune variable d'environnement,
aucune base, aucun back-end — c'est un site statique.

Pour n'importe quel autre hébergeur statique (Netlify, Cloudflare Pages,
GitHub Pages) : `npm run build` et sers `dist/`.

---

## La saisie en salle

C'est la seule chose qui compte vraiment. Une main, entre deux séries, les mains
moites.

- **Un bloc visible à la fois.** Pas de liste à faire défiler.
- **Jamais de clavier.** kg, reps et RIR se règlent au +/- sur des boutons de
  56 px. Appui maintenu = répétition rapide.
- **Tout est déjà rempli.** Chaque champ arrive en gris avec la valeur de *la
  même série la semaine dernière*. Un tap sur « Série validée » et c'est écrit.
  Ce qui passe en **jaune**, c'est ce que tu as bougé toi.
- **Au-dessus de chaque série** : « S. dernière : 14 kg × 12 · RIR 1 » et le
  record e1RM à battre. Battre le record déclenche un bandeau vert.
- **Minuteur automatique** à la validation : 1 min 30 en isolation, 3 min en
  polyarticulaire, déduit de l'exercice. Ajustable (+30 s), vibration et bip.
- **Supersets** [SS1] / [BS1] en un seul bloc, un seul bouton pour les deux
  séries, aucun repos entre les deux.
- **Sombre par défaut**, écran maintenu allumé pendant la séance.

Le pré-remplissage suit cette cascade, première valeur trouvée :

1. même exercice, **même n° de série**, séance précédente ;
2. même exercice, série précédente de ce soir ;
3. dernière valeur connue sur cet exercice ;
4. 0 kg · 10 reps · 2 RIR — ou le **poids de corps** sur la traction.

---

## Les calculs

Tous dans `src/domain/`, en fonctions pures : ni Dexie, ni React, ni `Date.now()`
caché. C'est la couche à ne pas retoucher le jour où on branche un serveur, et
c'est elle que couvrent les tests.

**e1RM — Epley ajustée du RIR**

```
e1RM = kg × (1 + (reps + RIR) / 30)
```

Le RIR s'ajoute aux répétitions : deux séances restent comparables même sans le
même nombre de reps.

**Meilleur e1RM de la semaine** = max des séries de l'exercice sur la semaine.

**Δ vs record** = e1RM de la semaine − max de *toutes* les semaines précédentes.
Vert si positif, rouge si négatif. C'est bien le record qui sert de référence,
pas la semaine juste avant.

**Volume hebdomadaire** — séries validées par muscle contre la cible :

| Muscle     | Cible | Catégorie   |
| ---------- | ----: | ----------- |
| Épaules    |    21 | Prioritaire |
| Dorsaux    |    21 | Prioritaire |
| Mollets    |    12 | Prioritaire |
| Pectoraux  |    12 | Modérée     |
| Triceps    |     9 | Modérée     |
| Ischios    |     9 | Modérée     |
| Quadriceps |     8 | Modérée     |
| Biceps     |     6 | Maintenance |
| Adducteurs |     3 | Maintenance |

Vert dans ±20 %. Rouge à plus de 20 % au-dessus. Ambre à plus de 20 % en
dessous — le classeur ne tranchait pas ce cas, et sous-volume et sur-volume ne
se corrigent pas de la même façon. Ordre de coupe si ça dérive :
Pectoraux → Triceps → Quadriceps, jamais les prioritaires en premier.

**Verdict baromètres** — sur l'élévation latérale uni câble (instance **Push**)
et la traction pronation, on compare `max(3 dernières semaines)` à
`max(3 semaines d'avant)` :

| Situation             | Verdict                          |
| --------------------- | -------------------------------- |
| Les deux ≤            | **STOP** — couper le volume      |
| Un seul ≤             | **Vigilance**                    |
| Aucun                 | **OK** — ne touche à rien        |
| Avant la semaine 6    | **Phase d'installation**         |
| Fenêtres incomplètes  | **Données insuffisantes**        |

**Nutrition** — on ne lit jamais le poids brut, seulement la moyenne 7 jours et
sa tendance : `moy7j(aujourd'hui) − moy7j(J−7)`, seuil ±0,15 kg.

| Phase             | Baisse | Stagne | Hausse |
| ----------------- | -----: | -----: | -----: |
| Descente          |   rien |   −200 |   −200 |
| Pré-préparation   |   rien |   +200 |   rien |
| Remontée          |   rien |   +200 |   rien |
| Reverse diet      |   +200 |   rien |   rien |
| Prise de masse    |   +200 |   rien |   rien |
| Reset             |   rien |   rien |   rien |

**Traction** — la charge saisie est **poids de corps + lest** (78 à vide, 88
avec 10 kg). Le champ « poids de corps » des réglages pré-remplit le kg.

---

## Le programme est éditable dans l'app

**Plus → Éditer le programme.** Ajouter, retirer, réordonner, renommer, changer
les séries cibles, le muscle, le type (isolation / polyarticulaire), le pas des
kg, le tag de superset, le repos, le marqueur de baromètre, la note affichée en
salle. Les cibles de volume par muscle s'éditent au même endroit.

Rien de tout ça ne touche au code. Et l'historique tient : le journal ne
référence que des identifiants stables, donc renommer un exercice ne casse pas
sa courbe. Un exercice retiré qui a de l'historique est **archivé**, pas
supprimé — ses données restent lisibles et il peut être remis.

`src/data/seed.ts` ne sert qu'à la toute première ouverture. « Réinstaller le
programme d'origine » dans les réglages y revient sans toucher à l'historique.

---

## Sauvegarde

Il n'y a **aucun serveur**. Tout vit dans l'IndexedDB de ce navigateur, sur cet
appareil. Effacer les données de Safari, changer de téléphone ou désinstaller
l'app efface le carnet.

**Réglages → Exporter en JSON** produit un fichier daté
(`carnet-2026-09-07.json`) qui contient le programme, l'historique complet des
séances et des séries, la nutrition, les phases et les réglages. C'est la seule
sauvegarde qui existe, et c'est aussi comme ça qu'on passe d'un appareil à
l'autre.

L'import remplace **tout** le contenu actuel, en une transaction : un import qui
échoue ne laisse pas la base à moitié écrasée.

---

## Architecture

```
src/
├── domain/          Fonctions pures. Aucune dépendance.
│   ├── types.ts         La donnée telle qu'un serveur la recevrait
│   ├── e1rm.ts          Epley ajustée du RIR
│   ├── week.ts          Semaines ISO depuis startDate, dates locales
│   ├── progression.ts   Meilleur e1RM par semaine, Δ vs record
│   ├── volume.ts        Séries par muscle vs cible, ±20 %
│   ├── barometers.ts    Le verdict sur deux fenêtres de 3 semaines
│   ├── nutrition.ts     Moyenne 7 j, tendance, décision par phase
│   ├── prefill.ts       La cascade de pré-remplissage
│   ├── blocks.ts        Supersets, durées de repos
│   └── domain.test.ts   44 tests
├── data/            La seule couche à réécrire pour une synchro serveur
│   ├── db.ts            Schéma Dexie, seed idempotent
│   ├── seed.ts          Le programme du classeur
│   ├── repo.ts          Toutes les lectures et écritures
│   └── backup.ts        Export / import JSON
├── hooks/           useLiveQuery, minuteur, wake lock
├── ui/              Stepper, courbe SVG, primitives
└── screens/         Les 9 écrans
```

**Le principe.** Les composants ne parlent jamais à Dexie directement : ils
passent par `data/repo.ts`. Les calculs ne connaissent pas la base : ils
reçoivent des tableaux et rendent des valeurs. Brancher une synchro serveur plus
tard revient à réécrire `data/`, sans toucher à une seule règle de calcul ni à
un écran.

### Choix techniques

- **HashRouter** (`#/volume`) plutôt que des URL propres : aucune réécriture
  serveur à configurer, et l'app démarre depuis n'importe où, y compris depuis
  le cache hors-ligne.
- **Polices auto-hébergées** (`public/fonts/`, Archivo + IBM Plex Mono, SIL OFL
  1.1) au lieu de Google Fonts : sinon la typographie retombe sur la police
  système dès qu'il n'y a pas de réseau. Le service worker les précache.
- **e1RM stocké** à l'écriture de chaque série, en plus d'être recalculable :
  les courbes s'affichent sans repasser sur des milliers de lignes.
- **Le minuteur vit dans `localStorage`**, en heure d'échéance absolue : il
  survit à un changement d'exercice, à un verrouillage d'écran et à un
  rechargement, et reste juste même si le navigateur gèle les timers en
  arrière-plan.

### Limites connues

- **iOS ignore `navigator.vibrate`.** Le minuteur émet aussi un bip (activé par
  défaut, réglable) : c'est lui qui fera le travail sur iPhone.
- Les **mesures et photos** du classeur (onglet Bilan) sont dans le modèle de
  données et dans l'export, mais n'ont pas d'écran de saisie. C'était le choix
  validé avant développement ; l'ajouter revient à écrire un formulaire sur la
  table `checkins`, déjà en place.
- Chaque navigateur a sa propre base. Passer du téléphone au PC se fait par
  export/import.
