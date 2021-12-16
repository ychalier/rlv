# Schéma du modèle

Les modèles sont enregistrés au format JSON et encodés en UTF-8. Voici un exemple, à partir des phrase `il fait beau` et `il pleut`.

```json
{
    "tokens": ["il", "fait", "beau", "pleut"],
    "chain": {
        "il": {
            "score": 2,
            "children": {
                "fait": {
                    "score": 0.5,
                    "children": {
                        "beau" : {
                            "score": 1,
                            "children": {}
                        }
                    }
                },
                "pleut": {
                    "score": 0.5,
                    "children": {}
                }
            }
        }
    }
}
```

Le champ `tokens` contient la liste des différents tokens, sans répétition. Le champ `chain` possède une structure récursive. À chaque niveau, la clé est un token, et la valeur associée un nœud avec le `score` (le score de la chaîne de Markov, normalisé pour que la somme fasse 1 sur tous les enfants du nœud, sauf à la racine), et les `children`, qui sont tous les mots suivant le mot actuel, en reprenant la structure de `chain`.