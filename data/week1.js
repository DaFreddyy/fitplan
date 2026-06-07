/* Woche 1 – Plan als ausgelagerte Datei.
   days = 7 Einträge (Mo..So). Jeder Eintrag entweder ein Aktivitäts-Kürzel
   ('A','B','C','HIIT','LAUF','LAUF_SA','REST') ODER ein Objekt
   { act:'A', meals:{ fr:'r01', mi:'r04', ab:'r05', sn:'r11' } }
   um feste Gerichte vorzugeben. Ohne meals werden Vorschläge automatisch gewählt
   und sind in der App pro Tag bearbeitbar. */
(window.PFL_WEEKS = window.PFL_WEEKS || {})[1] = {
  note: 'Grundlage – sauber lernen',
  days: ['A', 'LAUF', 'B', 'HIIT', 'C', 'LAUF_SA', 'REST']
};
