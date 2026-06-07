/* Woche 1 – Start (heute). Reihenfolge So..Sa, der Plan beginnt heute (Sonntag).
   Heute startest du mit Workout A; danach läuft der Zyklus A · Lauf · B · HIIT · C · Lauf/Erholung · Ruhe.
   Essen folgt dem Beispieltag aus dem Original-Plan (Oats, Linsen-/Kichererbsen-Bowl,
   Tofu-Pfanne/Omelette, Quark-Snack). Werte sind Rezept-IDs (rXX). */
(window.PFL_WEEKS = window.PFL_WEEKS || {})[1] = {
  note: 'Start – Essen wie im Plan',
  days: [
    { act: 'A',       meals: { fr: 'r01', mi: 'r04', ab: 'r05', sn: 'r11' } }, // So – heute, Start mit Workout A
    { act: 'LAUF',    meals: { fr: 'r02', mi: 'r06', ab: 'r03', sn: 'r12' } }, // Mo
    { act: 'B',       meals: { fr: 'r01', mi: 'r04', ab: 'r05', sn: 'r11' } }, // Di
    { act: 'HIIT',    meals: { fr: 'r02', mi: 'r06', ab: 'r09', sn: 'r11' } }, // Mi
    { act: 'C',       meals: { fr: 'r03', mi: 'r04', ab: 'r05', sn: 'r12' } }, // Do
    { act: 'LAUF_SA', meals: { fr: 'r01', mi: 'r06', ab: 'r05', sn: 'r11' } }, // Fr
    { act: 'REST',    meals: { fr: 'r01', mi: 'r04', ab: 'r05', sn: 'r11' } }  // Sa
  ]
};
