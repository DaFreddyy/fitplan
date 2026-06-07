/* Woche 1 – Start (heute). Reihenfolge So..Sa; der Plan beginnt heute (Sonntag) mit Workout A.
   Zyklus: A · Lauf · B · HIIT · C · Lauf/Erholung · Ruhe.
   Die Mahlzeiten kommen automatisch aus dem ersten Essensplan und werden als Batch über
   mehrere Tage geplant (Reste) – heute z. B. Linsen-Dal zum Mittag (3 Tage), Tofu-Pfanne (2 Tage).
   Optional lassen sich pro Tag feste Gerichte vorgeben:
   { act: 'A', meals: { fr: 'r01', mi: 'r04', ab: 'r05', sn: 'r11' } } */
(window.PFL_WEEKS = window.PFL_WEEKS || {})[1] = {
  note: 'Start – erster Essensplan',
  days: ['A', 'LAUF', 'B', 'HIIT', 'C', 'LAUF_SA', 'REST']
};
