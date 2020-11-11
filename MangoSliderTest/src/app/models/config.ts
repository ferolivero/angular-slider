import { TranslateFunction } from '.';

/** Slider options */
export class Config {
  /** Minimum value for a slider.
    Not applicable when using stepsArray. */
  limiteInferior?: number = 0;

  /** Maximum value for a slider.
    Not applicable when using stepsArray. */
  limiteSuperior?: number = null;

  /** Step between each value.
    Not applicable when using stepsArray. */
  nodo?: number = 1;

  /** The minimum value authorized on the slider.
    When using stepsArray, expressed as index into stepsArray. */
  minLimit?: number = null;

  /** The maximum value authorized on the slider.
    When using stepsArray, expressed as index into stepsArray. */
  maxLimit?: number = null;

  /** Custom translate function. Use this if you want to translate values displayed
      on the slider. */
  translate?: TranslateFunction = null;

  valoresPosibles?: number[] = null;

  // /** Set to true to bind the index of the selected item to value model and valueHigh model. */
  // bindIndexForStepsArray?: boolean = false;

  /** Set to true to always show the selection bar before the slider handle. */
  showSelectionBar?: boolean = false;

  /** Set to true to always show the selection bar after the slider handle. */
  showSelectionBarEnd?: boolean = false;

  /**  Set a number to draw the selection bar between this value and the slider handle.
    When using stepsArray, expressed as index into stepsArray. */
  showSelectionBarFromValue?: number = null;

  /** Throttle interval for mouse events in milliseconds.
   * This is provided to avoid a flood of events when moving the slider with mouse. */
  mouseEventsInterval?: number = 50;

  /** Throttle interval for touch events in milliseconds.
   * This is provided to avoid a flood of events when moving the slider with touch gesture. */
  touchEventsInterval?: number = 50;

  /** Throttle interval for input changes (changes to bindings or reactive form inputs)
   * This is provided to avoid a flood of events on frequent input binding changes affecting performance. */
  inputEventsInterval?: number = 100;

  /** Throttle interval for output changes (signalling changes to output bindings and user callbacks)
   * This is provided to avoid a flood of outgoing events affecting Angular app performance. */
  outputEventsInterval?: number = 100;

  // /** Set to true to display a tick for each step of the slider. */
  // showTicks?: boolean = false;

  // /** Set to true to display a tick and the step value for each step of the slider.. */
  // showTicksValues?: boolean = false;

  /* The step between each tick to display. If not set, the step value is used.
    Not used when ticksArray is specified. */
  tickStep?: number = null;

  /* The step between displaying each tick step value.
    If not set, then tickStep or step is used, depending on which one is set. */
  tickValueStep?: number = null;

  /** Use to display ticks at specific positions.
    The array contains the index of the ticks that should be displayed.
    For example, [0, 1, 5] will display a tick for the first, second and sixth values. */
  ticksArray?: number[] = null;

  /** Used to display a tooltip when a tick is hovered.
    Set to a function that returns the tooltip content for a given value. */
  ticksTooltip?: (value: number) => string = null;

  /** Same as ticksTooltip but for ticks values. */
  ticksValuesTooltip?: (value: number) => string = null;

  /** If you display the slider in an element that uses transform: scale(0.5), set the scale value to 2
    so that the slider is rendered properly and the events are handled correctly. */
  scale?: number = 1;

  /** Set to true to force the value(s) to be normalised to allowed range (floor to ceil), even when modified from the outside.
    When set to false, if the model values are modified from outside the slider, and they are outside allowed range,
    the slider may be rendered incorrectly. However, setting this to false may be useful if you want to perform custom normalisation. */
  // enforceRange?: boolean = false;

  /** Precision limit for calculated values.
    Values used in calculations will be rounded to this number of significant digits
    to prevent accumulating small floating-point errors. */
  precisionLimit?: number = 12;
}
