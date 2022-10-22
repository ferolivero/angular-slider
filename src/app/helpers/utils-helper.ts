/** Helper con funcionalidades generales */
export class UtilsHelper {
  static esIndefinidoONulo(value: any): boolean {
    return value === undefined || value === null;
  }

  /** Obtiene el porcentaje de la barra desde el minimo hasta la posicion */
  static obtenerPorcentajePosicion(val: number, minVal: number, maxVal: number): number {
    const range: number = maxVal - minVal;
    return (val - minVal) / range;
  }

  /** Obtiene a partir de un porcentaje la posicion correspondiente */
  static obtenerPosicionPorcentaje(porcentaje: number, minimoValor: number, maximoValor: number): number {
    return porcentaje * (maximoValor - minimoValor) + minimoValor;
  }

  /** Obtiene el indice del nodo con menor diferencia */
  static obtenerIndiceNodo(valor: number, valoresPosibles: number[]): number {
    const arrayDiferencias: number[] = valoresPosibles.map((step: number): number => Math.abs(valor - step));
    let indiceMenorDiferencia: number = 0;
    for (let index: number = 0; index < valoresPosibles.length; index++) {
      if (
        arrayDiferencias[index] !== arrayDiferencias[indiceMenorDiferencia] &&
        arrayDiferencias[index] < arrayDiferencias[indiceMenorDiferencia]
      ) {
        indiceMenorDiferencia = index;
      }
    }
    return indiceMenorDiferencia;
  }

  /** Redondea con la cantidad de decimales definida en el limite */
  static redondear(value: number, limite: number): number {
    return +value.toPrecision(limite);
  }
}
