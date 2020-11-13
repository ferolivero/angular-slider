import { UtilsHelper } from '../helpers';

export class SliderValores {
  valor: number;
  valorSuperior: number;
}

export class ModelChange extends SliderValores {
  forzarCambio: boolean;
  public static compare(x?: ModelChange, y?: ModelChange): boolean {
    if (UtilsHelper.esIndefinidoONulo(x) && UtilsHelper.esIndefinidoONulo(y)) {
      return false;
    }
    if (UtilsHelper.esIndefinidoONulo(x) !== UtilsHelper.esIndefinidoONulo(y)) {
      return false;
    }
    return x.valor === y.valor && x.valorSuperior === y.valorSuperior && x.forzarCambio === y.forzarCambio;
  }
}

export class InputModelChange extends ModelChange {
  internalChange: boolean;
}

export class OutputModelChange extends ModelChange {
  userEventInitiated: boolean;
}
