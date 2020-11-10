/**
 * Custom step definition
 *
 * This can be used to specify custom values and legend values for slider ticks
 */
export interface CustomStepDefinition {
  /** Value */
  value: number;
  /** Legend (label for the value) */
  legend?: string;
}
