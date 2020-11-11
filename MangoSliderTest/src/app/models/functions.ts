import { TipoLabel } from './tipo-label';

/** Function to translate label value into text */
export type TranslateFunction = (value: number, label: TipoLabel) => string;
export type ObtenerLabel = (value: number) => string;
export type ValorAPosicionFunction = (val: number, minVal: number, maxVal: number) => number;
export type PosicionAValorFunction = (percent: number, minVal: number, maxVal: number) => number;
