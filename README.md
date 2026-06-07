# 🎪 Parookaville Fit

Persönlicher 6-Wochen-Plan + Rezept-App für die Festival-Vorbereitung — Kraft aufbauen, leicht definieren, gut essen. Ohne Gym, laktosefrei, fleischarm und günstig.

**Start:** 6. Juni 2026 · **Ziel:** Parookaville 17.–19. Juli 2026

## Inhalt

| Datei | Beschreibung |
|-------|--------------|
| [`index.html`](index.html) | **Die App** – eine einzige Datei mit zwei Tabs: **🍽 Rezepte** (12 eiweißreiche Rezepte, Portionsrechner, Suche, eigene Rezepte, Export/Import) und **🏋️ Plan** (interaktiver 6-Wochen-Trainings-Tracker, Workouts, Ernährung, Einkaufsliste, Festival-Tapering). Läuft komplett offline im Browser. |
| [`PLAN.md`](PLAN.md) | Der 6-Wochen-Plan als reines Markdown — Textquelle/Backup des Plan-Tabs zum Nachlesen ohne Browser. |

## Rezept-App starten

Die App ist eine einzelne HTML-Datei ohne Build-Schritt — einfach `index.html` im Browser öffnen (Doppelklick). 

Die Rezepte werden lokal im Browser (`localStorage`) gespeichert. Für den Wechsel zwischen Handy und PC gibt es unten in der App **Export/Import** (JSON).

### Auf dem Handy nutzen
1. `index.html` per Mail/Cloud aufs Handy schicken und im Browser öffnen, **oder**
2. das Repo via [GitHub Pages](https://pages.github.com/) hosten und die URL am Handy öffnen.

## Features der App

**🍽 Rezepte**
- 12 vorbereitete Rezepte (Frühstück / Hauptgericht / Snack)
- Portionsrechner — Mengen passen sich automatisch an
- Suche nach Rezept oder Zutat, Filter nach Kategorie
- Eigene Rezepte hinzufügen, bearbeiten, löschen
- Export/Import als JSON, Zurücksetzen auf die Original-Rezepte

**🏋️ Plan**
- Interaktiver Fortschritts-Tracker: 6 Wochen × Trainingstage abhaken (wird lokal gespeichert)
- Aufklappbare Workouts A/B/C + HIIT
- Wochenstruktur, Progression über die 6 Wochen
- Ernährung mit Makro-Zielen, Eiweißquellen, Beispieltag &amp; Einkaufsliste
- Festival-Woche (Tapering) und Tipps zu Rauchstopp/Alkohol

---

*Kein medizinischer Rat — bei gesundheitlichen Fragen mit Arzt/Ärztin abklären.*
