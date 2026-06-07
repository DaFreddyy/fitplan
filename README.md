# 🎪 Parookaville Fit

Persönlicher 6-Wochen-Plan + Rezept-App für die Festival-Vorbereitung — Kraft aufbauen, leicht definieren, gut essen. Ohne Gym, laktosefrei, fleischarm und günstig.

**Start:** 6. Juni 2026 · **Ziel:** Parookaville 17.–19. Juli 2026

## Inhalt

| Datei / Ordner | Beschreibung |
|----------------|--------------|
| [`index.html`](index.html) | **Die App** – eine Datei mit zwei Tabs: **🍽 Rezepte** (24 eiweißreiche Rezepte, Portionsrechner, Suche, eigene Rezepte, Export/Import) und **🏋️ Plan** (Kalender mit echten Daten bis zum Festival, pro Tag Training + Essensvorschläge, alles bearbeitbar). Läuft komplett offline im Browser. |
| [`data/`](data/) | **Wochen als ausgelagerte Dateien** – `week1.js` … `week6.js`. Jede Woche definiert ihren Trainingsplan (und optional feste Gerichte pro Tag). Hier kannst du den Plan direkt bearbeiten. |
| [`PLAN.md`](PLAN.md) | Der 6-Wochen-Plan als reines Markdown — Textquelle/Backup zum Nachlesen ohne Browser. |

## Rezept-App starten

Die App ist eine einzelne HTML-Datei ohne Build-Schritt — einfach `index.html` im Browser öffnen (Doppelklick). 

Die Rezepte werden lokal im Browser (`localStorage`) gespeichert. Für den Wechsel zwischen Handy und PC gibt es unten in der App **Export/Import** (JSON).

### Auf dem Handy nutzen
1. `index.html` per Mail/Cloud aufs Handy schicken und im Browser öffnen, **oder**
2. das Repo via [GitHub Pages](https://pages.github.com/) hosten und die URL am Handy öffnen.

## Features der App

**🍽 Rezepte**
- 24 vorbereitete Rezepte (Frühstück / Hauptgericht / Snack)
- Portionsrechner — Mengen passen sich automatisch an
- Suche nach Rezept oder Zutat, Filter nach Kategorie
- Eigene Rezepte hinzufügen, bearbeiten, löschen
- Export/Import als JSON, Zurücksetzen auf die Original-Rezepte

**🏋️ Plan**
- Kalender mit **echten Daten** vom 8. Juni bis zum Festival (17.–19. Juli, Festival-Tage markiert)
- **Tag antippen** → öffnet Training des Tages (Übungen) + Essensvorschläge (Frühstück/Mittag/Abend/Snack)
- **Tag bearbeiten**: Training und jede Mahlzeit pro Tag frei wählbar; Änderungen werden lokal gespeichert, „Zurücksetzen" stellt den Plan-Standard wieder her
- Fortschritts-Tracker: Trainingstage abhaken, Balken zählt automatisch mit
- Ernährung mit Makro-Zielen, Eiweißquellen, Beispieltag & Einkaufsliste; Festival-Tapering & Tipps zu Rauchstopp/Alkohol

### Plan bearbeiten (für Tüftler)
Der Trainingsplan jeder Woche liegt in `data/weekN.js`. Eine Woche sieht z. B. so aus:

```js
(window.PFL_WEEKS = window.PFL_WEEKS || {})[1] = {
  note: 'Grundlage – sauber lernen',
  days: ['A', 'LAUF', 'B', 'HIIT', 'C', 'LAUF_SA', 'REST']
};
```

`days` hat 7 Einträge (Mo–So). Mögliche Kürzel: `A`, `B`, `C`, `HIIT`, `LAUF`, `LAUF_SA`, `REST`.
Für feste Gerichte an einem Tag statt eines Kürzels ein Objekt setzen:
`{ act: 'A', meals: { fr: 'r01', mi: 'r04', ab: 'r05', sn: 'r11' } }` (die `rXX` sind die Rezept-IDs).

---

*Kein medizinischer Rat — bei gesundheitlichen Fragen mit Arzt/Ärztin abklären.*
