/**
 * CO2 Thresholds utility - Belgian regulations
 *
 * Baseline = CO2 measured when space is empty
 * Default baseline = 400 ppm (outdoor CO2 level)
 *
 * Thresholds:
 * - GREEN:  CO2 ≤ Baseline + 500 ppm
 * - ORANGE: Baseline + 500 < CO2 ≤ Baseline + 700 ppm
 * - RED:    CO2 > Baseline + 700 ppm
 */

export interface CO2Status {
  color: 'green' | 'orange' | 'red';
  label: string;
  threshold: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

/**
 * Get CO2 status based on current level and baseline
 */
export function getCO2Status(co2Level: number, baseline: number = 400): CO2Status {
  const greenThreshold = baseline + 500;
  const orangeThreshold = baseline + 700;

  if (co2Level <= greenThreshold) {
    return {
      color: 'green',
      label: 'Bon',
      threshold: `≤ ${greenThreshold} ppm`,
      bgColor: 'bg-green-100 dark:bg-green-900',
      textColor: 'text-green-800 dark:text-green-200',
      borderColor: 'border-green-500',
    };
  } else if (co2Level <= orangeThreshold) {
    return {
      color: 'orange',
      label: 'Moyen',
      threshold: `${greenThreshold} - ${orangeThreshold} ppm`,
      bgColor: 'bg-orange-100 dark:bg-orange-900',
      textColor: 'text-orange-800 dark:text-orange-200',
      borderColor: 'border-orange-500',
    };
  } else {
    return {
      color: 'red',
      label: 'Mauvais',
      threshold: `> ${orangeThreshold} ppm`,
      bgColor: 'bg-red-100 dark:bg-red-900',
      textColor: 'text-red-800 dark:text-red-200',
      borderColor: 'border-red-500',
    };
  }
}

/**
 * Get color for chart zones
 */
export function getCO2ChartColor(value: number, baseline: number = 400): string {
  const status = getCO2Status(value, baseline);
  switch (status.color) {
    case 'green':
      return '#10b981'; // green-500
    case 'orange':
      return '#f59e0b'; // orange-500
    case 'red':
      return '#ef4444'; // red-500
    default:
      return '#6b7280'; // gray-500
  }
}

/**
 * Get thresholds for chart reference areas
 */
export function getCO2Thresholds(baseline: number = 400) {
  return {
    baseline,
    green: baseline + 500,
    orange: baseline + 700,
  };
}
