# Rapport project – planification des soutenance de stage

## Partie 1 :besoin du client

1. Le premier message du client (Nadia) qui a un probleme a faire la planification des soutenece , a l instant elle est entrain de le faire a main et veut qu on trouve une solution . du coup on a proposer des solutions . apres negotiation avec Nadia on est arriver a ces idees:

- L appli verifie les regles
- La prioriter est sur les contrainte des enseignants
- L indisponibiliter des enseignant est sur demi journee et on a introduit la regle des 6 par jour
- Le placement manuel avec verification
- Pas de compte tuteur just un texte d email a copier
- L eleve voit uniquement sont crenaux

1. Les chiffre qu on a guarder

- 100 eleves , 35 enseignats , chacun tuteur de 2-4 eleve, (en testant si on peut introduire un eleves ou enseignats ouentreprise le chffre a changer c etais pour voir si l ajout est possible )
- 5 jours, 4 salles, et 2 salles fermées le jeudi après-midi
- 8h30–17h30, pause de 12h30 à 13h30, soutenances de 40 min sans pause
- « Le lien de visio est le même pour chaque salle » → donc on a stocker le lien directement sur la salle

## Partie 2 les 3 fonctionnalites

1. Tableau fonctionnalite

|  | Cadrage | Ce qu on a construit et pourquoi |
| --- | --- | --- |
| F1 | Disponibilite tuteur cera un compt ou un lien | Chaque enseignant coche par demi journee sont indispo |
| F2 | L appilication place t elle chaque soutenece | Nadia place chaque soutenece de facon manuelle . les 9 regles qu on a introduit sont verifie directement et chaque soutenance peut etre modifier ou supprimer |
| F3 | Le tuteur voit ses passage avec le lien | L eleve et l enseignant ont chacun sa page . pour le tuteur , nadia a un texte prêt a envoyer par copier coller dans un e-mail |

1. Ce que on a coppe :

- Les preference de chaque enseignant . on garde uniquement pas libre donc pas de preference
- Pas de droits par filiere . une personne gere tout
- Lien avec outlook ou google agenda qui aurait etais utile mais pas necessaire pour son probleme actuel
- Proposition automatique des crenaux libre (L'appli vérifie ce que Nadia choisit)
- Espace tuteur entreprise . il a etais remplacer par un texte a copier
- on n'en a pas fait une règle, juste une indication, parce que Nadia a dit que ce n'était pas obligatoire
- on peut uniquement supprimer une soutenance
- pas de changement de mot de passe , Nadia cree elle-même les mot de passe , pour l avenir on peut introduire cette fonctionalite

## **Partie 3 : Journal de decisions**

|  | Ce que on a choisi | Ecarter | Pourquoi |
| --- | --- | --- | --- |
| 1 | Placement manuel avec verification | Placement automatique | C est elle qui veut place chaque soutenence |
| 2 | Pour les regle 2 et 5 on envoit un avertissemnt les autre bloque | Tout bloquer | Une salle prise, c'est impossible. Mais une indispo à la demi-journée ou une 7e soutenance , c ets un choix humain |
| 3 | Verification en direct | Verifier seulemnt quand elle enregistre | Nadia veut etre prevenue au cas ou elle se trompe |
| 4 | Tuteur entreprise a un nom et mail et un texte a copier | un compte perso ou lien perso a chacun | Nadia nous a indiquer ni compte ni lien |
| 5 | Indispo par demi journee | On voulait metter une indispo par crenaux de 40 min | Personne ne sait si sint indispo est a 40 min pres |
| 6 | La règle de la même entreprise est vérifiée même si l'autre élève est pas encore placé | Verifier seulement entre les soutenance déjà placer | La règle parle de qui est dans le jury, pas de l'heure |
| 7 | Le regroupement des tuteurs est une indication | Faire une regle qui bloque | Pas obligatoir |
| 8 | Les crenaux sont generes en base (12 par jour ) | les calculer dans le code | Les horaires sont fixe et donné par Nadia ; en plus la base interdit deux soutenances dans la même salle au même créneau |

## Partie 4 :une proposition de l ia qu on a ecarter :

En developpant l aplis l ia nous a recommender de passer a postgreSQL avec un conteneur : « PostgreSQL container (+ @prisma/adapter-pg, real DB healthcheck) ».

On a refuser cette idee car on sait qu une seule personne utilise l appli (nadia gere tout elle-même ). Donc sqlite suffit pour cette charge et ajouter postgre ajoutera uniquement la complexiter pour rien .

## Conclusion :

Si on avait suivi notre cadrage personelle du debut on aurais fait une appli qui place les soutenance de facon automatique , alors que le probleme de Nadia etais de s assurer de pas se tromper . D coup ses reponses a nos question on changer nos fonctionnalite et la perspective duproject . Au final on est arriver a une appli plus simple et repond au besoin du client