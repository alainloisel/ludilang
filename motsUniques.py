import re
import sys
from pathlib import Path

if len(sys.argv) != 2:
    print(f"Utilisation : python {Path(sys.argv[0]).name} <fichier_texte>")
    sys.exit(1)

fichier = Path(sys.argv[1])

if not fichier.exists():
    print(f"Erreur : le fichier '{fichier}' n'existe pas.")
    sys.exit(1)

# Lecture du fichier
texte = fichier.read_text(encoding="utf-8")

# Extraction des mots (insensible à la casse)
mots = re.findall(r"\b[\w']+\b", texte.lower())

# Suppression des doublons et tri
mots_uniques = sorted(set(mots))

# Nom du fichier de sortie
sortie = fichier.with_name(fichier.stem + "_mots_uniques.txt")

# Écriture
sortie.write_text("\n".join(mots_uniques), encoding="utf-8")

print(f"{len(mots_uniques)} mots uniques extraits.")
print(f"Résultat enregistré dans : {sortie}")
