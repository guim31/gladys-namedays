# Fêtes des prénoms

Les fêtes des prénoms de douze pays d'Europe dans Gladys : les prénoms fêtés
aujourd'hui et demain, et un rappel le jour de la fête de votre famille et de
vos amis. Allemagne, Autriche, Pologne, Suède, Tchéquie, Slovaquie, Hongrie,
Danemark, Finlande, Estonie, Lettonie et Lituanie. Pour les fêtes du jour
françaises, voir l'intégration **Fête du jour**.

## Ce qu'il faut

Rien : les calendriers sont intégrés. Aucun compte, aucune connexion
internet, rien ne sort de chez vous.

## Configuration

### Pays

Cochez les calendriers à suivre (Allemagne par défaut). Chaque pays donne un
appareil, et les prénoms suivis sont cherchés dans tous.

### Prénoms suivis

Écrivez les prénoms de votre famille et de vos amis, séparés par des
virgules (20 au plus) : `Anna, Lukas, Zofia`. Majuscules et accents
indifférents (`zofia`, `Žofia`). Un prénom est aussi trouvé dans une entrée
composée (« Magdalena » dans « Maria Magdalena »). **Vérifier les prénoms
suivis** donne la prochaine fête de chacun, et les prénoms absents des
calendriers choisis.

### Langue

La langue des noms des appareils et des fonctionnalités, des dates et des
textes envoyés aux scènes (français par défaut). Gladys fixe les noms à
l'ajout d'un appareil : pour les renommer après un changement, supprimez puis
rajoutez l'appareil.

## Appareils

Après l'enregistrement, ajoutez les appareils dans l'onglet **Découverte** :

- **Fêtes des prénoms <pays>**, un par pays : **Aujourd'hui** et **Demain**,
  les prénoms fêtés (tels qu'écrits dans le calendrier du pays).
- **Fêtes des prénoms suivis**, si vous suivez des prénoms : **Fêtés
  aujourd'hui** (les prénoms suivis fêtés ce jour, ou « Personne ») et
  **Prochaine fête** (qui, quand, où : « Anna (Allemagne, Pologne) · lundi 26
  juillet 2027, demain »).

Les valeurs changent à minuit, dans le fuseau horaire de Gladys.

## Widget du tableau de bord

Le widget **Fêtes des prénoms** liste, par pays, les prénoms du jour et du
lendemain (le jour seul au-delà de cinq pays, dix lignes au plus ; une longue
liste est coupée sur un prénom entier), puis les prochaines fêtes des
prénoms suivis avec les jours restants. Ses réglages masquent le lendemain
ou les prénoms suivis, et fixent le nombre de prénoms suivis affichés (1 à 8).

## Déclencheurs de scène

- **Fête d'un prénom suivi** : se déclenche le jour de la fête de chaque
  prénom suivi, à l'heure choisie (8 h par défaut).
- **Veille de la fête d'un prénom suivi** : se déclenche la veille, à l'heure
  choisie (18 h par défaut) : le temps d'acheter des fleurs.

Les deux ont un filtre **Prénom** facultatif : un des prénoms suivis, écrit
comme dans la configuration ; vide, n'importe lequel. Un prénom fêté le même
jour dans deux pays ne déclenche qu'une fois. La scène peut reprendre le
prénom, les pays et la date dans ses messages.

## Actions de scène

- **Fêtes d'une date** : les prénoms fêtés dans un pays aujourd'hui, demain
  ou jusqu'à 366 jours plus tard, pour un message ; aussi les prénoms suivis
  fêtés ce jour-là et un oui/non (1 = oui, 0 = non) à tester avec une
  « Condition sur variables ».
- **Prochaine fête d'un prénom** : quand un prénom (ou une variable de scène)
  est fêté la prochaine fois dans les pays choisis : la date, la date en
  toutes lettres, les jours restants (-1 si le prénom n'est dans aucun
  calendrier) et les pays.

## Exemples de scènes

- « Fête d'un prénom suivi » à 8 h → envoyer un message : « C'est la fête de
  {prénom} aujourd'hui ({pays}) ».
- Chaque matin à 7 h 30 → « Fêtes d'une date » (Allemagne, 0 jour) → envoyer
  un message : « Aujourd'hui on fête {prénoms} ».

## Actions de l'écran Configuration

- **Chercher un prénom** : les jours où un prénom est fêté dans chaque pays
  choisi, et la prochaine fête.
- **Vérifier les prénoms suivis** : la prochaine fête de chaque prénom suivi,
  et les prénoms absents des calendriers.

## Dépannage

- Un prénom suivi n'est jamais fêté : lancez **Vérifier les prénoms suivis** ;
  l'orthographe peut différer du calendrier du pays (Jakob, Jakub), ou le
  prénom n'être fêté que dans un autre pays.
- La scène ne part pas : vérifiez l'heure du déclencheur, et que le filtre
  **Prénom** est écrit comme dans la configuration (ou vide).
- Les journaux de l'intégration montrent son démarrage et les actions
  lancées ; `LOG_LEVEL=debug` pour plus de détails.

## Limites

- Les calendriers viennent des données de nameday.abalin.net. Ils peuvent
  différer de votre calendrier certains jours ; les fêtes légales et les
  jours de saints qui y figurent sont écartés. Vos retours sont les bienvenus
  sur le forum ou sur GitHub.
- Les prénoms du 29 février ne sont fêtés que les années bissextiles.
- Croatie, Italie, Espagne, Grèce, Bulgarie et Russie ne sont pas proposées :
  leurs données y sont une liste de saints ou presque vides, et les fêtes
  grecques dépendent souvent de Pâques.

## Crédits

Données des fêtes : [nameday-api](https://github.com/xnekv03/nameday-api) de
xnekv03 (nameday.abalin.net), licence MIT.
