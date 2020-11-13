/** Slider options */
export class Config {
  limiteInferior?: number = 0;
  limiteSuperior?: number = null;

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

  /** Precision limit for calculated values.
    Values used in calculations will be rounded to this number of significant digits
    to prevent accumulating small floating-point errors. */
  precisionLimit?: number = 12;
}
