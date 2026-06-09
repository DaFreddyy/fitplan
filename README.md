# 🏋️ FitPlan – Training & Ernährung

Eine installierbare **PWA** (App für iPhone, iPad, Android & PC) für persönliches Training und Ernährung – komplett **offline**, alle Daten werden **lokal auf dem Gerät** gespeichert. Keine Anmeldung, kein Server.

## Funktionen

- **📅 Plan** – Kalender in **Wochen- und Monatsansicht**; pro Tag Training + Mahlzeiten. Tag antippen → Details, Training/Mahlzeiten **tauschen**, „erledigt" abhaken.
- **🏋️ Training** – **5 Trainingspläne** für verschiedene Ziele (Ganzkörper-Einstieg, Muskelaufbau, Fettabbau-HIIT, Core & Stabilität, Mobility). Einzelne Übungen oder ganze Tage **austauschbar**. Über 35 **gerätefreie Übungen für zuhause** mit Anleitung und eingebettetem **YouTube-Video**.
- **▶ Workout-Player** – führt durch das Training: aktuelle Übung + Anleitung, **Weiter/Zurück**, **Pausen-Timer** mit lautem **5-Sekunden-Countdown**, Buttons zum **Pause überspringen** und **+10 Sek**.
- **🍽️ Rezepte** – durchsuchbar, mit Portionsrechner.
- **🛒 Einkauf** – Anzahl Tage eingeben → die Zutaten aus dem Essensplan werden automatisch mit **deutschen Mengenangaben** zusammengefasst und nach **Supermarkt-Abteilungen** sortiert; zum Abhaken.
- **👤 Profile** – mehrere Personen, jede mit eigenem Plan & eigenen Daten.
- **🥗 5 Ernährungspläne** (Ausgewogen, High-Protein, Vegetarisch/Vegan, Definition/Low-Carb, Schnell & einfach) + **Lebensmittel ausschließen** (z. B. „Tofu, Fisch").

## Installieren / an Freunde schicken

Die App läuft unter einer Web-Adresse (GitHub Pages). Link öffnen und:

- **iPhone/iPad (Safari):** Teilen-Symbol → **„Zum Home-Bildschirm"**.
- **Android (Chrome):** Menü ⋮ → **„App installieren"** / „Zum Startbildschirm".
- **PC (Chrome/Edge):** Installations-Symbol in der Adressleiste.

Danach startet FitPlan als eigenständige App-Kachel, funktioniert offline und speichert lokal. Einfach den Link an Freunde weitergeben – jede:r bekommt eigene Profile und Daten auf dem eigenen Gerät.

## Lokal testen (PC)

Da ein Service Worker genutzt wird, über einen lokalen Server starten (nicht per Doppelklick/`file://`), z. B.:

```bash
npx serve .       # oder: python -m http.server 8080
```

dann `http://localhost:8080` öffnen.

## Projektstruktur

| Datei | Inhalt |
|-------|--------|
| `index.html` | App-Hülle, Styles, Navigation |
| `app.js` | gesamte App-Logik |
| `data/app-data.js` | Rezepte, Übungen, Trainings- & Ernährungspläne, Supermarkt-Abteilungen |
| `manifest.webmanifest`, `sw.js`, `icon.svg` | PWA (Installierbarkeit & Offline) |

---

*Kein medizinischer Rat – bei gesundheitlichen Fragen ärztlich abklären.*
