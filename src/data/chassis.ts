import type { ChassisDefinition, ChassisId } from '../types/game';

export interface SpecialistDefinition extends ChassisDefinition {
  portrait: string;
  tagline: string;
}

export const CHASSIS_LIST: SpecialistDefinition[] = [
  {
    id: 'demolisher',
    code: 'ARTIFICIERE',
    name: 'BRUTO',
    role: 'Esplosioni pesanti',
    tagline: 'Più esplosivo, più danni.',
    portrait: './art/bruto.webp',
    accent: 'amber',
    maxShields: 3,
    bonusMoves: 0,
    startingCharges: {
      c4: 6,
      arc: 3,
      cross: 2,
      amp: 2,
      prism: 1,
      siphon: 1,
      sonar: 2,
    },
    startingRelics: [],
    passiveTitle: 'Carica Pesante',
    passiveDesc: 'Ogni bomba detonata vale +15% punti in più.',
  },
  {
    id: 'tesla',
    code: 'ELETTRICISTA',
    name: 'VOLT',
    role: 'Fulmini e catene',
    tagline: 'Collega tutto con scosse a catena.',
    portrait: './art/volt.webp',
    accent: 'cyan',
    maxShields: 3,
    bonusMoves: 0,
    startingCharges: {
      c4: 4,
      arc: 4,
      cross: 1,
      amp: 2,
      prism: 3,
      siphon: 1,
      sonar: 2,
    },
    startingRelics: [],
    passiveTitle: 'Alta Tensione',
    passiveDesc: 'Ogni Fulmine o Specchio aggiunge +0.2× extra al moltiplicatore.',
  },
  {
    id: 'surgeon',
    code: 'ESPLORATORE',
    name: 'OMBRA',
    role: 'Veloce e ricco',
    tagline: 'Scava gratis, incassa monete.',
    portrait: './art/ombra.webp',
    accent: 'emerald',
    maxShields: 4,
    bonusMoves: 4,
    startingCharges: {
      c4: 5,
      arc: 2,
      cross: 2,
      amp: 1,
      prism: 1,
      siphon: 3,
      sonar: 3,
    },
    startingRelics: [],
    passiveTitle: 'Occhio Rapido',
    passiveDesc: 'Toccare un numero risolto apre attorno gratis. Aree ampie: +12 monete.',
  },
];

export const CHASSIS_BY_ID: Record<ChassisId, SpecialistDefinition> = Object.fromEntries(
  CHASSIS_LIST.map((c) => [c.id, c]),
) as Record<ChassisId, SpecialistDefinition>;
