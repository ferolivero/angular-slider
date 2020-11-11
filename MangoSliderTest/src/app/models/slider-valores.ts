import { UtilsHelper } from '../helpers';

export class SlideValores {
  valor: number;
  valorSuperior: number;

  public static compare(x?: SlideValores, y?: SlideValores): boolean {
    if (UtilsHelper.esIndefinidoONulo(x) && UtilsHelper.esIndefinidoONulo(y)) {
      return false;
    }
    if (UtilsHelper.esIndefinidoONulo(x) !== UtilsHelper.esIndefinidoONulo(y)) {
      return false;
    }
    return x.valor === y.valor && x.valorSuperior === y.valorSuperior;
  }
}

export class ModelChange extends SlideValores {
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
