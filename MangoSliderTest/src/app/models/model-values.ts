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
