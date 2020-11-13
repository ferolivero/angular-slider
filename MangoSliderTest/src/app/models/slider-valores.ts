import { UtilsHelper } from '../helpers';

export class ModelChange {
  forceChange: boolean;
  valor: number;
  valorSuperior: number;

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
