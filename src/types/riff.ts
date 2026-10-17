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
  | 'black-metal'
  | 'doom'
  | 'heavy-metal'
  | 'progressive'
  | 'hard-rock'
  | 'classic-rock'
  | 'punk'
  | 'grunge'

/** One tab column: the fret played on each sounding string (omitted strings rest). */
export type RiffStep = Partial<Record<GuitarString, number>>

/** One rendered tab column: each string's cell padded to the column width (no separators). */
export interface TabColumn {
  width: number
  cells: Record<GuitarString, string> // e.g. { e: "--", …, E: "10" }
}

/**
 * - 'signature': a simplified transcription of the song's own opening riff (curated list)
 * - 'practice': a style-based practice riff for the track's subgenre (not a transcription)
 */
export type RiffTabKind = 'signature' | 'practice'

export interface GuitarRiffTab {
  kind: RiffTabKind
  title: string // e.g. "Iron Man — signature riff" or "Metalcore practice riff"
  family: RiffFamily
  tuning: string // e.g. "Drop C (C G C F A D)"
  bpm: number // approximate tempo for playing along
  stepsPerBeat: number // tab columns per beat (2 = eighth notes), drives the playhead
  difficulty: RiffDifficulty
  columns: TabColumn[] // one per step, for the playhead highlight
  lines: Record<GuitarString, string> // e.g. { e: "|-----|", …, E: "|-0-0-|" }, all equal length
}
