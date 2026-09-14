"""Transforme un lexique en pack de révision AloLangues.

Quatre sous-commandes :

    prepare    <lexique.txt>  liste brute (un mot par ligne) → liste de travail
                              JSON à remplir (traduction, thème, exemple).
    prepare-md <lexique.md>   lexique déjà traduit en tableaux Markdown → même
                              liste de travail, déjà remplie.
    build      --entrees ...  assemble le pack JSON, le vérifie, l'écrit dans
                              packs/ et l'ajoute à packs/index.json.
    verifier   <pack.json>    contrôle qu'un pack est jouable par les 19 jeux.

Le script ne traduit rien : il ne fait que le travail mécanique et les contrôles.
"""

import argparse
import json
import re
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent

# Les messages sont en français : sans ça, une console Windows en cp1252 casse
# sur les accents.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Les jeux découpent, prononcent ou affichent `mot` tel quel : ces caractères
# le rendent injouable (pendu.js en fait une grille de lettres, dictee.js et
# perroquet.js le passent à la synthèse vocale).
MOT_INTERDIT = re.compile(r"[/\\]|\.\.\.|…")

# Écriture du cours. Doit rester d'accord avec la table ECRITURE de
# js/parcours-catalogue.js, qui s'en sert pour masquer les jeux inadaptés.
ECRITURE = {"zh": "han"}  # défaut : "latin"

# Alphabet proposé par le pendu (js/games/pendu.js:20-21) : une lettre hors de
# cette liste rend le mot impossible à deviner. La ponctuation, elle, ne pose pas
# de problème : pendu.js la révèle d'office (son `estLettre` ne teste que A-Z).
# Ce contrôle n'a de sens qu'en écriture latine : hors de là, Pendu est masqué.
ALPHABETS = {
    "de": set("ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß"),
}
ALPHABET_DEFAUT = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ")


def ecrire_json(chemin: Path, donnees) -> None:
    """Écrit du JSON au format que prettier attend (2 espaces, retour final).

    `newline=""` est indispensable sous Windows : sans lui Python traduirait
    chaque \\n en \\r\\n, alors que tout le dépôt est en LF — le hook
    mixed-line-ending réécrirait le fichier à chaque commit.
    """
    with open(chemin, "w", encoding="utf-8", newline="") as f:
        f.write(json.dumps(donnees, ensure_ascii=False, indent=2) + "\n")


# ---------------------------------------------------------------- prepare


def decouper(ligne: str):
    """« Aitzin/Aintzin » → ("Aitzin", ["Aintzin"]).

    Dans ces lexiques le `/` et le `-` séparent toujours des variantes (dialecte,
    forme dérivée, forme déclinée). On garde la première comme forme principale.
    """
    formes = [f.strip() for f in re.split(r"\s*[/-]\s*", ligne) if f.strip()]
    if not formes:
        return "", []
    return formes[0], formes[1:]


def est_suspect(mot: str) -> bool:
    """Le mot ne peut pas être joué tel quel et demande une décision humaine."""
    if len(mot) < 2:
        return True
    if MOT_INTERDIT.search(mot):
        return True
    return bool(re.search(r"\s", mot))


def cmd_prepare(args) -> int:
    source = Path(args.lexique)
    if not source.exists():
        print(f"Erreur : le fichier '{source}' n'existe pas.")
        return 1

    lignes = [l.strip() for l in source.read_text(encoding="utf-8").splitlines()]
    lignes = [l for l in lignes if l]
    # Les lettres isolées sont les intertitres de l'alphabet, pas des mots.
    entetes = [l for l in lignes if len(l) == 1]
    lignes = [l for l in lignes if len(l) > 1]

    entrees = []
    for i, ligne in enumerate(lignes, start=1):
        mot, variantes = decouper(ligne)
        entrees.append(
            {
                "id": f"v{i}",
                "mot": mot,
                "forme": ligne,
                "variantes": variantes,
                "suspect": est_suspect(mot),
                "exclure": False,
                "traduction": "",
                "theme": "",
                "exemple": "",
                "incertain": False,
            }
        )

    sortie = Path(args.out) if args.out else source.with_name(source.stem + "-entrees.json")
    ecrire_json(sortie, entrees)

    suspects = [e for e in entrees if e["suspect"]]
    print(f"{len(entrees)} entrées retenues ({len(entetes)} intertitres d'alphabet ignorés).")
    print(f"{sum(1 for e in entrees if e['variantes'])} entrées à variantes.")
    if suspects:
        print(f"{len(suspects)} entrées à décider (champ « suspect ») :")
        for e in suspects:
            print(f"   {e['id']}  {e['forme']}")
    print(f"Liste de travail écrite dans : {sortie}")
    return 0


# ------------------------------------------------------------- prepare-md


def lire_tableaux_md(texte: str):
    """Lexique déjà traduit : titres « ## Thème » et tableaux à 3 colonnes.

    Format attendu, celui de lexique/lexique_chinois_400_mots.md :

        ## Nombres
        | Chinois | Pinyin | Français |
        |---|---|---|
        | 一 | yī | un |

    La 2ᵉ colonne est la transcription (pinyin, romaji…) ; elle peut être vide.
    """
    theme = None
    lignes = []
    for ligne in texte.splitlines():
        ligne = ligne.strip()
        if ligne.startswith("## "):
            theme = ligne[3:].strip()
            continue
        if not (ligne.startswith("|") and ligne.endswith("|")):
            continue
        cellules = [c.strip() for c in ligne[1:-1].split("|")]
        if len(cellules) != 3:
            continue
        if set(cellules[0]) <= set("-: "):
            # Ligne de séparation |---|---|---| : ce qui précède était l'en-tête
            # du tableau, pas une entrée. Repérer l'en-tête par sa position
            # évite de coder en dur ses libellés (« Chinois », « Pinyin »…).
            if lignes:
                lignes.pop()
            continue
        if theme is None or not cellules[0] or not cellules[2]:
            continue
        lignes.append((theme, *cellules))
    return lignes


def cmd_prepare_md(args) -> int:
    source = Path(args.lexique)
    if not source.exists():
        print(f"Erreur : le fichier '{source}' n'existe pas.")
        return 1

    lignes = lire_tableaux_md(source.read_text(encoding="utf-8"))
    if not lignes:
        print("Aucun tableau à 3 colonnes sous un titre « ## » n'a été trouvé.")
        return 1

    # Un même mot répété est presque toujours un doublon d'édition : on le
    # marque `exclure` plutôt que de le laisser casser le contrôle d'unicité.
    vus = {}
    entrees = []
    for i, (theme, mot, transcription, traduction) in enumerate(lignes, start=1):
        doublon = mot in vus
        if not doublon:
            vus[mot] = f"v{i}"
        entrees.append(
            {
                "id": f"v{i}",
                "mot": mot,
                "forme": mot,
                "variantes": [],
                "suspect": doublon,
                "exclure": doublon,
                "pinyin": transcription,
                "traduction": traduction,
                "theme": theme,
                "exemple": "",
                "incertain": False,
            }
        )

    sortie = (
        Path(args.out) if args.out else source.with_name(source.stem + "-entrees.json")
    )
    ecrire_json(sortie, entrees)

    themes = {}
    for e in entrees:
        if not e["exclure"]:
            themes.setdefault(e["theme"], 0)
            themes[e["theme"]] += 1
    doublons = [e for e in entrees if e["exclure"]]
    print(f"{len(entrees) - len(doublons)} entrées retenues, {len(themes)} thèmes.")
    if doublons:
        print(f"{len(doublons)} doublons écartés (champ « exclure ») :")
        for e in doublons:
            print(f"   {e['id']}  {e['mot']}  ({e['traduction']})")
    gros = {t: n for t, n in themes.items() if n > 8}
    if gros:
        print("Thèmes trop gros pour une unité de Parcours (à redécouper en 5-8) :")
        for t, n in sorted(gros.items(), key=lambda kv: -kv[1]):
            print(f"   {n:3d}  {t}")
    print(f"Liste de travail écrite dans : {sortie}")
    return 0


# --------------------------------------------------------------- verifier


def verifier_pack(pack) -> list:
    """Renvoie la liste des problèmes qui rendraient le pack injouable."""
    pbs = []
    if not isinstance(pack, dict):
        return ["Ce n'est pas un objet JSON."]

    # Contraintes de js/store.js:62-88 (validatePack).
    for champ in ("id", "language", "title"):
        if not pack.get(champ):
            pbs.append(f"Champ « {champ} » manquant.")

    vocab = pack.get("vocab")
    if not isinstance(vocab, list) or len(vocab) < 4:
        pbs.append("Il faut au moins 4 mots de vocabulaire.")
        vocab = vocab if isinstance(vocab, list) else []

    latin = ECRITURE.get(pack.get("language"), "latin") == "latin"
    alphabet = ALPHABETS.get(pack.get("language"), ALPHABET_DEFAUT)
    vus_mot, vus_trad, vus_id = {}, {}, set()

    for i, v in enumerate(vocab):
        ref = v.get("id") or f"vocab[{i}]"
        mot = (v.get("mot") or "").strip()
        trad = (v.get("traduction") or "").strip()

        if not mot or not trad:
            pbs.append(f"{ref} : « mot » et « traduction » sont obligatoires.")
            continue

        # quiz.js:42-43 pose « Comment dit-on X ? » : deux mots identiques
        # donneraient deux boutons indiscernables.
        if mot.lower() in vus_mot:
            pbs.append(f"{ref} : mot « {mot} » déjà utilisé par {vus_mot[mot.lower()]}.")
        vus_mot[mot.lower()] = ref

        # quiz.js:105 et 169-172 : les options sont comparées par chaîne et
        # TOUS les boutons égaux à la bonne réponse sont peints en vert. Deux
        # traductions identiques ⇒ un clic juste peut être compté faux.
        if trad.lower() in vus_trad:
            pbs.append(
                f"{ref} : traduction « {trad} » déjà utilisée par {vus_trad[trad.lower()]}."
            )
        vus_trad[trad.lower()] = ref

        if MOT_INTERDIT.search(mot):
            pbs.append(f"{ref} : « {mot} » contient / ou … — injouable au pendu et à la dictée.")

        if latin:
            hors = {c for c in mot.upper() if c.isalpha() and c not in alphabet}
            if hors:
                pbs.append(
                    f"{ref} : « {mot} » contient {sorted(hors)}, "
                    "lettre absente de l'alphabet du pendu."
                )

        # intrus.js:181-203 groupe par thème, et computeUnites ne bascule sur
        # des blocs fixes que si AUCUN mot n'a de thème : un thème partiel fait
        # tomber le reste dans « Autres mots ».
        if not (v.get("theme") or "").strip():
            pbs.append(f"{ref} : « theme » manquant.")

        if v.get("id"):
            if v["id"] in vus_id:
                pbs.append(f"{ref} : id en double.")
            vus_id.add(v["id"])

    for i, g in enumerate(pack.get("grammar") or []):
        gref = g.get("id") or f"grammar[{i}]"
        if not g.get("titre"):
            pbs.append(f"{gref} : « titre » manquant.")
        for j, ex in enumerate(g.get("exercices") or []):
            xref = f"{gref}/exercice[{j}]"
            t = ex.get("type")
            if t == "trous":
                if "___" not in (ex.get("phrase") or ""):
                    pbs.append(f"{xref} : la phrase doit contenir ___ (trous.js:73).")
                if not (ex.get("reponse") or "").strip():
                    pbs.append(f"{xref} : « reponse » manquante.")
            elif t == "choix":
                options = ex.get("options") or []
                if len(options) < 2:
                    pbs.append(f"{xref} : au moins 2 options.")
                if len(set(options)) != len(options):
                    pbs.append(f"{xref} : deux options identiques.")
                if not isinstance(ex.get("bonne"), int) or not (
                    0 <= ex.get("bonne", -1) < len(options)
                ):
                    pbs.append(f"{xref} : « bonne » n'est pas un index valide.")
            elif t == "ordre":
                if len(ex.get("mots") or []) < 3:
                    pbs.append(f"{xref} : au moins 3 mots (ordre.js:24).")
            else:
                pbs.append(f"{xref} : type « {t} » inconnu (trous / choix / ordre).")

    vus_id = set()
    for i, p in enumerate(pack.get("phrases") or []):
        pref = p.get("id") or f"phrases[{i}]"
        if not (p.get("texte") or "").strip():
            pbs.append(f"{pref} : « texte » manquant.")
        if p.get("id"):
            if p["id"] in vus_id:
                pbs.append(f"{pref} : id en double.")
            vus_id.add(p["id"])

    return pbs


def cmd_verifier(args) -> int:
    chemin = Path(args.pack)
    if not chemin.exists():
        print(f"Erreur : le fichier '{chemin}' n'existe pas.")
        return 1
    try:
        pack = json.loads(chemin.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"JSON invalide : {e}")
        return 1

    pbs = verifier_pack(pack)
    if pbs:
        print(f"{chemin.name} : {len(pbs)} problème(s)")
        for p in pbs:
            print(f"   {p}")
        return 1
    nb = len(pack.get("vocab") or [])
    print(
        f"{chemin.name} : OK — {nb} mots, "
        f"{len(pack.get('grammar') or [])} points de grammaire, "
        f"{len(pack.get('phrases') or [])} phrases."
    )
    if ECRITURE.get(pack.get("language"), "latin") != "latin":
        print("   Écriture non latine : Pendu indisponible (grille A-Z), masqué par le catalogue.")
    return 0


# ------------------------------------------------------------------ build


def cmd_build(args) -> int:
    entrees = json.loads(Path(args.entrees).read_text(encoding="utf-8"))
    retenues = [e for e in entrees if not e.get("exclure")]

    vocab = []
    for e in retenues:
        v = {
            "id": e["id"],
            "mot": e["mot"],
            "traduction": e.get("traduction", ""),
            "theme": e.get("theme", ""),
        }
        # Transcription (pinyin, romaji…) : affichée sous le mot par motTranscrit()
        # dans js/utils.js quand elle existe.
        if e.get("pinyin"):
            v["pinyin"] = e["pinyin"]
        if e.get("exemple"):
            v["exemple"] = e["exemple"]
        vocab.append(v)

    grammar = []
    if args.grammaire:
        grammar = json.loads(Path(args.grammaire).read_text(encoding="utf-8"))
    phrases = []
    if args.phrases:
        phrases = json.loads(Path(args.phrases).read_text(encoding="utf-8"))

    pack = {
        "id": args.id,
        "language": args.langue,
        "title": args.titre,
        "description": args.description or "",
        "vocab": vocab,
        "grammar": grammar,
        "phrases": phrases,
    }

    pbs = verifier_pack(pack)
    if pbs:
        print(f"Pack refusé : {len(pbs)} problème(s) — rien n'a été écrit.")
        for p in pbs:
            print(f"   {p}")
        return 1

    dossier = Path(args.dossier) if args.dossier else RACINE / "packs"
    sortie = dossier / f"{args.id}.json"
    ecrire_json(sortie, pack)

    index_path = dossier / "index.json"
    if index_path.exists():
        index = json.loads(index_path.read_text(encoding="utf-8"))
        if not any(p.get("id") == args.id for p in index.get("packs", [])):
            index.setdefault("packs", []).append(
                {"fichier": f"{args.id}.json", "id": args.id}
            )
            ecrire_json(index_path, index)
            print(f"Ajouté à {index_path.name}.")
        else:
            print(f"Déjà présent dans {index_path.name}, index inchangé.")

    exclues = len(entrees) - len(retenues)
    print(
        f"Pack écrit : {sortie} — {len(vocab)} mots "
        f"({exclues} entrées exclues), {len(grammar)} points de grammaire, "
        f"{len(phrases)} phrases."
    )
    return 0


# ------------------------------------------------------------------- CLI


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="commande", required=True)

    p = sub.add_parser("prepare", help="lexique brut → liste de travail JSON")
    p.add_argument("lexique")
    p.add_argument("--out")
    p.set_defaults(func=cmd_prepare)

    pm = sub.add_parser(
        "prepare-md", help="lexique en tableaux Markdown → liste de travail JSON"
    )
    pm.add_argument("lexique")
    pm.add_argument("--out")
    pm.set_defaults(func=cmd_prepare_md)

    b = sub.add_parser("build", help="liste de travail remplie → pack JSON")
    b.add_argument("--entrees", required=True)
    b.add_argument("--id", required=True)
    b.add_argument("--langue", required=True)
    b.add_argument("--titre", required=True)
    b.add_argument("--description")
    b.add_argument("--grammaire")
    b.add_argument("--phrases")
    b.add_argument("--dossier", help="par défaut packs/ à la racine du projet")
    b.set_defaults(func=cmd_build)

    v = sub.add_parser("verifier", help="contrôle qu'un pack est jouable")
    v.add_argument("pack")
    v.set_defaults(func=cmd_verifier)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
