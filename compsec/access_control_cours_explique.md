# Computer Security and Privacy — Access Control
## Explication complète, pédagogique et structurée du cours

> Cours basé sur le PDF **“Computer Security and Privacy — Access Control”**, slides de Carmela Troncoso / SPRING Lab, avec ajouts de Thomas Bourgeat.

---

# 1. Qu’est-ce que l’Access Control ?

L’**access control (contrôle d’accès)** est un mécanisme de sécurité qui permet de s’assurer que les accès et les actions effectués par des **principals** sur des **objects** respectent une **security policy**.

### Exemple

On peut vouloir autoriser ou interdire :

- Alice à lire le fichier de Bob ;
- Bob à ouvrir un socket TCP ;
- Charlie à écrire dans une ligne particulière d’une base de données.

L’idée fondamentale est donc :

> **Qui peut faire quoi sur quoi ?**

On peut représenter une autorisation par le triplet :

\[
(subject,\ object,\ access\ right)
\]

Par exemple :

\[
(Alice,\ file1,\ read)
\]

signifie :

> Alice a le droit de lire `file1`.

---

# 2. Subject, Principal, Object et Access Right

Pour comprendre tout le cours, il faut maîtriser quatre notions.

## 2.1 Subject / Principal

Le **subject** est l’entité qui cherche à effectuer une action.

Cela peut être :

- un utilisateur ;
- un processus ;
- une machine ;
- etc.

Le terme **principal** désigne généralement une entité à laquelle on peut associer une identité et des permissions.

## 2.2 Object

L’**object** est la ressource sur laquelle l’action est effectuée.

Exemples :

- fichier ;
- dossier ;
- ligne d’une base de données ;
- socket ;
- imprimante ;
- registre, etc.

## 2.3 Operation / Access Right

C’est l’action autorisée ou interdite.

Exemples :

- `read`
- `write`
- `execute`
- `delete`
- `open`

## 2.4 Le triplet fondamental

On peut donc toujours se poser :

> **Quel principal veut effectuer quelle opération sur quel objet ?**

Exemple :

\[
(Alice,\ fileA,\ read)
\]

---

# 3. Authentication ≠ Authorization

Une distinction extrêmement importante du cours :

## Authentication

L’**authentication** répond à :

> **Qui es-tu ?**

Exemples :

- mot de passe ;
- certificat ;
- clé cryptographique ;
- etc.

## Authorization

L’**authorization** répond à :

> **As-tu le droit de faire cette action ?**

Exemple :

Alice s’authentifie correctement.

Cela ne signifie pas automatiquement qu’Alice peut :

- lire tous les fichiers ;
- modifier toutes les données ;
- devenir administratrice.

### À retenir

\[
Authentication = identité
\]

\[
Authorization = permissions
\]

---

# 4. Trusted Computing Base (TCB)

Le cours introduit également la notion de **Trusted Computing Base (TCB)**.

Le TCB correspond aux composants auxquels on doit faire confiance pour que la politique de sécurité soit correctement appliquée.

L’idée importante est que le mécanisme de contrôle d’accès doit être placé dans une partie suffisamment fiable du système.

---

# 5. Pourquoi éviter le “checks soup” ?

Une mauvaise approche serait de mettre des vérifications de sécurité un peu partout dans les programmes :

```text
if user == Alice:
    ...
if process == trusted:
    ...
if file == special:
    ...
```

Chaque programme pourrait avoir ses propres règles.

Cela devient rapidement :

- difficile à maintenir ;
- difficile à auditer ;
- difficile à raisonner ;
- sujet aux oublis.

Le cours propose donc une approche plus systématique :

> Les programmes demandent l’accès, et un mécanisme centralisé de contrôle vérifie si cet accès respecte la politique.

C’est l’idée du **reference monitor**.

---

# 6. Reference Monitor

Le **reference monitor** est le mécanisme chargé de contrôler les accès.

Conceptuellement :

```text
        Subject
           |
           | demande d'accès
           v
   +------------------+
   | Reference        |
   | Monitor          |
   +------------------+
           |
           | décision
           v
      Allow / Deny
           |
           v
         Object
```

Il reçoit une demande et vérifie la politique.

Par exemple :

```text
Alice -> READ -> file1
```

Le reference monitor détermine si cette opération est autorisée.

---

# 7. DAC vs MAC

Le cours distingue notamment deux grandes approches.

## 7.1 DAC — Discretionary Access Control

Dans le **DAC**, le propriétaire d'une ressource peut généralement déterminer qui y a accès.

L’idée centrale est :

> **Le propriétaire de l’objet contrôle les permissions.**

Exemple :

Alice possède `file1`.

Elle peut décider que Bob peut le lire.

```text
Alice owns file1

Bob -> READ file1
```

## 7.2 MAC — Mandatory Access Control

Dans le **MAC**, les règles sont imposées par une politique centrale.

Le propriétaire ne peut pas simplement modifier librement les règles.

L’idée centrale est donc :

> **La politique centrale contrôle les accès.**

### À retenir

| DAC | MAC |
|---|---|
| Contrôle associé au propriétaire | Politique centrale |
| Plus discrétionnaire | Plus imposé |
| Le propriétaire peut attribuer des droits | Les règles sont imposées par la politique |

---

# 8. Access Control Matrix

Le cours introduit ensuite l’**Access Control Matrix**.

C’est une représentation conceptuelle du contrôle d’accès.

On place :

- les **subjects** en lignes ;
- les **objects** en colonnes ;
- les permissions dans les cellules.

Exemple :

| | file1 | file2 | printer |
|---|---|---|---|
| Alice | read, write | read | print |
| Bob | read | — | print |
| Charlie | — | read, write | — |

On peut lire :

```text
Alice -> file1 -> read/write
Bob -> file1 -> read
Charlie -> file2 -> read/write
```

---

# 9. Pourquoi ne pas implémenter directement la matrice ?

En théorie, la matrice est simple.

En pratique, elle peut devenir énorme.

Si on a :

- beaucoup de sujets ;
- beaucoup d’objets ;

la matrice contient potentiellement énormément de cellules.

De plus, elle est souvent **très sparse** :

> La majorité des combinaisons subject/object n'ont aucune permission.

Stocker toutes les cellules serait donc inefficace.

Le cours présente alors différentes manières d’implémenter cette matrice.

---

# 10. ACL — Access Control List

Une **ACL** associe les permissions à l’**objet**.

Au lieu de demander :

> Quels objets peut utiliser Alice ?

on demande :

> Qui peut accéder à cet objet ?

Exemple :

```text
file1:
    Alice -> read
    Bob   -> read, write
    Charlie -> read
```

L’ACL de `file1` contient donc les permissions associées aux différents sujets.

---

# 11. Avantages et limites des ACL

## Avantage principal

Les permissions sont faciles à consulter lorsqu’on connaît l’objet.

Exemple :

> Qui peut accéder à `file1` ?

On regarde directement l’ACL de `file1`.

## Limites

Il peut être moins pratique de répondre à :

> À quels fichiers Alice a-t-elle accès ?

Il faut potentiellement consulter de nombreuses ACL.

Le cours souligne aussi que les permissions inexistantes n’ont pas besoin d’être stockées explicitement.

---

# 12. RBAC — Role-Based Access Control

Avec le **RBAC**, les permissions sont associées à des **roles**.

On a alors :

```text
Subject -> Role -> Permissions
```

Exemple :

```text
Alice -> Manager
Bob   -> Developer
```

Et :

```text
Manager:
    read
    write
    approve

Developer:
    read
    write
```

Alice obtient les permissions du rôle `Manager`.

---

# 13. Active Role

Le cours mentionne également la notion de **role actif**.

Un utilisateur peut posséder plusieurs rôles, mais n’en activer qu’un sous-ensemble.

Cela permet de limiter les permissions disponibles pendant une opération donnée.

---

# 14. Problèmes du RBAC

Le cours présente plusieurs difficultés.

## 14.1 Role explosion

Si on crée un rôle pour chaque combinaison possible de permissions, on peut finir avec énormément de rôles.

C’est le problème du **role explosion**.

## 14.2 Limited expressiveness

Les rôles peuvent devenir trop rigides pour exprimer certaines politiques fines.

## 14.3 Least privilege

Il peut être difficile de donner exactement les permissions minimales nécessaires.

## 14.4 Relative roles

Certains droits peuvent dépendre du contexte ou de la relation entre les entités.

## 14.5 Separation of Duty

Certaines opérations doivent nécessiter plusieurs personnes ou rôles différents.

Exemple conceptuel :

```text
Person A -> prépare une transaction
Person B -> l'approuve
```

L’objectif est d’éviter qu’une seule personne puisse effectuer toutes les étapes sensibles.

---

# 15. Group-Based Access Control

Le cours présente également le contrôle d’accès basé sur les **groupes**.

Le principe est :

```text
Subject -> Group
Group -> Permissions
```

Exemple :

```text
Developers:
    READ project
    WRITE project
```

Si Alice appartient au groupe `Developers`, elle obtient ces permissions.

---

# 16. Plusieurs groupes

Un sujet peut appartenir à plusieurs groupes.

Exemple :

```text
Alice -> Developers
Alice -> Managers
Alice -> Auditors
```

Elle obtient les permissions provenant de ces différents groupes.

---

# 17. Negative Permissions

Le cours introduit les **negative permissions**.

Une permission négative est une règle explicite qui interdit une permission précise.

Exemple :

```text
Employees -> READ file1
Bob       -> DENY READ file1
```

Bob appartient au groupe `Employees`, donc il hériterait normalement du droit de lecture.

Mais une permission négative peut spécifiquement lui interdire cette lecture.

---

# 18. Negative Permission vs Blacklist

Il ne faut pas confondre les deux.

## Negative permission

Une **negative permission** signifie :

> Cette personne n’a pas le droit d’effectuer cette action précise sur cet objet précis.

Exemple :

```text
Bob -> DENY READ file1
```

## Blacklist

Une **blacklist** est plutôt une liste générale d’entités exclues.

Elle répond principalement à :

> Qui est exclu ?

Alors qu’une negative permission répond à :

> Quelle action précise est interdite à quel principal sur quel objet ?

### Résumé

```text
Blacklist
    -> liste d'entités exclues

Negative permission
    -> interdiction précise d'une permission
```

---

# 19. Capabilities

Une autre manière d’implémenter l’Access Control Matrix est d’utiliser des **capabilities**.

Avec une ACL, les permissions sont associées aux objets.

Avec une capability, les permissions sont associées au **sujet**.

On peut donc voir :

```text
ACL:
Object -> qui peut l'utiliser ?

Capability:
Subject -> quels objets peut-il utiliser ?
```

Exemple :

```text
Alice:
    capability(file1, read)
    capability(file2, write)
```

Alice possède alors des capacités lui donnant certains droits.

---

# 20. Avantages des capabilities

Les capabilities présentent notamment des propriétés intéressantes pour :

- la portabilité ;
- la délégation ;
- certains modèles de contrôle décentralisés.

Une capability peut être transmise à une autre entité.

Exemple conceptuel :

```text
Alice
   |
   | délègue capability
   v
Bob
```

Bob peut alors utiliser la capability selon les droits qu’elle contient.

---

# 21. Difficulté : la révocation

Une difficulté importante des capabilities est la **revocation**.

Si Alice a donné à Bob une capability, comment retirer ensuite ce droit ?

Avec une ACL, il peut être plus direct de modifier la permission sur l’objet.

Avec une capability déjà distribuée, il faut gérer la révocation de cette capacité.

---

# 22. Transferability et Authenticity

Les capabilities soulèvent également des questions concernant :

- leur transfert ;
- leur authenticité ;
- leur possession ;
- leur contrôle.

Si une capability peut être transférée, il faut réfléchir à :

> Qui peut la transmettre ?

> Qui peut l’utiliser ?

> Comment vérifier qu’elle est authentique ?

---

# 23. Ambient Authority

Le cours introduit ensuite la notion d’**ambient authority**.

Une autorité est dite “ambient” lorsqu’elle est implicitement disponible dans le contexte d’exécution plutôt que représentée explicitement comme une capability.

Exemple :

```text
open("file1", "rw")
```

Le programme demande simplement l’ouverture de `file1`.

L’autorité utilisée pour accéder au fichier vient implicitement du contexte du processus.

---

# 24. Pourquoi l’ambient authority peut poser problème ?

Elle est pratique, mais peut rendre le **least privilege** plus difficile.

Le programme peut disposer d’un ensemble d’autorisations plus large que ce qui est réellement nécessaire.

Cela mène à un risque important :

> **Confused deputy**

---

# 25. Confused Deputy

Le **confused deputy** est un problème dans lequel un programme disposant d’une certaine autorité est trompé ou amené à utiliser cette autorité au bénéfice d’un autre acteur.

L’exemple du cours utilise un compilateur avec un système de paiement.

Imaginons :

```text
Alice
  |
  | utilise
  v
Compiler
```

Le compilateur possède des privilèges supplémentaires.

Il manipule notamment :

```text
input
output
bill
```

Alice veut compiler un programme.

Normalement :

```text
input = fichier source d'Alice
output = fichier de sortie d'Alice
bill = compte d'Alice
```

Mais Alice peut essayer de fournir :

```text
output = bill
```

Le compilateur, qui possède les droits nécessaires, peut alors écrire dans le fichier de facturation.

Le problème est que le compilateur utilise **sa propre autorité** alors que l’opération a été demandée par Alice.

---

# 26. Pourquoi c’est dangereux ?

Le programme privilégié devient une sorte d’intermédiaire trompé.

Il possède des droits qu’Alice n’a pas nécessairement.

Schématiquement :

```text
Alice
  |
  | demande une opération
  v
Programme privilégié
  |
  | utilise ses propres privilèges
  v
Ressource sensible
```

Le programme peut donc devenir un **deputy** confus.

---

# 27. Solutions au Confused Deputy

Le cours présente plusieurs pistes.

## Solution 1 — Refaire les vérifications

Le programme peut effectuer des vérifications supplémentaires pour s’assurer que la requête est légitime.

## Solution 2 — Vérification par le processus privilégié

Le processus privilégié peut vérifier que l’utilisateur à l’origine de la requête est autorisé à effectuer l’action.

## Solution 3 — Capabilities

Les capabilities permettent de transmettre explicitement l’autorité nécessaire.

Au lieu de laisser le programme utiliser implicitement toute son autorité, on lui donne explicitement les capacités nécessaires.

---

# 28. Résumé conceptuel de cette partie

Le cours fait notamment le lien suivant :

```text
Access Control Matrix
        |
        +-------------------+
        |                   |
       ACL            Capabilities
        |                   |
   permissions          permissions
   sur objets            sur sujets
```

Et il faut toujours garder à l’esprit le problème du :

> **Confused deputy**

---

# 29. Unix : modèle d’accès

Le cours passe ensuite au modèle Unix.

Unix utilise notamment :

- des **UID** pour identifier les utilisateurs ;
- des **GID** pour identifier les groupes.

Les informations sur les utilisateurs sont notamment associées au système de comptes.

---

# 30. “Everything is a file”

Une idée fondamentale du modèle Unix est :

> **Everything is a file.**

De nombreuses ressources sont donc manipulées avec une abstraction proche du fichier.

Les objets possèdent notamment :

- un propriétaire ;
- un groupe ;
- des permissions.

---

# 31. Les 9 bits de permissions Unix

Un fichier ou dossier possède classiquement neuf bits de permission :

```text
rwx rwx rwx
```

Ils sont répartis en trois catégories :

```text
owner | group | other
```

Donc :

```text
rwx | rwx | rwx
```

---

# 32. Signification de r, w et x

## Pour un fichier

### `r` — read

Permet de lire le contenu.

### `w` — write

Permet de modifier le contenu.

### `x` — execute

Permet d’exécuter le fichier comme programme.

---

# 33. Très important : x sur un dossier

Pour un **directory**, la signification de `x` est différente.

Le `x` permet notamment de **traverser** le répertoire.

C’est une distinction essentielle.

Pour un dossier :

- `r` permet de lire la liste des entrées ;
- `w` permet de modifier certaines entrées ;
- `x` permet de traverser le répertoire.

Donc :

> `x` sur un fichier ≠ `x` sur un dossier.

---

# 34. Exemple de permissions

Prenons :

```text
-rwxr-x---
```

On découpe :

```text
rwx | r-x | ---
```

Donc :

- owner : `rwx`
- group : `r-x`
- other : aucun droit

---

# 35. chmod

La commande `chmod` permet de modifier les permissions.

Exemple conceptuel :

```bash
chmod ...
```

L’objectif est de modifier les bits correspondant au propriétaire, au groupe ou aux autres utilisateurs.

---

# 36. Ordre de vérification Unix

Pour déterminer les permissions d’un utilisateur, il faut faire attention à la catégorie applicable :

1. owner ;
2. group ;
3. other.

Ce n’est pas :

```text
owner + group + other
```

en cumulant tous les droits.

La catégorie correspondant au propriétaire est considérée en premier.

---

# 37. Root

Le compte **root** correspond à l’utilisateur privilégié, traditionnellement associé à :

```text
UID = 0
```

Root possède des privilèges très importants.

Cela explique pourquoi les programmes exécutés avec des privilèges root doivent être traités avec beaucoup de précautions.

---

# 38. sudo et su

Unix fournit notamment des mécanismes tels que :

```text
sudo
su
```

Ils permettent d’effectuer certaines opérations avec une autre identité ou des privilèges supplémentaires, selon la configuration du système.

L’objectif est de pouvoir effectuer des opérations administratives sans donner en permanence tous les privilèges à chaque processus.

---

# 39. SUID et SGID

Unix possède également les mécanismes :

- **SUID**
- **SGID**

Ils permettent notamment à un programme de s’exécuter avec une identité ou des privilèges associés au propriétaire/groupe du fichier selon les règles du système.

Le cas particulièrement sensible est :

```text
SUID root
```

Un programme SUID root peut effectuer des opérations avec des privilèges très élevés.

Il devient donc une partie importante du **TCB**.

---

# 40. Pourquoi les programmes SUID root sont dangereux ?

Si un programme SUID root contient une vulnérabilité, un attaquant peut potentiellement exploiter cette vulnérabilité pour obtenir des privilèges élevés.

Donc :

> Plus un programme possède de privilèges, plus son comportement doit être soigneusement contrôlé.

C’est une application directe du principe de **least privilege**.

---

# 41. Sticky Bit

Le cours présente également le **sticky bit**.

Il est notamment utilisé sur des répertoires partagés comme :

```text
/tmp
```

L’idée est d’empêcher un utilisateur de supprimer arbitrairement les fichiers d’un autre utilisateur dans certains contextes.

Le sticky bit ajoute donc une contrainte particulière sur la suppression/gestion des entrées d’un répertoire.

---

# 42. “Nobody”

Le cours mentionne également un utilisateur spécial appelé **nobody**, avec un identifiant particulier dans le contexte présenté.

L’objectif est notamment de pouvoir exécuter du code non fiable avec une identité qui possède très peu de privilèges.

L’idée générale est :

> Utiliser une identité très peu privilégiée pour réduire les conséquences d’un code compromis.

---

# 43. Exercice Linux : /project_beta

Le cours donne un exercice avec :

```text
/project_beta
```

et des permissions :

```text
drwxr-x---
```

Le propriétaire est :

```text
manager_A
```

et le groupe :

```text
core_devs
```

---

# 44. manager_A

`manager_A` est le propriétaire.

Il possède :

```text
rwx
```

Donc il peut notamment :

- entrer dans le dossier (`x`) ;
- lire son contenu (`r`) ;
- modifier les entrées (`w`).

Ainsi, il peut :

- faire `cd` ;
- faire `ls` ;
- créer un fichier avec `touch`, sous réserve des conditions du système.

---

# 45. developer_B

`developer_B` appartient au groupe `core_devs`.

Le groupe possède :

```text
r-x
```

Donc `developer_B` peut :

- traverser le dossier ;
- lire la liste des entrées.

Mais il ne possède pas :

```text
w
```

sur le dossier.

Donc il ne peut pas créer/modifier/supprimer librement des entrées dans ce répertoire.

---

# 46. intern_C

`intern_C` n’est ni :

- le propriétaire ;
- ni dans le groupe concerné.

Il tombe donc dans :

```text
other
```

qui possède :

```text
---
```

Il ne peut donc pas accéder au dossier.

---

# 47. Deuxième exercice : fichier de intern_C

Le cours présente ensuite un fichier :

```text
intern_project.txt
```

appartenant à `developer_B`.

Même si le fichier existe, `intern_C` ne peut pas simplement y accéder par son chemin complet si `intern_C` ne peut pas traverser `/project_beta`.

C’est un point extrêmement important :

> Connaître le chemin d’un fichier ne signifie pas qu’on a le droit d’y accéder.

Le droit de traversée des répertoires est indispensable.

---

# 48. cd vs cat

Deux opérations peuvent échouer pour des raisons différentes.

### `cd /project_beta`

Nécessite notamment le droit `x` sur le répertoire.

### `cat /project_beta/intern_project.txt`

Nécessite notamment de pouvoir traverser les répertoires du chemin.

Donc si `intern_C` n’a pas le droit `x` sur `/project_beta`, l’accès au fichier par ce chemin échoue déjà à ce niveau.

---

# 49. Windows : modèle de contrôle d’accès

Le cours présente ensuite Windows.

Les principaux éléments sont :

### Principals

- utilisateurs ;
- machines ;
- groupes.

### Objects

- fichiers ;
- registre ;
- imprimantes ;
- etc.

---

# 50. Access Token

Sous Windows, un processus/thread possède un **access token**.

Il contient notamment des informations liées à :

- l’utilisateur ;
- les groupes ;
- les privilèges.

On peut donc schématiquement avoir :

```text
Process
   |
   v
Access Token
   |
   +-- User
   +-- Groups
   +-- Privileges
```

---

# 51. DACL

Les objets Windows possèdent une **DACL**.

DACL signifie :

> **Discretionary Access Control List**

Elle décrit les règles d’accès associées à l’objet.

Le système compare les informations du token avec les règles de la DACL lors d’une demande d’accès.

---

# 52. ACE

Une DACL contient des **ACEs** :

> **Access Control Entries**

Une ACE peut notamment contenir :

- un principal ;
- des permissions ;
- des informations d’autorisation ou de refus ;
- des flags.

Cela permet un contrôle plus fin que le simple modèle Unix `rwx`.

---

# 53. Permissions positives et négatives sous Windows

Les ACE peuvent exprimer :

- des autorisations ;
- des refus.

On retrouve donc l’idée déjà vue avec les permissions négatives :

```text
ALLOW
DENY
```

Le système peut gérer des permissions plus fines sur les objets.

---

# 54. Least Privilege

Une idée centrale du cours est le principe de :

> **Least Privilege**

Cela signifie :

> Donner à un sujet uniquement les privilèges dont il a besoin pour accomplir sa tâche.

Exemple :

Si un programme doit seulement lire un fichier, il n’a pas besoin de pouvoir :

```text
write
delete
execute
```

---

# 55. Pourquoi le Least Privilege est important ?

Supposons qu’un programme possède beaucoup de privilèges et qu’il soit compromis.

Les privilèges du programme peuvent alors être exploités.

À l’inverse, si le programme possède uniquement :

```text
read file1
```

les conséquences potentielles sont plus limitées.

Donc :

```text
moins de privilèges
        ↓
surface d'abus plus faible
        ↓
impact potentiel réduit
```

---

# 56. Carte mentale globale

Voici une manière de résumer tout le cours :

```text
                         ACCESS CONTROL
                               |
             +-----------------+-----------------+
             |                 |                 |
            DAC               MAC          Authentication
             |                 |                 |
       propriétaire       politique          identité
             |
      Access Control Matrix
             |
      +------+----------------+
      |                       |
     ACL                Capabilities
      |                       |
 permissions              permissions
 sur objets                sur sujets
      |
   Groupes / RBAC
      |
 Negative permissions
      |
 Ambient Authority
      |
 Confused Deputy
      |
 +----+---------+
 |              |
Unix          Windows
 |              |
UID/GID       Tokens
rwx           DACL
SUID/SGID     ACE
Sticky bit    Privileges
```

---

# 57. Les distinctions à absolument connaître pour l’examen

## Authentication vs Authorization

```text
Authentication = Qui es-tu ?
Authorization  = As-tu le droit ?
```

---

## ACL vs Capability

```text
ACL:
Object -> permissions / sujets

Capability:
Subject -> permissions / objets
```

Question mentale :

> Est-ce que je pars de l’objet ou du sujet ?

---

## DAC vs MAC

```text
DAC:
Le propriétaire peut déterminer les accès.

MAC:
Une politique centrale impose les accès.
```

---

## Groupe vs Other sous Unix

Si un utilisateur appartient au groupe du fichier, il faut considérer la catégorie **group** plutôt que d’ajouter les permissions de `other`.

---

## `x` sur un fichier vs `x` sur un dossier

```text
Fichier:
x = exécution

Dossier:
x = traversée
```

C’est une distinction particulièrement importante.

---

## Permission négative vs Blacklist

```text
Negative permission:
DENY une action précise sur un objet.

Blacklist:
liste générale d'entités exclues.
```

---

## Connaître un chemin vs avoir accès

```text
Connaître :
/project_beta/intern_project.txt

≠

Pouvoir traverser :
/project_beta
```

Il faut les permissions nécessaires sur les répertoires du chemin.

---

# 58. La logique générale à appliquer à un exercice

Lorsqu’on vous donne un exercice d’Access Control, utilisez toujours cette méthode.

## Étape 1 — Identifier le subject

Qui essaie de faire l’action ?

```text
Alice ?
Bob ?
Un processus ?
```

## Étape 2 — Identifier l’objet

Sur quoi porte l’action ?

```text
file1 ?
directory ?
database ?
socket ?
```

## Étape 3 — Identifier l’opération

Que veut faire le sujet ?

```text
read ?
write ?
execute ?
delete ?
```

## Étape 4 — Identifier la politique

Quelle règle contrôle cet accès ?

```text
ACL ?
RBAC ?
group ?
capability ?
Unix permissions ?
Windows DACL ?
```

## Étape 5 — Appliquer les permissions

Déterminer précisément les permissions disponibles.

## Étape 6 — Chercher les exceptions

Attention notamment à :

- negative permissions ;
- deny ;
- groupes multiples ;
- privilèges ;
- SUID/SGID ;
- permissions sur les répertoires parents.

## Étape 7 — Décider

On obtient :

```text
ALLOW
```

ou :

```text
DENY
```

---

# 59. Exemple de raisonnement complet

Supposons :

```text
/project_beta
owner = manager_A
group = core_devs
permissions = rwxr-x---
```

Question :

> `developer_B` peut-il créer `new.txt` dans `/project_beta` ?

### Étape 1

Subject :

```text
developer_B
```

### Étape 2

Object :

```text
/project_beta
```

### Étape 3

Opération :

```text
create new.txt
```

### Étape 4

`developer_B` appartient au groupe `core_devs`.

On utilise donc :

```text
group permissions
```

### Étape 5

Le groupe possède :

```text
r-x
```

Il manque :

```text
w
```

### Conclusion

La création du fichier n’est pas autorisée.

---

# 60. Autre exemple : accès à un fichier

Supposons :

```text
/project_beta/intern_project.txt
```

et que `intern_C` n’a aucun droit sur `/project_beta`.

Même si le fichier lui-même était lisible :

```text
-r--r--r--
```

`intern_C` ne peut pas nécessairement y accéder via ce chemin.

Pourquoi ?

Parce qu’il doit d’abord pouvoir traverser :

```text
/project_beta
```

Donc :

```text
permissions du fichier
+
permissions des répertoires du chemin
```

sont toutes deux importantes.

---

# 61. L’idée la plus importante du cours

Le contrôle d’accès peut être résumé par une question extrêmement simple :

> **Who can do what on which object?**

Ou en français :

> **Qui peut faire quoi sur quel objet ?**

Toute la matière revient finalement à représenter et à appliquer cette relation.

---

# 62. Résumé final

Le cours construit progressivement une vision du contrôle d’accès :

1. On identifie les **subjects/principals**.
2. On identifie les **objects**.
3. On identifie les **access rights**.
4. On définit une **security policy**.
5. Un mécanisme de contrôle décide :
   ```text
   ALLOW / DENY
   ```
6. La politique peut être représentée conceptuellement par une **Access Control Matrix**.
7. Cette matrice peut être implémentée notamment avec :
   - des **ACLs** ;
   - des **capabilities** ;
   - des **groups** ;
   - des **roles**.
8. Il faut prendre en compte :
   - le **least privilege** ;
   - les **negative permissions** ;
   - l’**ambient authority** ;
   - le **confused deputy**.
9. Unix implémente un modèle basé notamment sur :
   - UID ;
   - GID ;
   - owner/group/other ;
   - `rwx` ;
   - SUID ;
   - SGID ;
   - sticky bit.
10. Windows utilise notamment :
   - access tokens ;
   - DACLs ;
   - ACEs ;
   - groups ;
   - privileges.

---

# 63. Les 10 points à retenir absolument

Si vous devez retenir seulement dix choses :

1. **Authentication ≠ Authorization.**
2. **Access control = qui peut faire quoi sur quel objet.**
3. **Reference monitor = mécanisme qui décide si l’accès est autorisé.**
4. **DAC = contrôle discrétionnaire ; MAC = politique imposée.**
5. **Access Control Matrix = représentation conceptuelle.**
6. **ACL = permissions vues depuis l’objet.**
7. **Capability = permissions vues depuis le sujet.**
8. **Least privilege = seulement les droits nécessaires.**
9. **Confused deputy = un programme privilégié utilise son autorité de manière indue pour une requête d’un autre acteur.**
10. **Sous Unix, `x` sur un dossier signifie notamment la traversée, pas l’exécution.**
