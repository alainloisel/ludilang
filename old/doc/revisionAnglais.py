import random

# --- 1. DONNÉES DU CAHIER DE COURS ---

# Les 10 stratégies de révision (basées sur le document)
STRATEGIES = {
    1: "Flashcards Vocabulaire (Matières & Lieux)",
    2: "Décrire un lieu (There is / There are)",
    3: "Raconter Amelia (Goûts - She likes/hates)",
    4: "Parler de Tes Goûts (I like/hate)",
    5: "Les Quantifieurs (some, many, a lot of)",
    6: "Règles de l'école (Must / Can)",
    7: "Auto-correction (Refaire les exercices du cahier)",
    8: "Analyser le Test (Question/Réponse Amelia)",
    9: "Pratiquer la Prononciation (-ing / voyelles)",
    10: "Le Grand Défi (Paragraphe de synthèse)",
}

# 10 Prompts pour chaque stratégie, utilisant uniquement le vocabulaire du cours
PROMPTS = {
    # 1: Flashcards Vocabulaire (Matières & Lieux)
    1: [
        [cite_start]"Trouve l'équivalent anglais de 'Éducation physique' et 'Éducation religieuse'. [cite: 1, 2, 248, 247]",
        [cite_start]"Cite 3 matières scientifiques présentes dans ton cours (en anglais). [cite: 246]",
        "Comment dit-on 'Technologie' dans le contexte des matières scolaires ? (deux options sont dans ton cours)[cite_start]. [cite: 246]",
        [cite_start]"Comment appelle-t-on le 'camarade de chambre' et le 'colocataire' ? [cite: 107]",
        [cite_start]"Nomme deux types de langues étrangères étudiées. [cite: 245]",
        [cite_start]"Quelle est la traduction de 'salle de spectacle' ? [cite: 11]",
        [cite_start]"Quels sont les deux sports mentionnés qu'Amelia aime/n'aime pas ? [cite: 95, 96, 151, 152]",
        [cite_start]"Comment dit-on 'nourriture' dans le contexte des matières scolaires ? [cite: 246]",
        [cite_start]"Cite 3 installations (facilities) de l'école. [cite: 11, 12, 14, 100]",
        [cite_start]"Que signifie l'abréviation 'IT' ? [cite: 2]",
    ],
    # 2: Décrire un lieu (There is / There are)
    2: [
        [cite_start]"Fais une phrase pour dire qu'il y a un gymnase. [cite: 55]",
        [cite_start]"Fais une phrase pour dire qu'il y a deux terrains de jeux (playgrounds). [cite: 56]",
        [cite_start]"Fais une phrase pour dire qu'il y a deux salles informatiques (IT rooms). [cite: 63, 64]",
        [cite_start]"Fais une phrase pour dire qu'il n'y a pas de casiers (lockers) dans les couloirs. [cite: 235]",
        [cite_start]"Pose une question pour savoir s'il y a une bibliothèque. [cite: 233]",
        [cite_start]"Complète : There ... one canteen. [cite: 67, 65]",
        [cite_start]"Complète : There ... two gyms and one theatre. [cite: 68, 69]",
        [cite_start]"Dis qu'il y a des élèves dans la cantine maintenant. [cite: 241]",
        [cite_start]"Dis qu'il n'y a pas d'élèves dans la piscine. [cite: 242]",
        [cite_start]"Rappelle la règle : devant un nom singulier on utilise 'There ...' [cite: 58-60]",
    ],
    # 3: Raconter Amelia (Goûts - She likes/hates)
    3: [
        "Qu'est-ce qu'Amelia aime par-dessus tout ('loves') ? [cite_start]Fais une phrase complète. [cite: 88, 150]",
        [cite_start]"Qu'est-ce qu'Amelia n'aime pas ('doesn't like') ? [cite: 152]",
        [cite_start]"Qu'est-ce qu'elle déteste ('hates') ? [cite: 153]",
        [cite_start]"Fais une phrase pour dire qu'elle aime le hockey. [cite: 151]",
        "Pourquoi Amelia aime-t-elle les sciences ? (Fais une phrase avec 'Because')[cite_start]. [cite: 88]",
        [cite_start]"Complète la phrase : She **enjoys** her classes very much **because** she can't ... [cite: 89, 93]",
        [cite_start]"Quelle est son activité extrascolaire qu'elle veut faire ? [cite: 94, 95]",
        [cite_start]"Fais une phrase avec la forme interrogative 'Does she like French?' et réponds par la négative (non-formel). [cite: 168]",
        [cite_start]"Rappelle-toi : quel est le verbe qu'on ajoute après 'She' avec 'like' ? [cite: 159]",
        [cite_start]"Fais une phrase pour dire qu'elle trouve que la Year 8 est différente de l'école primaire. [cite: 86, 87]",
    ],
    # 4: Parler de Tes Goûts (I like/hate)
    4: [
        [cite_start]"Fais une phrase pour dire que tu aimes l'Allemand. [cite: 170]",
        [cite_start]"Fais une phrase pour dire que tu n'aimes pas la Musique. [cite: 172]",
        [cite_start]"Fais une phrase pour dire que tu détestes l'Anglais. [cite: 173]",
        [cite_start]"Comment dit-on 'Mon activité favorite est...' ? [cite: 177]",
        "Comment dit-on 'Mon activité favorite le moins est...' ? (Deux options sont dans le cours) [cite_start][cite: 178, 183]",
        [cite_start]"Fais une phrase pour dire que tu aimes l'escalade (rock climbing). [cite: 175]",
        [cite_start]"Fais une phrase pour dire que tu n'aimes pas la pluie. [cite: 176]",
        [cite_start]"Dis que tu es 'un peu timide'. [cite: 180]",
        [cite_start]"Fais une phrase pour dire que tu aimes la géographie et l'histoire. [cite: 171]",
        [cite_start]"Dis que c'est 'trop fatigant'. [cite: 179]",
    ],
    # 5: Les Quantifieurs (some, many, a lot of)
    5: [
        "Comment dit-on 'beaucoup de' ? (Cite les deux options du cours)[cite_start]. [cite: 223, 224]",
        [cite_start]"Comment dit-on 'certain(e)s' ? [cite: 225, 226]",
        [cite_start]"Fais une phrase pour dire que certains étudiants jouent au badminton. [cite: 221]",
        [cite_start]"Fais une phrase pour dire qu'il y a beaucoup de couloirs dans l'école. [cite: 250]",
        [cite_start]"Fais une phrase pour dire qu'il n'y a pas d'arbre (version avec 'not any'). [cite: 251]",
        [cite_start]"Fais une phrase pour dire qu'il y a quelques bancs. [cite: 251]",
        [cite_start]"La majorité des étudiants détestent quelle matière ? [cite: 252]",
        [cite_start]"La majorité des étudiants aiment quelle matière ? [cite: 252]",
        [cite_start]"Utilise le mot 'no' pour dire qu'il n'y a pas d'arbre. [cite: 251]",
        [cite_start]"Quelle est l'autre manière de dire 'a lot of students' ? [cite: 222, 224]",
    ],
    # 6: Règles de l'école (Must / Can)
    6: [
        [cite_start]"Fais une phrase pour dire : 'Je peux jouer dans le terrain de jeux'. [cite: 260]",
        [cite_start]"Fais une phrase pour dire : 'Nous ne devons pas courir dans les couloirs'. [cite: 262]",
        [cite_start]"Dis que : 'Il peut nager mais il ne peut pas conduire un bateau'. [cite: 261]",
        [cite_start]"Comment formes-tu la question 'Peux-tu parler Anglais ?' [cite: 260]",
        [cite_start]"Traduis : 'Je peux'. [cite: 258]",
        [cite_start]"Traduis : 'Je dois'. [cite: 259]",
        [cite_start]"Rappelle la règle : quel type de verbe est utilisé après 'He she it can' ? [cite: 259]",
        [cite_start]"Fais une phrase pour dire que tu dois te répéter. [cite: 261]",
        [cite_start]"Fais une phrase pour dire que 'Nous' devons prendre le bus. [cite: 262]",
        [cite_start]"Rappelle la règle : quel type de verbe est utilisé après 'He she it must' ? [cite: 259]",
    ],
    # 7: Auto-correction (Refaire les exercices du cahier)
    7: [
        "Dans l'exercice de grammaire, tu avais complété 'There ... two playgrounds and one lab'. [cite_start]Quel est le mot manquant ? [cite: 71, 72]",
        "Quelle est la forme complète et contractée de 'You are not' ? (Deux options)[cite_start]. [cite: 130, 136]",
        "Dans l'exercice de conjugaison, 'My best friend, Tom, ... foreign languages'. [cite_start]Quel verbe as-tu utilisé ? [cite: 201, 202]",
        "Dans l'exercice de conjugaison, tu avais complété 'Hanna ... her new school'. [cite_start]Quel verbe au négatif as-tu utilisé ? [cite: 211, 212]",
        [cite_start]"Corrige cette phrase : 'Is it a good idea No it 's a good'. [cite: 140]",
        [cite_start]"Quelle est la forme contractée de 'I am not' ? [cite: 129]",
        [cite_start]"Quel est l'adjectif utilisé pour 'Lions' dans l'exemple de 'to be' ? [cite: 144]",
        [cite_start]"Corrige cette phrase : 'The camel is not thirsty'. [cite: 143]",
        [cite_start]"Corrige cette question/réponse : 'Are they in the garden no they aren't in the garden'. [cite: 139]",
        "Quelle est la date complète écrite en anglais dans ton cours ? (Choisis celle du 16 septembre)[cite_start]. [cite: 97]",
    ],
    # 8: Analyser le Test (Question/Réponse Amelia)
    8: [
        [cite_start]"Complète la question : 'My me Wow ... Amelia ?' [cite: 25]",
        "Comment Amelia est-elle décrite ? (deux adjectifs) [cite_start][cite: 28]",
        [cite_start]"Fais une phrase pour décrire son école. [cite: 33, 34, 35]",
        "Quel est le problème d'Amelia ? (Commence par 'She ...')[cite_start]. [cite: 41, 42]",
        [cite_start]"De quelle couleur est son uniforme ? [cite: 44, 45, 49]",
        [cite_start]"Quelle est la forme complète de la question sur son école : 'How ... is Her school?' [cite: 30, 31, 32]",
        [cite_start]"Complète : 'It is Big and There is a ... pool'. [cite: 34, 35, 36, 37]",
        [cite_start]"À quel âge (age) et à quelle année (grade/year) est Amelia ? [cite: 79, 82]",
        [cite_start]"Quelle est la forme complète de la question : 'Wat ... is her problem?' [cite: 38, 40]",
        [cite_start]"Quel est le nom et prénom de l'élève sur cette feuille de test ? [cite: 16]",
    ],
    # 9: Pratiquer la Prononciation (-ing / voyelles)
    9: [
        [cite_start]"Prononce les 5 voyelles : A, E, I, U, Y. [cite: 3, 4]",
        [cite_start]"Quel est le son associé à la prononciation de 'Hinking' ? [cite: 187, 188]",
        [cite_start]"Quel est le son associé à la prononciation de 'Climbing' ? [cite: 189, 190]",
        [cite_start]"Prononce le mot 'tiring'. [cite: 191]",
        [cite_start]"Prononce le mot 'cycling'. [cite: 185]",
        [cite_start]"Lis à voix haute la description d'Amelia : 'Arligt and happy'. [cite: 28]",
        [cite_start]"Lis à voix haute : 'It is 14 C° it is mild today'. [cite: 156]",
        [cite_start]"Lis la date : 'Monday 29 th September'. [cite: 112]",
        [cite_start]"Lis la règle de prononciation : 'The laest'. [cite: 192]",
        [cite_start]"Lis la phrase : 'We are afraid of spiders'. [cite: 142]",
    ],
    # 10: Le Grand Défi (Paragraphe de synthèse)
    10: [
        "Décris les installations (facilities) de ton école en utilisant **There is**, **There are** et **a gym / a pool / a library**. (3 phrases) [cite_start][cite: 11, 12, 100, 233]",
        [cite_start]"Décris tes 3 matières favorites en utilisant **I love**, **I like** et le vocabulaire du cours (**History, Geography, PE**). [cite: 170, 171, 173]",
        [cite_start]"Décris les règles de l'école en utilisant **We must not** et **We can** (courir dans les couloirs / jouer dans la cour). [cite: 262, 260]",
        [cite_start]"Écris une phrase pour dire qu'il y a **beaucoup** de couloirs mais **pas** d'arbres. [cite: 250, 251]",
        [cite_start]"Écris une phrase sur Amelia en utilisant **She loves** et **science**. [cite: 150]",
        [cite_start]"Écris une phrase sur toi et un ami en utilisant 'I am' et 'He is not' (ex: timide). [cite: 113, 115, 180]",
        [cite_start]"Combine : 'Il y a des bancs' (**some**) et 'il n'y a pas de casiers' (**not any**). [cite: 251, 235]",
        [cite_start]"Écris une courte description de ton école idéale en utilisant le vocabulaire des avantages : **excellent education / safe environnement / moderne facilities**. [cite: 6, 7, 8]",
        [cite_start]"Fais une phrase pour dire que la majorité des étudiants **aiment** la matière **PE**. [cite: 252]",
        [cite_start]"Complète la phrase de description de l'école dans ton cours : 'In our school, the table tennis tabel the clasroom Escalade mur and t...' [cite: 14]",
    ],
}


# --- 2. FONCTIONS DU SCRIPT ---

def afficher_strategies():
    """Affiche la liste des 10 stratégies."""
    print("\n--- Étape 1 : Choix de la Stratégie ---")
    print("Choisis le numéro de la stratégie de révision sur laquelle tu souhaites travailler :")
    for num, titre in STRATEGIES.items():
        print(f"  {num}. {titre}")
    print("--------------------------------------")

def choisir_strategie():
    """Demande à l'utilisateur de choisir une stratégie."""
    while True:
        try:
            choix = input("Entre le numéro de ta stratégie (1 à 10) : ")
            choix_int = int(choix)
            if 1 <= choix_int <= 10:
                return choix_int
            else:
                print("Numéro invalide. Entre un nombre entre 1 et 10.")
        except ValueError:
            print("Entrée invalide. Entre un nombre.")

def lancer_revision(strategie_num):
    """Lance la révision pour la stratégie choisie avec 10 prompts."""
    titre = STRATEGIES[strategie_num]
    prompts_liste = PROMPTS[strategie_num]

    print(f"\n========================================================")
    print(f"✅ Stratégie choisie : {titre.upper()}")
    print(f"🎯 Objectif : Compléter les 10 exercices ci-dessous en utilisant UNIQUEMENT le contenu de ton cahier.")
    print(f"========================================================\n")

    # Mélanger les prompts pour varier l'ordre
    random.shuffle(prompts_liste)

    for i, prompt in enumerate(prompts_liste):
        print(f"➡️ **PROMPT {i + 1} :** {prompt}")
        # Laisser l'utilisateur répondre ou réfléchir
        input("   (Appuie sur ENTER pour passer au prompt suivant...) ")

    print(f"\n🎉 Félicitations ! Tu as terminé la révision pour : {titre}!")
    print("\n--------------------------------------------------------")
    print("Tu peux relancer le script pour choisir une autre stratégie.")
    print("--------------------------------------------------------")


# --- 3. EXÉCUTION DU PROGRAMME PRINCIPAL ---

if __name__ == "__main__":
    afficher_strategies()
    choix = choisir_strategie()
    lancer_revision(choix)
