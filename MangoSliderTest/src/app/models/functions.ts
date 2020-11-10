import { LabelType } from './label-type';

/** Function to translate label value into text */
export type TranslateFunction = (value: number, label: LabelType) => string;
/** Function to combind */
// export type CombineLabelsFunction = (minLabel: string, maxLabel: string) => string;
/** Function to provide legend  */
export type GetLegendFunction = (value: number) => string;

/** Function converting slider value to slider position */
export type ValueToPositionFunction = (val: number, minVal: number, maxVal: number) => number;

/** Function converting slider position to slider value */
export type PositionToValueFunction = (percent: number, minVal: number, maxVal: number) => number;
