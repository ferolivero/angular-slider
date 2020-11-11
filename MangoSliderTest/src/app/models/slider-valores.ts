import { ValoresHelper } from '../helpers/valores-helper';

export class SlideValores {
  valor: number;
  valorSuperior: number;

  public static compare(x?: SlideValores, y?: SlideValores): boolean {
    if (ValoresHelper.isNullOrUndefined(x) && ValoresHelper.isNullOrUndefined(y)) {
      return false;
    }
    if (ValoresHelper.isNullOrUndefined(x) !== ValoresHelper.isNullOrUndefined(y)) {
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
    if (ValoresHelper.isNullOrUndefined(x) && ValoresHelper.isNullOrUndefined(y)) {
      return false;
    }
    if (ValoresHelper.isNullOrUndefined(x) !== ValoresHelper.isNullOrUndefined(y)) {
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
