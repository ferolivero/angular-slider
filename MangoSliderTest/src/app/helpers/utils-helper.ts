/**
 * Funciones para manejar los valores
 */
export class UtilsHelper {
  static esIndefinidoONulo(value: any): boolean {
    return value === undefined || value === null;
  }

  static linearValueToPosition(val: number, minVal: number, maxVal: number): number {
    const range: number = maxVal - minVal;
    return (val - minVal) / range;
  }

  static linearPositionToValue(percent: number, minVal: number, maxVal: number): number {
    return percent * (maxVal - minVal) + minVal;
  }

  static findStepIndex(modelValue: number, stepsArray: number[]): number {
    const differences: number[] = stepsArray.map((step: number): number => Math.abs(modelValue - step));

    let minDifferenceIndex: number = 0;
    for (let index: number = 0; index < stepsArray.length; index++) {
      if (
        differences[index] !== differences[minDifferenceIndex] &&
        differences[index] < differences[minDifferenceIndex]
      ) {
        minDifferenceIndex = index;
      }
    }

    return minDifferenceIndex;
  }

  /* Round numbers to a given number of significant digits */
  static roundToPrecisionLimit(value: number, precisionLimit: number): number {
    return +value.toPrecision(precisionLimit);
  }

  static clampToRange(value: number, floor: number, ceil: number): number {
    return Math.min(Math.max(value, floor), ceil);
  }
}
