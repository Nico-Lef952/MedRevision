# 🧬 Du Diagnostic d'une Maladie Génétique à la Prise en Charge des Apparentés

> **2ème année de Médecine** · Fiche de révision complète · Importable dans Notion
> 

---

## 📌 À retenir absolument

> 💡 **Cas index** = patient atteint → analyse **large** → prescrite par **n'importe quel médecin**
💡 **Apparenté** = familial du cas index → analyse **ciblée** → prescrite **uniquement par un généticien**
💡 **Hétérozygote** = un seul allèle muté · **Homozygote** = deux allèles mutés · **Hémizygote** = lié à l'X chez le garçon
💡 **Variants de classe 3 = pas de responsabilité médicale engagée**
💡 **DPN** = diagnostic prénatal · **DPI** = diagnostic préimplantatoire · **DPS** = diagnostic présymptomatique
> 

---

## 1️⃣ Vocabulaire Fondamental

### Cas index vs Apparenté

|  | **Cas index** | **Apparenté** |
| --- | --- | --- |
| Définition | Individu **atteint** de la maladie génétique | Individu lié **par un lien familial** au cas index |
| Statut | Symptomatique | Peut être **asymptomatique** |
| Analyse | **Large** (tout le gène / panel) | **Ciblée** (uniquement la variation identifiée) |
| Durée/Coût | Longue et coûteuse | Rapide, simple, beaucoup moins chère |
| Qui prescrit | **N'importe quel médecin** | **Uniquement généticien ou conseiller en génétique** |

### Exemple concret — Mucoviscidose

```
CAS INDEX (enfant) :
  Suspicion mucoviscidose → Analyse complète gène CFTR
  Prescrite par le pédiatre
  Résultat : mutation p.Phe508del homozygote

APPARENTÉ (frère asymptomatique) :
  Recherche ciblée mutation p.Phe508del
  Prescrite par le généticien
```

---

## 2️⃣ Identification d'une Variation par NGS

### Lecture des résultats NGS → Déduction du mode de transmission

| Observation sur les reads | État | Transmission probable |
| --- | --- | --- |
| Variation sur **50%** des reads | **Hétérozygote** | Autosomique dominante |
| Variation sur **100%** des reads | **Homozygote** | Autosomique récessive |
| Variation chez le garçon sur **tous les reads** (absence de deuxième allèle) | **Hémizygote** | Liée à l'X |

### Confirmation par séquençage Sanger

- Séquencer **le cas index + ses deux parents**
- Absence de la variation chez les 2 parents → **variation de novo** → risque de récurrence faible

### Exemples cliniques

- **Cas 1 — Variation hétérozygote (gène EHMT1)**
    - 50% des reads avec C→T
    - Parents indemnes → variation **de novo**
    - Transmission : autosomique dominante
- **Cas 2 — Variation homozygote**
    - 100% des reads mutés chez l'enfant
    - Deux parents hétérozygotes (C/T)
    - Risque de récurrence : **1/4 (25%)**
- **Cas 3 — Variation hémizygote**
    - Garçon : variation sur tous les reads (pas de 2ème allèle)
    - Mère hétérozygote = **conductrice**
    - Risque qu'un garçon soit atteint : **1/2 (50%)**
    - Papa : pas besoin d'explorer (il transmet le chromosome Y)

### Les 5 Classes de Variants (rappel)

| Classe | Signification | Implication |
| --- | --- | --- |
| 1 | Bénin | Pas de conséquence |
| 2 | Probablement bénin | Pas de conséquence |
| **3** | **Incertaine** | **Pas de responsabilité médicale engagée** |
| 4 | Probablement pathogène | Prise en charge |
| 5 | Pathogène | Prise en charge |
- Icon
    
    ![image.png](%F0%9F%A7%AC%20Du%20Diagnostic%20d'une%20Maladie%20G%C3%A9n%C3%A9tique%20%C3%A0%20la%20Prise/image.png)
    

---

## 3️⃣ I — Diagnostic Présymptomatique (DPS)

### Maladies Autosomiques Dominantes à Révélation Tardive

### Définition — Transmission autosomique dominante

- Gène sur un **autosome**
- **Un seul allèle morbide** suffit à exprimer la maladie
- **Pénétrance** = probabilité qu'un sujet hétérozygote pour un allèle dominant exprime le phénotype → toujours exprimée **en fonction de l'âge**

---

- 🩷 Exemple 1 — Prédisposition au Cancer du Sein et de l'Ovaire (BRCA1/2)
    
    **Épidémiologie :**
    
    - 1 femme sur 8 développe un cancer du sein dans sa vie
    - **95% sporadiques** / **5% héréditaires**
    
    **Indications pour évoquer une prédisposition héréditaire :**
    
    | Situation | Seuil d'âge |
    | --- | --- |
    | Cancer du sein | **< 36 ans** |
    | Cancer du sein triple négatif (RO⁻, RP⁻, ERBB2⁻) | **< 61 ans** |
    | Cancer du sein agressif, grade élevé, révélé par autopalpation | **< 51 ans** |
    | Cancer du sein bilatéral (premier cas) | **< 51 ans** |
    | Cancer du sein chez **l'homme** | **< 71 ans** |
    | Cancer de l'ovaire | **< 65 ans** |
    | Cancer sein < 51 ans + cancer ovaire chez apparentée 1er/2ème degré | — |
    | Cancer sein < 51 ans + cancer prostate < 71 ans chez apparenté 1er/2ème degré | — |
    
    > 🔑 Ces situations = **indications à réaliser un panel** (analyse simultanée de plusieurs gènes)
    > 
    - **Pénétrance à 80 ans :** importante, augmente avec l'âge
        
        
        |  | Cancer du sein | Cancer de l’ovaire |
        | --- | --- | --- |
        | BRCA1 | 72% | 44% |
        | BRCA2 | 69% | 17% |
        | Population générale | 9% | 1% |
    
    **Prise en charge des apparentées PORTEUSES :**
    
    | Âge | Mesure |
    | --- | --- |
    | **Dès 20 ans** | Palpation des seins + creux axillaires tous les **6 mois** |
    | **Dès 30 ans** | IRM mammaire annuelle + 1 incidence mammographie (ou 5 ans avant le cas le plus jeune) |
    | **Avant 40 ans** (surtout BRCA1) | Mastectomie prophylactique (après info + réflexion + accompagnement psy) |
    | **Après 40–45 ans** (BRCA2) et après tout projet parental | Annexectomie prophylactique |
    
    > ✅ **Pas de contre-indication à la contraception orale**
    ⚠️ **Toujours prendre en compte l'âge le plus jeune d'apparition dans la famille**
    > 
    
- 🔵 Exemple 2 — Cancer Colorectal Non Polyposique (Syndrome de Lynch)
    - Pénétrance **incomplète**, **augmente avec l'âge**
    - Pénétrance à 70 ans = risque cumulé significatif
    
    **Cancers associés (les plus fréquents à retenir) :**
    
    - **Colorectal** +++
    - **Endomètre** +++
    - Ovaire, estomac, voies biliaires, voies urinaires, intestin grêle, cerveau
    
    **Exercice type — Calcul de risque :**
    
    ![image.png](%F0%9F%A7%AC%20Du%20Diagnostic%20d'une%20Maladie%20G%C3%A9n%C3%A9tique%20%C3%A0%20la%20Prise/image%201.png)
    
    ```
    Arbre : Grand-père atteint → père porteur → Anna (fille du père)
                                              → Arthur (fils du frère du père)
    
    Anna : risque d'être porteuse = 1/2
    
    Arthur : sa mère est supposée saine → risque = 1/4
      (1/2 × 1/2 = 1/4 si les deux parents supposés porteurs)
    ```
    
- 🔴 Exemple 3 — Maladie de Huntington
    
    **Clinique :**
    
    - Affection neurodégénérative → striatum puis cortex
    - Début : **30–50 ans**
    - Troubles moteurs + comportementaux + modifications de la personnalité + troubles cognitifs (perte mémoire)
    - Évolution → perte d'autonomie totale → décès
    - **Absence de traitement**
    
    **Mécanisme moléculaire :**
    
    - Expansion de triplets **CAG répétés (> 35 CAG)** sur le bras court du **chromosome 4** dans le gène **HTT** (huntingtine)
    - **Pénétrance = 100%**
    
    **DPS Huntington = parcours strict :**
    
    - Consultations avec le généticien + le neurologue + le psychologue
    - Temps de réflexion entre chaque consultation
    
    > ⚠️ Si variation de **novo** → risque de **mosaïque germinale** → impossible de distinguer si la variation est survenue post-zygotique ou dans les cellules germinales → risque de récurrence non nul chez les fratries
    > 

---

### Principes Éthiques du DPS

| Principe | Contenu |
| --- | --- |
| **Communication** | Information claire et complète : maladie, mode de transmission, déroulement du test |
| **Autonomie** | Décision personnelle résultant d'une bonne information + temps de réflexion |
| **Droit de savoir / ne pas savoir** | Libre de refuser → interruption possible à tout moment |
| **Confidentialité** | Résultat transmis **oralement** uniquement · ne peut être communiqué sans **autorisation écrite** |
| **Obligation d'information à la parentèle** | Devoir du patient d'informer les apparentés (les médecins peuvent intervenir si refus) |

> 💡 Cycle de plusieurs consultations + temps de réflexion + consentement signé **avant** toute prise de sang
💡 Identification d'une variation génétique = **parcours de vie radicalement modifié** → psychologie + culpabilité
> 

---

## 4️⃣ II — Maladies Autosomiques Récessives

### Principes

- Allèle muté **récessif** sur l'allèle sauvage
- **Hétérozygotes = sains** (porteurs)
- La maladie ne s'exprime que si **les deux allèles sont mutés** (homozygote ou hétérozygote composite)
- Mutation sur les **autosomes**
- Si 2 parents hétérozygotes → risque enfant atteint = **1/4 (25%)**

**Hétérozygote composite** = deux variations **différentes** portées **en trans** (sur les 2 allèles différents)

---

- 🫁 Exemple 1 — Mucoviscidose
    
    **Épidémiologie :** 1 naissance sur 3 600
    
    **Atteintes :**
    
    - **Pulmonaire** = principale cause de mortalité
    - Digestive
    - Canaux déférents (stérilité chez les hommes)
    
    **Espérance de vie :** ~45 ans
    
    **Calculs de risque — Méthode +++**
    
    > 🔑 **Pour un apparenté sain d'un cas atteint :**
    Utiliser le tableau des allèles pour calculer le risque d'être hétérozygote
    > 
    
    > 🔑 **Pour un conjoint sans antécédents familiaux :**
    Utiliser la formule de Hardy-Weinberg : **2pq** avec q² = incidence de la maladie
    > 
    
    **Exemple complet :**
    
    ```
    Incidence mucoviscidose = 1/3600
    q² = 1/3600  →  q = 1/60  →  p ≈ 1
    Risque hétérozygote dans la population = 2pq = 2 × 1 × 1/60 = 1/30
    
    Risque Pierre (frère sain d'un malade) = 2/3
    
    Risque conjoint (population générale) = 1/30
    
    Risque enfant atteint = 2/3 × 1/30 × 1/4 = 1/180
    ```
    
    - Compléments :
        
        On est dans le cas classique d’une **maladie autosomique récessive**.
        
        👉 Louise est atteinte → donc ses deux parents sont **obligatoirement hétérozygotes** (Aa × Aa).
        
        Quand deux hétérozygotes ont un enfant, les probabilités sont :
        
        - 1/4 **aa** → malade
        - 1/2 **Aa** → porteur sain (hétérozygote)
        - 1/4 **AA** → sain non porteur
        
        Donc au total :
        
        - 1/4 malade
        - 3/4 non malades
        
        Pierre est **non malade**.
        
        On exclut donc la case "aa".
        
        Il reste seulement :
        
        - AA
        - Aa
        - Aa
        
        Parmi les **3 enfants possibles non malades**, il y a :
        
        - 2 hétérozygotes (Aa)
        - 1 non porteur (AA)
        
        Donc : P(hétérozygote | non malade) = 2 / 3
        
        A partir du même arbre, quel est le risque que la conjointe de pierre soit hétérozygote ?
        
        - On n’a pas d’informations sur elle, donc son risque est celui de la population générale. Il se calcul en utilisant la formule 2PQ
            
            [](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAhkAAAC1CAYAAADyW+03AAAQAElEQVR4AeydB5RV1dn3n2ewl9gVO3bsiN3YXmvsJsuybGnGXr6lsSxL1GhiNIogYklEJX5GV9TXvmzLgsEGWLBjQRDEAoioSC/v/e3DnnvunXtnhpGZOefe/8C+++xydvntcp6z22mYqz8REAEREAEREAERaAcCDaY/ERABERABERCBDBGonaRIyKidslROREAEREAERCBTBCRkZKo4lBgREAEREIG2EtB92SMgISN7ZaIUiYAIiIAIiEBNEJCQURPFqEyIgAiIQFsJ6D4RaD8CEjLaj61CFgEREAEREIG6JiAho66LX5kXARFoKwHdJwIi0DIBCRktM5IPERABERABERCBNhCQkNEGaLpFBESgrQR0nwiIQD0RkJBRT6WtvIqACIiACIhABxKQkNGBsBWVCLSVgO4TAREQgTwSkJCRx1JTmkVABERABEQgBwQkZOSgkJTEthLQfSIgAiIgAp1JQEJGZ9JX3CIgAiIgAiJQwwQkZNRw4bY1a7pPBERABERABBYEAQkZC4KiwhABERABERABEWhCQEJGEyRttdB9IiACIiACIiACaQISMtI0dN3pBObOnRvSgI7CgB4V5qiwi9dRr2QX3aSLgAiIgAh0LIFOFzI6NruKLYsEomCA7u4WdXcPyXV3c09UsGjmx92bcZWTCIiACIhARxKQkNGRtBVXRQLuiWDgXhQwKnoss3RP7iuzDkJKuZ3MIiACIiACrSawwDxKyFhgKBXQTyUwZ84cmzx5sn3++ec2evToEjVmzBgbO3asjR8/3qZNm2b4rRafeyKsVHOXvQiIgAiIQMcQkJDRMZwVSysIfP/99/bggw/aGWecYSeeeGKJOvnkk+2ss86yXr162aOPPmojRoywKVOmVA3VvfIoR9Ub5CACIiACP5WA7m9CQEJGEySy6CwCo0aNsocfftgeeughe+qpp0rU448/bvfdd59dffXVdvTRR9vxxx9vTz75pP3444+dlVzFKwIiIAIi0AIBCRktAJJz+xJgkWeMYebMmTZ9+vRotMUXX9zWWGMNW3fddW3ttde25Zdf3rp06WKzZs2yQYMG2VVXXWXPPfdcs1MnjYHpQgREoEMIpNt0pQije9TNrJI32dUIAQkZNVKQec2GezKtETsc98RMfrbZ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Ef2V66WhyZQ3AhIy8lZiSm8jgTFjxti9995rvXv3trvuustGjBjR6KYLERCBbBBwT0YnECoGDx5sN954o11//fX2/PPP27Rp0xoT6Z74cy/VGz3oIpcEOlrIyCUkJbpjCcQ3meZiZdTi8ccftz/+8Y/217/+NXRaQ4cObe4WuYmACLQzgUptN9p9+OGH1qdPH7vkkkvsiiuusPvuu8++++67kKLoJxj0U1MEMiNkMIw2fvx4Gz16dFCfffZZ0DF//vnn9tVXX9n3339vs2bNqqkCqPXMUK7jxo0LZcnIA+UZFeX65Zdfho4mXa7uyZtMc2y++OILGzZsmE2aNCmsy1h//fVtiy22CLfMmDHDYpwxLuJGESd1ic4tHWe4sexHHV8ZEBlrnsCcOXNCP0s7iW0n6rSfsWPH2oQJE5pMdQCG9uLetO26uxHu+++/b2+++SZebYUVVrCNN97YVllllWB2b3pfcEj9EH7KqMsFSqD9AsuMkPHee+/ZX/7yFzvppJPsxBNPbNRPPvlkO+200+yiiy6y22+/3V599dVQyZmPbz8sCnlBEaBcr7zyylCeJ5xwQihbyjeW68UXX2x33HFHKFeEzObKNXYy6HRYb7zxRkjmYostZptuuql17949mNNxEheKuKlbsS6l46QDDDeW/bi33PGV3SKjCOSWAO2KF7mHHnrIzjjjjMa2SvtB0WbPOussu+aa5fZNlQAAEABJREFUa+yxxx6zjz/+2KZMmdKYX/fK7YVweRl49913w8sGN2y00Ua29dZbhxcEzGmF/7Q5Xrt74xqOan6iX+nZIZAZIQPhoX///vbkk0/a008/bU899VRQTzzxhD3yyCPhQUQFP/zww+2qq67S/Ht26lCzKWEO9tZbbw3lGssUPZYrgiPlesQRRzSWa+xAoh4jcE86MUYqEDJQuK277rq21VZb2SKLLIIxCCzNxYmAQZzUpauvvto++eSTxs4rBKAfEahDAu5uI0eONIQMFO00KvpkpieZ4vj73/9uRx99tP3hD38w2jGLr8EV22vUo52720cffWS8FCDQd+nSJYxibL755nhpotyTdl7uQLjuiZt7opf76Wiz4muZQGaEDCofQ+vuSeVZfvnljYfHOuusY6uuuqotvvjiITcMdd9888120003hV0FwVI/mSXAlARCAQmkcykv1yWWWAInY9rklltu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)
            
        - Je connais l’incidence de la maladie qui est q2 =1/3600, donc q= 1/60
        - Je considère que p est très proche de 1
            
            On associe souvent **p ≈ 1** parce qu’on travaille en général avec **des maladies rares**.
            
            Dans Hardy-Weinberg : p+q=1
            
            - p = fréquence de l’allèle normal
            - q = fréquence de l’allèle muté
            
            Si la maladie est rare q2 est petitq donc q est petit
            
            Exemple :
            
            Si incidence = 1/10 000
            
            q2=1/10000⇒q=1/100
            
            Donc :
            
            p=1−q=1−1/100=0,99 👉 p est très proche de 1.
            
        - ⬄ 2pq = 2x1x1/60=1/30
        - Enfin le risque d’avoir un enfant atteint : 2/3 x 1/30 x ¼ = 1/180
        
        ![image.png](%F0%9F%A7%AC%20Du%20Diagnostic%20d'une%20Maladie%20G%C3%A9n%C3%A9tique%20%C3%A0%20la%20Prise/image%202.png)
        
    
    **Si la mère est sœur d'un malade :**
    
    ```
    Risque Anne (sœur saine) = 1/2
    Risque Jules (conjoint, population générale) = 1/30
    Risque enfant atteint = 1/2 × 1/30 × 1/4 = 1/240
    ```
    
    - Compléments :
        
        ### 1️⃣ Incidence de la mucoviscidose
        
        Maladie autosomique récessive.
        
        Incidence = 1/3600 = q²
        
        q=1/60q = 1/60
        
        q=1/60
        
        Fréquence des hétérozygotes :
        
        2pq≈2q=2×160=1302pq \approx 2q = 2 \times \frac{1}{60} = \frac{1}{30}
        
        2pq≈2q=2×601=301
        
        Donc **dans la population générale : 1/30 est porteur**.
        
        ---
        
        ### 2️⃣ Risque d’Anne d’être hétérozygote
        
        Dans l’arbre, Maxime et Hélène ont une fille atteinte (Louise) → ils sont obligatoirement **Aa × Aa**.
        
        Anne est la sœur de Maxime.
        
        ⚠️ On ne peut PAS dire qu’elle a 1/2 de risque.
        
        Les parents de Maxime (et donc d’Anne) doivent contenir au moins un allèle muté (puisqu’ils ont transmis l’allèle à Maxime).
        
        Situation classique :
        
        Anne est sœur d’un hétérozygote dans une famille où l’un des parents est porteur.
        
        Le risque correct pour Anne est **1/2** d’être porteuse **si un seul parent est porteur** (cas le plus probable).
        
        Donc ici on retient :
        
        P(Anne porteuse)=1/2P(Anne\ porteuse) = 1/2
        
        P(Anne porteuse)=1/2
        
        ---
        
        ### 3️⃣ Risque de Jules
        
        Aucun antécédent → population générale :
        
        P(Jules porteur)=1/30P(Jules\ porteur) = 1/30
        
        P(Jules porteur)=1/30
        
        ---
        
        ### 4️⃣ Risque d’avoir un enfant atteint
        
        Pour avoir un enfant atteint :
        
        - Anne porteuse (1/2)
        - Jules porteur (1/30)
        - Transmission des deux allèles mutés (1/4)
        
        1/2×1/30×1/41/2 \times 1/30 \times 1/4
        
        1/2×1/30×1/4
        
        =1/240= 1/240
        
        =1/240
        
        ![voici le nouvel arbre généalogique de la famille. A qui doit on proposer de bénéficier d’une consultation de génétique en urgence ? —> En urgence à Anne et Jules du fait de la grossesse en cours !!](%F0%9F%A7%AC%20Du%20Diagnostic%20d'une%20Maladie%20G%C3%A9n%C3%A9tique%20%C3%A0%20la%20Prise/image%203.png)
        
        voici le nouvel arbre généalogique de la famille. A qui doit on proposer de bénéficier d’une consultation de génétique en urgence ? —> En urgence à Anne et Jules du fait de la grossesse en cours !!
        
    
    > ⚠️ **Consultation urgente en génétique** si grossesse en cours → proposer DPN
    > 
    
    **Résumé méthode :**
    
    - **Risque a priori** = calculé à partir de l'arbre généalogique
    - **Risque a posteriori** = après résultat des examens génétiques (affine le risque a priori)
- 🩸 Exemple 2 — Maladies Récessives Liées à l'X
    
    ### Hémophilie
    
    - Garçons atteints / Filles conductrices
    - Diagnostic biologique : **TCA allongé**
    - Circonstances : forme familiale ou cas sporadique
    - **Transmission père → fils impossible** (le père transmet Y)
    - Intérêt de l'étude familiale : conseil génétique aux femmes conductrices → proposition de DPN
    
    ### Syndrome de l'X Fragile
    
    **Clinique :**
    
    - Retard mental (cause la plus fréquente de déficience intellectuelle héréditaire : **1% des enfants avec déficience intellectuelle**)
    - Retard de langage
    - Dysmorphie faciale modérée
    - Macroorchidisme (après adolescence)
    - **Garçons ET filles atteints**
    
    **Mécanisme — Phénomène d'Anticipation +++**
    
    > **Définition :** Maladie qui, lors de la transmission d'une génération à l'autre, survient de plus en plus tôt ou devient plus grave
    > 
    
    **Mécanisme moléculaire :**
    
    - Augmentation de la taille de la répétition (instabilité des séquences) lors de la transmission à la génération suivante
    
    | Statut | Nombre de répétitions CGG | Conséquence |
    | --- | --- | --- |
    | Normal | < 55 | Sain |
    | **Prémutation** | 55–200 | Porteur à risque (risque d'expansion) |
    | **Mutation complète** | > 200 | Syndrome de l'X fragile |
    
    **Règles clés :**
    
    - Le passage **prémutation → mutation complète** ne se fait que **par les femmes**
    - **Pas de mutations de novo !**
    - Une fille porteuse d'une mutation complète a **1 risque sur 2** d'avoir une déficience intellectuelle
    - La mère d'un enfant atteint est porteuse soit d'une **prémutation** soit d'une **mutation complète**

---

## 5️⃣ III — Maladies Chromosomiques

### Types d'anomalies

| Type | Description | Conséquence pour le porteur |
| --- | --- | --- |
| **Aneuploïdie** (anomalie de nombre) | Ex : trisomie, monosomie | Souvent pathologique |
| **Anomalie équilibrée** | Matériel complet mais sur mauvais chromosome (pas de perte ni gain) | **Asymptomatique** mais risque pour la descendance |
| **Anomalie déséquilibrée** | Perte ou gain de matériel | Pathologique |

### Translocations équilibrées — 2 types

- **1. Translocation Robertsonienne :**
    - Fusion de **2 chromosomes acrocentriques** (sans bras courts fonctionnels)
    - Chromosomes concernés : **13, 14, 15, 21, 22**
    - Porteur = asymptomatique mais risque pour la descendance
- **2. Translocation Réciproque :**
    - Échange de matériel entre 2 chromosomes **non acrocentriques**
    - Suite à des cassures sur les bras chromosomiques
    - **Pas de perte ni de gain** de matériel → porteur asymptomatique

### Exemple — Trisomie 21

| Mécanisme | Fréquence | Type |
| --- | --- | --- |
| **Trisomie libre** | **95%** | Anomalie **déséquilibrée** — chromosome 21 surnuméraire |
| **Par translocation robertsonienne** | **5%** | Anomalie de structure — fusion avec un autre chromosome acrocentrique |

> ⚠️ Si trisomie 21 par translocation robertsonienne → chercher un parent porteur de la translocation équilibrée → risque de récurrence élevé pour la descendance
> 

---

## 6️⃣ IV — Diagnostic Prénatal (DPN) et Préimplantatoire (DPI)

### Cadre légal +++

> **« On ne peut proposer un DPN que pour des maladies d'une gravité particulière, incurables au moment du diagnostic »**
> 
- La loi est identique pour le fœtus et l'embryon
- But : détecter **in utero** chez l'embryon ou le fœtus une **affection grave**

### Les 2 Types de Prélèvements Fœtaux

| Prélèvement | Terme | Risque de FC | Conditions |
| --- | --- | --- | --- |
| **Biopsie de trophoblaste** (ponction de villosités choriales) | **12 SA** en moyenne | **1%** | Centre pluridisciplinaire de DPN, sous contrôle écho, 1er trimestre |
| **Amniocentèse** (ponction de liquide amniotique) | **16–20 SA** | **0,5%** | — |

### Diagnostic Direct vs Indirect

|  | **Diagnostic direct** | **Diagnostic indirect** |
| --- | --- | --- |
| Principe | Recherche directe de la **mutation responsable** chez le fœtus | Repérage des allèles morbides par étude de la **ségrégation de marqueurs polymorphiques** (microsatellites) |
| Résultat | Certain | **Probabiliste** |
| Aléas | — | Recombinaisons génétiques, contamination maternelle du prélèvement |

> ⚠️ **Toujours associer les deux** pour un diagnostic final complet
> 

### Diagnostic Indirect — Microsatellites +++

**Principe :**

- Marqueurs microsatellites = séquences répétées **(CA)n** flanquant le gène d'intérêt
- Marquées par fluorochrome → analyse par électrophorèse → pics de fluorescence → taille des fragments
- Étude de la **ségrégation des allèles** pour déduire le statut du fœtus

**Conditions nécessaires :**

- Famille **déjà atteinte** de la maladie (pour connaître les allèles à risque)
- **Prélèvement du cas index quasi-obligatoire**

**Limite majeure :**

> Plus la distance entre le microsatellite et le gène est grande, plus le risque de **recombinaison génétique** est important
Pour **5 mégabases** → **5% de risque de recombinaison** → diagnostic incertain
> 

**Exemple DPN Mucoviscidose :**

```
Diagnostic direct : identifier les variants pathogènes du gène CFTR chez le fœtus
Diagnostic indirect : étude des microsatellites autour de CFTR
Allèles porteurs (mutation) = marqués en rouge
Allèles sains = marqués en bleu
→ Déduction du statut du fœtus par combinaison des deux
```

### Cas Particuliers

**Variation de novo :**

- Malgré le faible risque de récurrence, on propose quand même un DPN
- Raison : risque de **mosaïque germinale** (variation dans les cellules germinales → risque de récurrence non nul)
- Impossible de distinguer mosaïque germinale de variation post-zygotique

**Signes d'appel échographiques :**

- Repérés le plus souvent au **2ème trimestre**
- Prélèvement = **amniocentèse** (majorité des cas)
- Diagnostic sur **FISH interphasique sur noyau** dans les **premières 48h**
- **Caryotype systématiquement en parallèle** (confirme le mécanisme non visible sur FISH)

### Interruption Médicale de Grossesse (IMG)

- Demandée par **les parents** (jamais imposée)
- Autorisée si **2 médecins membres d'une équipe pluridisciplinaire** attestent que :
    - La grossesse met en péril la **santé de la femme**
    - **Forte probabilité** que l'enfant soit atteint d'une **affection grave et incurable** au moment du diagnostic
- **Possible en France à tout âge et jusqu'au terme de la grossesse**

### Diagnostic Préimplantatoire (DPI)

**Principe :**

1. **FIV-ICSI** (fécondation in vitro par injection intra-cytoplasmique de spermatozoïde)
2. Étude de **1 cellule au stade 8 cellules** (avant implantation)
3. Réimplantation de **1 ou 2 embryons sains** chez la femme

**Centres agréés en France (5) :**

- Necker / Béclère (Paris)
- Strasbourg
- Montpellier
- Nantes
- Grenoble

> 🔑 Le **généticien** est chargé de l'ensemble des diagnostics réalisés chez les sujets **asymptomatiques**
> 

---

## 7️⃣ Tableau de Synthèse — Modes de Transmission

| Mode | Allèles nécessaires | Sexes touchés | Transmission père-fils | Exemples |
| --- | --- | --- | --- | --- |
| **Autosomique dominant** | 1 seul allèle muté suffit | H et F | Oui | BRCA1/2, Huntington, Lynch |
| **Autosomique récessif** | 2 allèles mutés | H et F | Oui | Mucoviscidose, hémophilie si carrier |
| **Lié à l'X récessif** | 1 allèle (garçon hémizygote) | Garçons surtout | **Non** | Hémophilie, X fragile |

---

## 8️⃣ Formules et Méthodes de Calcul +++

### Hardy-Weinberg

```
q² = incidence de la maladie dans la population
q = fréquence de l'allèle morbide
p ≈ 1 (pour les maladies rares)
Fréquence des hétérozygotes = 2pq ≈ 2q
```

### Risque d'un apparenté sain

```
Frère/sœur sain d'un malade (AR) = 2/3
(car sur les 3 enfants sains possibles sur 4, 2 sont hétérozygotes et 1 homozygote sain)
Parent d'un malade (AR) = 1/1 (obligatoirement hétérozygote)
Enfant d'un hétérozygote (AR) = 1/2
```

### Risque couple → enfant atteint

```
Risque = P(père hétérozygote) × P(mère hétérozygote) × 1/4
```

---

## 9️⃣ Points QCM / Pièges fréquents ⚡

- ✅ Cas index → prescrit par **n'importe quel médecin** / Apparenté → **uniquement généticien**
- ✅ Variant de **classe 3** = pas de responsabilité médicale
- ✅ **50% des reads mutés** = hétérozygote → AD / **100%** = homozygote → AR
- ✅ Variation de novo = séquençage des **2 parents** obligatoire
- ✅ Pénétrance = toujours exprimée **en fonction de l'âge**
- ✅ Hémizygote = garçon avec variation sur chromosome X (pas besoin d'explorer le père)
- ✅ **Mosaïque germinale** = variation dans cellules germinales → risque récurrence → DPN proposé même si variation de novo
- ✅ Transmission père → fils **impossible** dans les maladies liées à l'X
- ✅ Phénomène d'**anticipation** = maladie plus précoce/grave à chaque génération (mécanisme : expansion de répétitions)
- ✅ Passage prémutation → mutation complète (X fragile) = **uniquement par les femmes**
- ✅ **Pas de mutation de novo** dans le syndrome de l'X fragile
- ✅ Trisomie 21 **libre** = 95% / **par translocation robertsonienne** = 5%
- ✅ Translocation équilibrée = porteur **asymptomatique** mais risque pour la descendance
- ✅ Biopsie trophoblaste : **12 SA**, risque FC = **1%** / Amniocentèse : **16–20 SA**, risque = **0,5%**
- ✅ **FISH interphasique** dans les **48h** pour les signes d'appel écho + **caryotype systématique** en parallèle
- ✅ IMG possible **jusqu'au terme** de la grossesse en France
- ✅ IMG = demande des **parents** + attestation de **2 médecins** d'une équipe pluridisciplinaire
- ✅ DPI = **FIV-ICSI** + biopsie au stade **8 cellules** → **5 centres agréés** en France
- ✅ Diagnostic indirect = **probabiliste** (≠ direct = certain)
- ✅ Distance microsatellite/gène : **5 mégabases = 5% de risque de recombinaison**
- ✅ **Hétérozygote composite** = 2 variations **différentes** en trans sur les 2 allèles
- ✅ Huntington : triplets **CAG > 35** sur le **chromosome 4** (gène HTT) · pénétrance **100%**
- ✅ BRCA1 → mastectomie prophylactique **avant 40 ans** / BRCA2 → annexectomie **après 40–45 ans**

---

## Mémo Visuel — DPN vs DPI

```
DPN (Diagnostic Prénatal)
  ├── Biopsie trophoblaste → 12 SA → risque FC 1%
  ├── Amniocentèse        → 16-20 SA → risque FC 0,5%
  ├── Diagnostic DIRECT   → certain   (recherche de la mutation)
  └── Diagnostic INDIRECT → probabiliste (microsatellites)

DPI (Diagnostic Préimplantatoire)
  └── FIV-ICSI → biopsie 1 cellule stade 8 cellules
               → réimplantation 1-2 embryons sains
               → 5 centres en France
```

---