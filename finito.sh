#!/bin/bash

# Przejdź do katalogu, z którego wywołano skrypt (ważne dla crona, ale dobra praktyka)
# cd "$PWD"

echo "🚀 Rozpoczynam proces 'finito'..."

# 1. Dodaj wszystkie zmienione pliki
git add .
echo "- Pliki dodane do przechowalni."

# 2. Stwórz dynamiczną wiadomość commita
CURRENT_DATETIME=$(date +"%Y-%m-%d %H:%M:%S")
COMMIT_MESSAGE="Automatyczny zapis postępów: $CURRENT_DATETIME"

# 3. Wykonaj commit z przygotowaną wiadomością
git commit -m "$COMMIT_MESSAGE"
echo "- Zmiany zatwierdzone z wiadomością: '$COMMIT_MESSAGE'"

# 4. Wypchnij zmiany na zdalne repozytorium
git push
echo "- Zmiany wysłane na serwer."

echo "✅ Gotowe! Miłego dnia."