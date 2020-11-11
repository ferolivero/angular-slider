import { UtilsHelper } from '../helpers';

export class SliderValores {
  valor: number;
  valorSuperior: number;

  public static compare(x?: SliderValores, y?: SliderValores): boolean {
    if (UtilsHelper.esIndefinidoONulo(x) && UtilsHelper.esIndefinidoONulo(y)) {
      return false;
    }
    if (UtilsHelper.esIndefinidoONulo(x) !== UtilsHelper.esIndefinidoONulo(y)) {
      return false;
    }
    return x.valor === y.valor && x.valorSuperior === y.valorSuperior;
  }
}

export class ModelChange extends SliderValores {
  // Flag used to by-pass distinctUntilChanged() filter on input values
  // (sometimes there is a need to pass values through even though the model values have not changed)
  forceChange: boolean;

  public static compare(x?: ModelChange, y?: ModelChange): boolean {
    if (UtilsHelper.esIndefinidoONulo(x) && UtilsHelper.esIndefinidoONulo(y)) {
      return false;
    }
    if (UtilsHelper.esIndefinidoONulo(x) !== UtilsHelper.esIndefinidoONulo(y)) {
      return false;
    }
    return x.valor === y.valor && x.valorSuperior === y.valorSuperior && x.forceChange === y.forceChange;
  }
}

export class InputModelChange extends ModelChange {
  internalChange: boolean;
}

export class OutputModelChange extends ModelChange {
  userEventInitiated: boolean;
}
