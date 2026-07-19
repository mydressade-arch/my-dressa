/**
 * Design-Schalter.
 *
 * Die neue Produktkarte (Preis-Erzählung, Hover-Bild, Verfügbarkeit) und die
 * Kreislauf-Sektion lassen sich jederzeit abschalten — ohne Code-Änderung.
 *
 * Zurück zur alten Ansicht:
 *   In .env (oder bei Railway in den Variablen) setzen:
 *   NEXT_PUBLIC_NEW_DESIGN=0
 *
 * Ohne Angabe ist das neue Design aktiv.
 */
export const NEW_DESIGN = process.env.NEXT_PUBLIC_NEW_DESIGN !== '0'

/**
 * Kreislauf-Grafik auf der Startseite ("Das Kleid bleibt in Bewegung").
 *
 * Standardmäßig AUS — es wird die klassische "So funktioniert es"-Sektion
 * gezeigt. Wer die Ring-Variante möchte, setzt:
 *   NEXT_PUBLIC_CYCLE=1
 */
export const SHOW_CYCLE = process.env.NEXT_PUBLIC_CYCLE === '1'
