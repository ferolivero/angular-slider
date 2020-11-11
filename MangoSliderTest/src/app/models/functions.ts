import { TipoLabel } from './tipos';

/** Function to translate label value into text */
export type TranslateFunction = (value: number, label: TipoLabel) => string;
export type ValorAPosicionFunction = (val: number, minVal: number, maxVal: number) => number;
export type PosicionAValorFunction = (percent: number, minVal: number, maxVal: number) => number;
