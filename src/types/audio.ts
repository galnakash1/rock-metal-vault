// ---------- Amp Console EQ ----------

export type EqPresetId = 'flat' | 'metalcore-scoop' | 'classic-tube-amp' | 'bass-drop'

export interface EqPreset {
  id: EqPresetId
  label: string // e.g. "Metalcore Scoop"
  description: string // what the preset does to the sound
  bassDb: number // lowshelf gain
  midDb: number // peaking gain
  trebleDb: number // highshelf gain
}
