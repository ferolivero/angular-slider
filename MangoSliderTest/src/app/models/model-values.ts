import { ValoresHelper } from '../helpers/valores-helper';

export class ModelValues {
  value: number;
  highValue: number;

  public static compare(x?: ModelValues, y?: ModelValues): boolean {
    if (ValoresHelper.isNullOrUndefined(x) && ValoresHelper.isNullOrUndefined(y)) {
      return false;
    }
    if (ValoresHelper.isNullOrUndefined(x) !== ValoresHelper.isNullOrUndefined(y)) {
      return false;
    }
    return x.value === y.value && x.highValue === y.highValue;
  }
}

export class ModelChange extends ModelValues {
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
    return x.value === y.value && x.highValue === y.highValue && x.forceChange === y.forceChange;
  }
}

export class InputModelChange extends ModelChange {
  internalChange: boolean;
}

export class OutputModelChange extends ModelChange {
  userEventInitiated: boolean;
}
