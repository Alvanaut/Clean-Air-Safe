import { SafetyScore } from '@/types';

export interface SafetyScoreDefinition {
  score: SafetyScore;
  label: string;
  criteria: string[];
  description: string;
  color: {
    bg: string;
    text: string;
  };
}

export const SAFETY_SCORES: Record<SafetyScore, SafetyScoreDefinition> = {
  A: {
    score: 'A',
    label: 'Niveau A',
    criteria: [
      'Nettoyage 2 fois par jour',
      'Prise de température',
      'Identification des personnes',
      'Port du masque obligatoire',
      'Gel hydroalcoolique',
      'Distanciation sociale',
    ],
    description: 'Toutes les mesures sanitaires appliquées',
    color: {
      bg: 'bg-green-100 dark:bg-green-900',
      text: 'text-green-800 dark:text-green-200',
    },
  },
  B: {
    score: 'B',
    label: 'Niveau B',
    criteria: [
      'Prise de température',
      'Identification des personnes',
      'Port du masque obligatoire',
      'Gel hydroalcoolique',
      'Distanciation sociale',
    ],
    description: 'Sans nettoyage renforcé',
    color: {
      bg: 'bg-blue-100 dark:bg-blue-900',
      text: 'text-blue-800 dark:text-blue-200',
    },
  },
  C: {
    score: 'C',
    label: 'Niveau C',
    criteria: [
      'Identification des personnes',
      'Port du masque obligatoire',
      'Gel hydroalcoolique',
      'Distanciation sociale',
    ],
    description: 'Sans prise de température',
    color: {
      bg: 'bg-yellow-100 dark:bg-yellow-900',
      text: 'text-yellow-800 dark:text-yellow-200',
    },
  },
  D: {
    score: 'D',
    label: 'Niveau D',
    criteria: [
      'Port du masque obligatoire',
      'Gel hydroalcoolique',
      'Distanciation sociale',
    ],
    description: 'Mesures de base',
    color: {
      bg: 'bg-orange-100 dark:bg-orange-900',
      text: 'text-orange-800 dark:text-orange-200',
    },
  },
  E: {
    score: 'E',
    label: 'Niveau E',
    criteria: [
      'Gel hydroalcoolique',
      'Distanciation sociale',
    ],
    description: 'Mesures minimales',
    color: {
      bg: 'bg-red-100 dark:bg-red-900',
      text: 'text-red-800 dark:text-red-200',
    },
  },
  F: {
    score: 'F',
    label: 'Niveau F',
    criteria: [
      'Distanciation sociale',
    ],
    description: 'Distanciation uniquement',
    color: {
      bg: 'bg-red-200 dark:bg-red-800',
      text: 'text-red-900 dark:text-red-100',
    },
  },
  G: {
    score: 'G',
    label: 'Niveau G',
    criteria: [],
    description: 'Aucune mesure sanitaire',
    color: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-800 dark:text-gray-200',
    },
  },
};

export const getSafetyScoreDefinition = (score?: SafetyScore): SafetyScoreDefinition | null => {
  if (!score) return null;
  return SAFETY_SCORES[score] || null;
};

export const getAllSafetyScores = (): SafetyScoreDefinition[] => {
  return Object.values(SAFETY_SCORES);
};
