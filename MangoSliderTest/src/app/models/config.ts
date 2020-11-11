import { TranslateFunction } from '.';
import { ObtenerLabel, PosicionAValorFunction, ValorAPosicionFunction } from './functions';
import { SliderNodo } from './slider-nodo';

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

  /** The minimum range authorized on the slider.
    Applies to range slider only.
    When using stepsArray, expressed as index into stepsArray. */
  minRange?: number = null;

  /** The maximum range authorized on the slider.
    Applies to range slider only.
    When using stepsArray, expressed as index into stepsArray. */
  maxRange?: number = null;

  /** Set to true to have a push behavior. When the min handle goes above the max,
    the max is moved as well (and vice-versa). The range between min and max is
    defined by the step option (defaults to 1) and can also be overriden by
    the minRange option. Applies to range slider only. */
  // pushRange?: boolean = false;

  /** The minimum value authorized on the slider.
    When using stepsArray, expressed as index into stepsArray. */
  minLimit?: number = null;

  /** The maximum value authorized on the slider.
    When using stepsArray, expressed as index into stepsArray. */
  maxLimit?: number = null;

  /** Custom translate function. Use this if you want to translate values displayed
      on the slider. */
  translate?: TranslateFunction = null;

  /** Use to display legend under ticks (thus, it needs to be used along with
     showTicks or showTicksValues). The function will be called with each tick
     value and returned content will be displayed under the tick as a legend.
     If the returned value is null, then no legend is displayed under
     the corresponding tick.You can also directly provide the legend values
     in the stepsArray option. */
  obtenerLabel?: ObtenerLabel = null;

  /** If you want to display a slider with non linear/number steps.
     Just pass an array with each slider value and that's it; the floor, ceil and step settings
     of the slider will be computed automatically.
     By default, the value model and valueHigh model values will be the value of the selected item
     in the stepsArray.
     They can also be bound to the index of the selected item by setting the bindIndexForStepsArray
     option to true. */
  stepsArray?: SliderNodo[] = null;

  /** Set to true to bind the index of the selected item to value model and valueHigh model. */
  bindIndexForStepsArray?: boolean = false;

  /** Set to true to always show the selection bar before the slider handle. */
  showSelectionBar?: boolean = false;

  /** Set to true to always show the selection bar after the slider handle. */
  showSelectionBarEnd?: boolean = false;

  /**  Set a number to draw the selection bar between this value and the slider handle.
    When using stepsArray, expressed as index into stepsArray. */
  showSelectionBarFromValue?: number = null;

  /**  Only for range slider. Set to true to visualize in different colour the areas
    on the left/right (top/bottom for vertical range slider) of selection bar between the handles. */
  showOuterSelectionBars?: boolean = false;

  /** Set to true to hide min / max labels  */
  hideLimitLabels?: boolean = false;

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

  /** Set to true to display a tick for each step of the slider. */
  showTicks?: boolean = false;

  /** Set to true to display a tick and the step value for each step of the slider.. */
  showTicksValues?: boolean = false;

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

  /** Set to true to display the slider vertically.
    The slider will take the full height of its parent.
    Changing this value at runtime is not currently supported. */
  // vertical?: boolean = false;

  /** Function that returns the color of a tick. showTicks must be enabled. */
  getTickColor?: (value: number) => string = null;

  /** If you display the slider in an element that uses transform: scale(0.5), set the scale value to 2
    so that the slider is rendered properly and the events are handled correctly. */
  scale?: number = 1;

  /** Set to true to force the value(s) to be rounded to the step, even when modified from the outside.
    When set to false, if the model values are modified from outside the slider, they are not rounded
    and can be between two steps. */
  enforceStep?: boolean = true;

  /** Set to true to force the value(s) to be normalised to allowed range (floor to ceil), even when modified from the outside.
    When set to false, if the model values are modified from outside the slider, and they are outside allowed range,
    the slider may be rendered incorrectly. However, setting this to false may be useful if you want to perform custom normalisation. */
  enforceRange?: boolean = true;

  /** Set to true to force the value(s) to be rounded to the nearest step value, even when modified from the outside.
    When set to false, if the model values are modified from outside the slider, and they are outside allowed range,
    the slider may be rendered incorrectly. However, setting this to false may be useful if you want to perform custom normalisation. */
  enforceStepsArray?: boolean = true;

  /** Set to true to prevent to user from switching the min and max handles. Applies to range slider only. */
  noSwitching?: boolean = true;

  /** Set to true to show graphs right to left.
    If vertical is true it will be from top to bottom and left / right arrow functions reversed. */
  rightToLeft?: boolean = false;

  /** Set to true to keep the slider labels inside the slider bounds. */
  boundPointerLabels?: boolean = true;

  /** Set to true to use a logarithmic scale to display the slider.  */
  logScale?: boolean = false;

  /** Function that returns the position on the slider for a given value.
    The position must be a percentage between 0 and 1.
    The function should be monotonically increasing or decreasing; otherwise the slider may behave incorrectly. */
  customValueToPosition?: ValorAPosicionFunction = null;

  /** Function that returns the value for a given position on the slider.
    The position is a percentage between 0 and 1.
    The function should be monotonically increasing or decreasing; otherwise the slider may behave incorrectly. */
  customPositionToValue?: PosicionAValorFunction = null;

  /** Precision limit for calculated values.
    Values used in calculations will be rounded to this number of significant digits
    to prevent accumulating small floating-point errors. */
  precisionLimit?: number = 12;

  /** Enable/disable CSS animations */
  animate?: boolean = true;
}
