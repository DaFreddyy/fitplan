/* Woche 1 – Start (heute). Reihenfolge So..Sa, weil der Plan heute (Sonntag) beginnt.
   Essen folgt dem Beispieltag aus dem Original-Plan (PLAN.md):
   Frühstück Haferflocken-Oats · Mittag Linsen-/Kichererbsen-Bowl ·
   Abend Tofu-Pfanne/Omelette · Snack laktosefreier Quark.
   Jeder Tag: { act:'A', meals:{ fr, mi, ab, sn } } – Werte sind Rezept-IDs (rXX). */
(window.PFL_WEEKS = window.PFL_WEEKS || {})[1] = {
  note: 'Start – Essen wie im Plan',
  days: [
    { act: 'REST',    meals: { fr: 'r01', mi: 'r04', ab: 'r05', sn: 'r11' } }, // So – heute
    { act: 'A',       meals: { fr: 'r01', mi: 'r06', ab: 'r05', sn: 'r11' } }, // Mo
    { act: 'LAUF',    meals: { fr: 'r02', mi: 'r04', ab: 'r03', sn: 'r12' } }, // Di
    { act: 'B',       meals: { fr: 'r01', mi: 'r06', ab: 'r05', sn: 'r11' } }, // Mi
    { act: 'HIIT',    meals: { fr: 'r02', mi: 'r04', ab: 'r09', sn: 'r11' } }, // Do
    { act: 'C',       meals: { fr: 'r03', mi: 'r06', ab: 'r05', sn: 'r12' } }, // Fr
    { act: 'LAUF_SA', meals: { fr: 'r01', mi: 'r04', ab: 'r05', sn: 'r11' } }  // Sa
  ]
};
