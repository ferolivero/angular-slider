export class UtilsHelper {
  static esIndefinidoONulo(value: any): boolean {
    return value === undefined || value === null;
  }

  static linearValueToPosition(val: number, minVal: number, maxVal: number): number {
    const range: number = maxVal - minVal;
    return (val - minVal) / range;
  }

  static linearPositionToValue(porcentaje: number, minimoValor: number, maximoValor: number): number {
    return porcentaje * (maximoValor - minimoValor) + minimoValor;
  }

  /** Obtiene el indice del nodo con menor diferencia */
  static obtenerIndiceNodo(valor: number, valoresPosibles: number[]): number {
    const arrayDiferencias: number[] = valoresPosibles.map((step: number): number => Math.abs(valor - step));
    console.log(arrayDiferencias);
    let indiceMenorDiferencia: number = 0;
    for (let index: number = 0; index < valoresPosibles.length; index++) {
      if (
        arrayDiferencias[index] !== arrayDiferencias[indiceMenorDiferencia] &&
        arrayDiferencias[index] < arrayDiferencias[indiceMenorDiferencia]
      ) {
        indiceMenorDiferencia = index;
      }
    }
    console.log(indiceMenorDiferencia);
    return indiceMenorDiferencia;
  }

  /* Round numbers to a given number of significant digits */
  static roundToPrecisionLimit(value: number, precisionLimit: number): number {
    return +value.toPrecision(precisionLimit);
  }

  static clampToRange(valor: number, limiteInferior: number, limiteSuperior: number): number {
    return Math.min(Math.max(valor, limiteInferior), limiteSuperior);
  }
}
