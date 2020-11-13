import { UtilsHelper } from '../helpers';

export class NgcRangeModel {
  forceChange: boolean;
  valor: number;
  valorSuperior: number;

  public static compare(x?: NgcRangeModel, y?: NgcRangeModel): boolean {
    if (UtilsHelper.esIndefinidoONulo(x) && UtilsHelper.esIndefinidoONulo(y)) {
      return false;
    }
    if (UtilsHelper.esIndefinidoONulo(x) !== UtilsHelper.esIndefinidoONulo(y)) {
      return false;
    }
    return x.valor === y.valor && x.valorSuperior === y.valorSuperior && x.forceChange === y.forceChange;
  }
}

export class InputNgcRangeModel extends NgcRangeModel {
  cambioInterno: boolean;
}

export class OutputNgcRangeModel extends NgcRangeModel {
  cambioSolicitadoUsuario: boolean;
}
