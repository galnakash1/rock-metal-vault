// ---------- 6-string Guitar Riff Tab ----------

/** Strings from highest (top line of a tab) to lowest, using standard-tuning names. */
export type GuitarString = 'e' | 'B' | 'G' | 'D' | 'A' | 'E'

export type RiffDifficulty = 'Beginner' | 'Intermediate' | 'Advanced'

/** Playing approach shared by related subgenres (decides tuning, tempo and riff templates). */
export type RiffFamily =
  | 'metalcore'
  | 'nu-metal'
  | 'alt-metal'
  | 'thrash'
  | 'heavy-metal'
  | 'progressive'
  | 'hard-rock'
  | 'classic-rock'
  | 'punk'
  | 'grunge'

/** One tab column: the fret played on each sounding string (omitted strings rest). */
export type RiffStep = Partial<Record<GuitarString, number>>

export interface GuitarRiffTab {
  title: string // e.g. "Metalcore practice riff"
  family: RiffFamily
  tuning: string // e.g. "Drop C (C G C F A D)"
  bpm: number // suggested practice tempo
  difficulty: RiffDifficulty
  lines: Record<GuitarString, string> // e.g. { e: "|-----|", …, E: "|-0-0-|" }, all equal length
}
