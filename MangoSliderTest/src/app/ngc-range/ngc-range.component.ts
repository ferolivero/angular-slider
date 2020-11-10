import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, tap, throttleTime } from 'rxjs/operators';
import { CustomRangeElementDirective } from '../directives/custom-range-element.directive';
import { EventListenerHelper, MathHelper, ValoresHelper } from '../helpers';
import {
  Dragging,
  EventListener,
  InputModelChange,
  LabelType,
  ModelChange,
  ModelValues,
  Options,
  OutputModelChange,
  PointerType,
  PositionToValueFunction,
  SliderChange,
  ValueToPositionFunction
} from '../models';
import { CustomStepDefinition } from '../models/custom-step-definition';
import { CustomRangeHandleDirective } from './../directives/custom-range-handle.directive';
import { CustomRangeLabelDirective } from './../directives/custom-range-label.directive';

@Component({
  selector: 'ngc-range',
  templateUrl: './ngc-range.component.html',
  styleUrls: ['./ngc-range.component.scss'],
  host: { class: 'ngx-slider' }
})
export class NgcRangeComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy, ControlValueAccessor {
  // Model for low value of slider. For simple slider, this is the only input. For range slider, this is the low value.
  @Input()
  public value: number = null;
  // Output for low value slider to support two-way bindings
  @Output()
  public valueChange: EventEmitter<number> = new EventEmitter();

  // Model for high value of slider. Not used in simple slider. For range slider, this is the high value.
  @Input()
  public highValue: number = null;
  // Output for high value slider to support two-way bindings
  @Output()
  public highValueChange: EventEmitter<number> = new EventEmitter();

  // An object with all the other options of the slider.
  // Each option can be updated at runtime and the slider will automatically be re-rendered.
  @Input()
  public options: Options = new Options();

  // Event emitted when user starts interaction with the slider
  @Output()
  public userChangeStart: EventEmitter<SliderChange> = new EventEmitter();

  // Event emitted on each change coming from user interaction
  @Output()
  public userChange: EventEmitter<SliderChange> = new EventEmitter();

  // Event emitted when user finishes interaction with the slider
  @Output()
  public userChangeEnd: EventEmitter<SliderChange> = new EventEmitter();

  @Input() min: number;
  @Input() max: number;

  // Set to true if init method already executed
  private initHasRun: boolean = false;

  // Changes in model inputs are passed through this subject
  // These are all changes coming in from outside the component through input bindings or reactive form inputs
  private inputModelChangeSubject: Subject<InputModelChange> = new Subject<InputModelChange>();
  private inputModelChangeSubscription: Subscription = null;

  // Changes to model outputs are passed through this subject
  // These are all changes that need to be communicated to output emitters and registered callbacks
  private outputModelChangeSubject: Subject<OutputModelChange> = new Subject<OutputModelChange>();
  private outputModelChangeSubscription: Subscription = null;

  // Low value synced to model low value
  private viewLowValue: number = null;
  // High value synced to model high value
  private viewHighValue: number = null;
  // Options synced to model options, based on defaults
  private viewOptions: Options = new Options();

  // Half of the width or height of the slider handles
  private handleHalfDimension: number = 0;
  // Maximum position the slider handle can have
  private maxHandlePosition: number = 0;

  // Which handle is currently tracked for move events
  private currentTrackingPointer: PointerType = null;
  // Values recorded when first dragging the bar
  private dragging: Dragging = new Dragging();

  /* Slider DOM elements */
  // The whole slider bar
  @ViewChild('fullBar', { read: CustomRangeElementDirective })
  fullBarElement: CustomRangeElementDirective;

  // Highlight between two handles
  @ViewChild('selectionBar', { read: CustomRangeElementDirective })
  selectionBarElement: CustomRangeElementDirective;

  // Left slider handle
  @ViewChild('minHandle', { read: CustomRangeHandleDirective })
  minHandleElement: CustomRangeHandleDirective;

  // Right slider handle
  @ViewChild('maxHandle', { read: CustomRangeHandleDirective })
  maxHandleElement: CustomRangeHandleDirective;

  // Floor label
  @ViewChild('floorLabel', { read: CustomRangeLabelDirective })
  floorLabelElement: CustomRangeLabelDirective;

  // Ceiling label
  @ViewChild('ceilLabel', { read: CustomRangeLabelDirective })
  ceilLabelElement: CustomRangeLabelDirective;

  // Label above the low value
  @ViewChild('minHandleLabel', { read: CustomRangeLabelDirective })
  minHandleLabelElement: CustomRangeLabelDirective;

  // Label above the high value
  @ViewChild('maxHandleLabel', { read: CustomRangeLabelDirective })
  maxHandleLabelElement: CustomRangeLabelDirective;

  // Optional custom template for displaying tooltips
  @ContentChild('tooltipTemplate')
  public tooltipTemplate: TemplateRef<any>;

  @HostBinding('class.animate')
  public sliderElementAnimateClass: boolean = false;
  @HostBinding('class.with-legend')
  public sliderElementWithLegendClass: boolean = false;

  // CSS styles and class flags
  public barStyle: any = {};
  public minPointerStyle: any = {};
  public maxPointerStyle: any = {};
  public fullBarTransparentClass: boolean = false;
  // public selectionBarDraggableClass: boolean = false;

  // Event listeners
  private eventListenerHelper: EventListenerHelper = null;
  private onMoveEventListener: EventListener = null;
  private onEndEventListener: EventListener = null;
  // Whether currently moving the slider (between onStart() and onEnd())
  private moving: boolean = false;

  // Callbacks for reactive forms support
  private onTouchedCallback: (value: any) => void = null;
  private onChangeCallback: (value: any) => void = null;

  public constructor(
    private renderer: Renderer2,
    private elementRef: ElementRef,
    private changeDetectionRef: ChangeDetectorRef
  ) {
    this.eventListenerHelper = new EventListenerHelper(this.renderer);
  }

  // OnInit interface
  public ngOnInit(): void {
    this.viewOptions = new Options();
    this.options.floor = this.min;
    this.options.ceil = this.max;
    Object.assign(this.viewOptions, this.options);
  }

  // AfterViewInit interface
  public ngAfterViewInit(): void {
    console.log(this.selectionBarElement);
    this.applyOptions();

    this.subscribeInputModelChangeSubject(this.viewOptions.inputEventsInterval);
    this.subscribeOutputModelChangeSubject(this.viewOptions.outputEventsInterval);

    // Once we apply options, we need to normalise model values for the first time
    this.renormaliseModelValues();

    this.viewLowValue = this.modelValueToViewValue(this.value);
    this.viewHighValue = this.modelValueToViewValue(this.highValue);

    this.manageElementsStyle();
    this.calculateViewDimensions();
    this.updateCeilLabel();
    this.updateFloorLabel();
    this.initHandles();
    this.manageEventsBindings();
    this.initHasRun = true;

    // Run change detection manually to resolve some issues when init procedure changes values used in the view
    if (!this.isRefDestroyed()) {
      this.changeDetectionRef.detectChanges();
    }
  }

  // OnChanges interface
  public ngOnChanges(changes: SimpleChanges): void {
    // Always apply options first
    if (!ValoresHelper.isNullOrUndefined(changes.options)) {
      this.onChangeOptions();
    }

    // Then value changes
    if (
      !ValoresHelper.isNullOrUndefined(changes.value) ||
      !ValoresHelper.isNullOrUndefined(changes.highValue)
    ) {
      this.inputModelChangeSubject.next({
        value: this.value,
        highValue: this.highValue,
        forceChange: false,
        internalChange: false
      });
    }
  }

  // OnDestroy interface
  public ngOnDestroy(): void {
    this.unbindEvents();
    this.unsubscribeInputModelChangeSubject();
    this.unsubscribeOutputModelChangeSubject();
  }

  // ControlValueAccessor interface
  public writeValue(obj: any): void {
    if (obj instanceof Array) {
      this.value = obj[0];
      this.highValue = obj[1];
    } else {
      this.value = obj;
    }

    // ngOnChanges() is not called in this instance, so we need to communicate the change manually
    this.inputModelChangeSubject.next({
      value: this.value,
      highValue: this.highValue,
      forceChange: false,
      internalChange: false
    });
  }

  // ControlValueAccessor interface
  public registerOnChange(onChangeCallback: any): void {
    this.onChangeCallback = onChangeCallback;
  }

  // ControlValueAccessor interface
  public registerOnTouched(onTouchedCallback: any): void {
    this.onTouchedCallback = onTouchedCallback;
  }

  @HostListener('window:resize', ['$event'])
  public onResize(event: any): void {
    this.calculateViewDimensionsAndDetectChanges();
  }

  private subscribeInputModelChangeSubject(interval?: number): void {
    this.inputModelChangeSubscription = this.inputModelChangeSubject
      .pipe(
        distinctUntilChanged(ModelChange.compare),
        // Hack to reset the status of the distinctUntilChanged() - if a "fake" event comes through with forceChange=true,
        // we forcefully by-pass distinctUntilChanged(), but otherwise drop the event
        filter((modelChange: InputModelChange) => !modelChange.forceChange && !modelChange.internalChange),
        !ValoresHelper.isNullOrUndefined(interval)
          ? throttleTime(interval, undefined, { leading: true, trailing: true })
          : tap(() => {}) // no-op
      )
      .subscribe((modelChange: InputModelChange) => this.applyInputModelChange(modelChange));
  }

  private subscribeOutputModelChangeSubject(interval?: number): void {
    this.outputModelChangeSubscription = this.outputModelChangeSubject
      .pipe(
        distinctUntilChanged(ModelChange.compare),
        !ValoresHelper.isNullOrUndefined(interval)
          ? throttleTime(interval, undefined, { leading: true, trailing: true })
          : tap(() => {}) // no-op
      )
      .subscribe((modelChange: OutputModelChange) => this.publishOutputModelChange(modelChange));
  }

  private unsubscribeOnMove(): void {
    if (!ValoresHelper.isNullOrUndefined(this.onMoveEventListener)) {
      this.eventListenerHelper.detachEventListener(this.onMoveEventListener);
      this.onMoveEventListener = null;
    }
  }

  private unsubscribeOnEnd(): void {
    if (!ValoresHelper.isNullOrUndefined(this.onEndEventListener)) {
      this.eventListenerHelper.detachEventListener(this.onEndEventListener);
      this.onEndEventListener = null;
    }
  }

  private unsubscribeInputModelChangeSubject(): void {
    if (!ValoresHelper.isNullOrUndefined(this.inputModelChangeSubscription)) {
      this.inputModelChangeSubscription.unsubscribe();
      this.inputModelChangeSubscription = null;
    }
  }

  private unsubscribeOutputModelChangeSubject(): void {
    if (!ValoresHelper.isNullOrUndefined(this.outputModelChangeSubscription)) {
      this.outputModelChangeSubscription.unsubscribe();
      this.outputModelChangeSubscription = null;
    }
  }

  private getPointerElement(pointerType: PointerType): CustomRangeHandleDirective {
    if (pointerType === PointerType.Min) {
      return this.minHandleElement;
    } else if (pointerType === PointerType.Max) {
      return this.maxHandleElement;
    }
    return null;
  }

  private getCurrentTrackingValue(): number {
    if (this.currentTrackingPointer === PointerType.Min) {
      return this.viewLowValue;
    } else if (this.currentTrackingPointer === PointerType.Max) {
      return this.viewHighValue;
    }
    return null;
  }

  private modelValueToViewValue(modelValue: number): number {
    if (ValoresHelper.isNullOrUndefined(modelValue)) {
      return NaN;
    }

    if (
      !ValoresHelper.isNullOrUndefined(this.viewOptions.stepsArray) &&
      !this.viewOptions.bindIndexForStepsArray
    ) {
      return ValoresHelper.findStepIndex(+modelValue, this.viewOptions.stepsArray);
    }
    return +modelValue;
  }

  private viewValueToModelValue(viewValue: number): number {
    if (
      !ValoresHelper.isNullOrUndefined(this.viewOptions.stepsArray) &&
      !this.viewOptions.bindIndexForStepsArray
    ) {
      return this.getStepValue(viewValue);
    }
    return viewValue;
  }

  private getStepValue(sliderValue: number): number {
    const step: CustomStepDefinition = this.viewOptions.stepsArray[sliderValue];
    return !ValoresHelper.isNullOrUndefined(step) ? step.value : NaN;
  }

  private applyViewChange(): void {
    this.value = this.viewValueToModelValue(this.viewLowValue);
    this.highValue = this.viewValueToModelValue(this.viewHighValue);

    this.outputModelChangeSubject.next({
      value: this.value,
      highValue: this.highValue,
      userEventInitiated: true,
      forceChange: false
    });

    // At this point all changes are applied and outputs are emitted, so we should be done.
    // However, input changes are communicated in different stream and we need to be ready to
    // act on the next input change even if it is exactly the same as last input change.
    // Therefore, we send a special event to reset the stream.
    this.inputModelChangeSubject.next({
      value: this.value,
      highValue: this.highValue,
      forceChange: false,
      internalChange: true
    });
  }

  // Apply model change to the slider view
  private applyInputModelChange(modelChange: InputModelChange): void {
    const normalisedModelChange: ModelValues = this.normaliseModelValues(modelChange);

    // If normalised model change is different, apply the change to the model values
    const normalisationChange: boolean = !ModelValues.compare(modelChange, normalisedModelChange);
    if (normalisationChange) {
      this.value = normalisedModelChange.value;
      this.highValue = normalisedModelChange.highValue;
    }

    this.viewLowValue = this.modelValueToViewValue(normalisedModelChange.value);
    this.viewHighValue = this.modelValueToViewValue(normalisedModelChange.highValue);

    this.updateLowHandle(this.valueToPosition(this.viewLowValue));
    this.updateHighHandle(this.valueToPosition(this.viewHighValue));
    this.updateSelectionBar();

    // At the end, we need to communicate the model change to the outputs as well
    // Normalisation changes are also always forced out to ensure that subscribers always end up in correct state
    this.outputModelChangeSubject.next({
      value: normalisedModelChange.value,
      highValue: normalisedModelChange.highValue,
      forceChange: normalisationChange,
      userEventInitiated: false
    });
  }

  // Publish model change to output event emitters and registered callbacks
  private publishOutputModelChange(modelChange: OutputModelChange): void {
    const emitOutputs: () => void = (): void => {
      this.valueChange.emit(modelChange.value);
      this.highValueChange.emit(modelChange.highValue);

      if (!ValoresHelper.isNullOrUndefined(this.onChangeCallback)) {
        this.onChangeCallback([modelChange.value, modelChange.highValue]);
      }
      if (!ValoresHelper.isNullOrUndefined(this.onTouchedCallback)) {
        this.onTouchedCallback([modelChange.value, modelChange.highValue]);
      }
    };

    if (modelChange.userEventInitiated) {
      // If this change was initiated by a user event, we can emit outputs in the same tick
      emitOutputs();
      this.userChange.emit(this.getSliderChange());
    } else {
      // But, if the change was initated by something else like a change in input bindings,
      // we need to wait until next tick to emit the outputs to keep Angular change detection happy
      setTimeout(() => {
        emitOutputs();
      });
    }
  }

  private normaliseModelValues(input: ModelValues): ModelValues {
    const normalisedInput: ModelValues = new ModelValues();
    normalisedInput.value = input.value;
    normalisedInput.highValue = input.highValue;

    if (!ValoresHelper.isNullOrUndefined(this.viewOptions.stepsArray)) {
      // When using steps array, only round to nearest step in the array
      // No other enforcement can be done, as the step array may be out of order, and that is perfectly fine
      if (this.viewOptions.enforceStepsArray) {
        const valueIndex: number = ValoresHelper.findStepIndex(
          normalisedInput.value,
          this.viewOptions.stepsArray
        );
        normalisedInput.value = this.viewOptions.stepsArray[valueIndex].value;

        const highValueIndex: number = ValoresHelper.findStepIndex(
          normalisedInput.highValue,
          this.viewOptions.stepsArray
        );
        normalisedInput.highValue = this.viewOptions.stepsArray[highValueIndex].value;
      }

      return normalisedInput;
    }

    if (this.viewOptions.enforceStep) {
      normalisedInput.value = this.roundStep(normalisedInput.value);
      normalisedInput.highValue = this.roundStep(normalisedInput.highValue);
    }

    if (this.viewOptions.enforceRange) {
      normalisedInput.value = MathHelper.clampToRange(
        normalisedInput.value,
        this.viewOptions.floor,
        this.viewOptions.ceil
      );

      normalisedInput.highValue = MathHelper.clampToRange(
        normalisedInput.highValue,
        this.viewOptions.floor,
        this.viewOptions.ceil
      );

      // Make sure that range slider invariant (value <= highValue) is always satisfied
      if (input.value > input.highValue) {
        normalisedInput.value = normalisedInput.highValue;
      }
    }

    return normalisedInput;
  }

  private renormaliseModelValues(): void {
    const previousModelValues: ModelValues = {
      value: this.value,
      highValue: this.highValue
    };
    const normalisedModelValues: ModelValues = this.normaliseModelValues(previousModelValues);
    if (!ModelValues.compare(normalisedModelValues, previousModelValues)) {
      this.value = normalisedModelValues.value;
      this.highValue = normalisedModelValues.highValue;

      this.outputModelChangeSubject.next({
        value: this.value,
        highValue: this.highValue,
        forceChange: true,
        userEventInitiated: false
      });
    }
  }

  private onChangeOptions(): void {
    if (!this.initHasRun) {
      return;
    }

    const previousInputEventsInterval: number = this.viewOptions.inputEventsInterval;
    const previousOutputEventsInterval: number = this.viewOptions.outputEventsInterval;

    this.applyOptions();

    if (previousInputEventsInterval !== this.viewOptions.inputEventsInterval) {
      this.unsubscribeInputModelChangeSubject();
      this.subscribeInputModelChangeSubject(this.viewOptions.inputEventsInterval);
    }

    if (previousOutputEventsInterval !== this.viewOptions.outputEventsInterval) {
      this.unsubscribeInputModelChangeSubject();
      this.subscribeInputModelChangeSubject(this.viewOptions.outputEventsInterval);
    }

    // With new options, we need to re-normalise model values if necessary
    this.renormaliseModelValues();

    this.viewLowValue = this.modelValueToViewValue(this.value);
    this.viewHighValue = this.modelValueToViewValue(this.highValue);

    this.resetSlider();
  }

  // Read the user options and apply them to the slider model
  private applyOptions(): void {
    this.viewOptions = new Options();
    Object.assign(this.viewOptions, this.options);

    this.viewOptions.showSelectionBar =
      this.viewOptions.showSelectionBar ||
      this.viewOptions.showSelectionBarEnd ||
      !ValoresHelper.isNullOrUndefined(this.viewOptions.showSelectionBarFromValue);

    if (!ValoresHelper.isNullOrUndefined(this.viewOptions.stepsArray)) {
      this.applyStepsArrayOptions();
    } else {
      this.applyFloorCeilOptions();
    }

    if (this.viewOptions.logScale && this.viewOptions.floor === 0) {
      throw Error("Can't use floor=0 with logarithmic scale");
    }
  }

  private applyStepsArrayOptions(): void {
    this.viewOptions.floor = 0;
    this.viewOptions.ceil = this.viewOptions.stepsArray.length - 1;
    this.viewOptions.step = 1;

    if (ValoresHelper.isNullOrUndefined(this.viewOptions.translate)) {
      this.viewOptions.translate = (modelValue: number): string => {
        if (this.viewOptions.bindIndexForStepsArray) {
          return String(this.getStepValue(modelValue));
        }
        return String(modelValue);
      };
    }
  }

  private applyFloorCeilOptions(): void {
    if (ValoresHelper.isNullOrUndefined(this.viewOptions.step)) {
      this.viewOptions.step = 1;
    } else {
      this.viewOptions.step = +this.viewOptions.step;
      if (this.viewOptions.step <= 0) {
        this.viewOptions.step = 1;
      }
    }

    if (
      ValoresHelper.isNullOrUndefined(this.viewOptions.ceil) ||
      ValoresHelper.isNullOrUndefined(this.viewOptions.floor)
    ) {
      throw Error('floor and ceil options must be supplied');
    }
    this.viewOptions.ceil = +this.viewOptions.ceil;
    this.viewOptions.floor = +this.viewOptions.floor;

    if (ValoresHelper.isNullOrUndefined(this.viewOptions.translate)) {
      this.viewOptions.translate = (value: number): string => String(value);
    }
  }

  // Resets slider
  private resetSlider(rebindEvents: boolean = true): void {
    this.manageElementsStyle();
    this.updateCeilLabel();
    this.updateFloorLabel();
    if (rebindEvents) {
      this.unbindEvents();
      this.manageEventsBindings();
    }
    this.calculateViewDimensions();
  }

  // Update each elements style based on options
  private manageElementsStyle(): void {
    this.updateScale();

    this.fullBarTransparentClass = this.viewOptions.showOuterSelectionBars;

    // Changing animate class may interfere with slider reset/initialisation, so we should set it separately,
    // after all is properly set up
    if (this.sliderElementAnimateClass !== this.viewOptions.animate) {
      setTimeout((): void => {
        this.sliderElementAnimateClass = this.viewOptions.animate;
      });
    }
  }

  // Manage the events bindings based on readOnly and disabled options
  private manageEventsBindings(): void {
    this.bindEvents();
  }

  private updateScale(): void {
    let elements = this.getAllSliderElements();
    for (const element of elements) {
      element.setScale(this.viewOptions.scale);
    }
  }

  private getAllSliderElements(): CustomRangeElementDirective[] {
    return [
      this.fullBarElement,
      this.selectionBarElement,
      this.minHandleElement,
      this.maxHandleElement,
      this.floorLabelElement,
      this.ceilLabelElement,
      this.minHandleLabelElement,
      this.maxHandleLabelElement
    ];
  }

  // Initialize slider handles positions and labels
  // Run only once during initialization and every time view port changes size
  private initHandles(): void {
    this.updateLowHandle(this.valueToPosition(this.viewLowValue));

    /*
   the order here is important since the selection bar should be
   updated after the high handle but before the combined label
   */
    this.updateHighHandle(this.valueToPosition(this.viewHighValue));

    this.updateSelectionBar();
  }

  // Calculate dimensions that are dependent on view port size
  // Run once during initialization and every time view port changes size.
  private calculateViewDimensions(): void {
    this.minHandleElement.calculateDimension();
    const handleWidth: number = this.minHandleElement.dimension;

    this.handleHalfDimension = handleWidth / 2;
    this.fullBarElement.calculateDimension();

    this.maxHandlePosition = this.fullBarElement.dimension - handleWidth;

    if (this.initHasRun) {
      this.updateFloorLabel();
      this.updateCeilLabel();
      this.initHandles();
    }
  }

  private calculateViewDimensionsAndDetectChanges(): void {
    this.calculateViewDimensions();
    if (!this.isRefDestroyed()) {
      this.changeDetectionRef.detectChanges();
    }
  }

  /**
   * If the slider reference is already destroyed
   * @returns boolean - true if ref is destroyed
   */
  private isRefDestroyed(): boolean {
    return this.changeDetectionRef['destroyed'];
  }

  // Update position of the floor label
  private updateFloorLabel(): void {
    this.floorLabelElement.setValue(this.getDisplayValue(this.viewOptions.floor, LabelType.Floor));
    this.floorLabelElement.calculateDimension();
    // const position: number = this.viewOptions.rightToLeft
    //   ? this.fullBarElement.dimension - this.floorLabelElement.dimension
    //   : 0;

    this.floorLabelElement.setPosition(0);
  }

  // Update position of the ceiling label
  private updateCeilLabel(): void {
    this.ceilLabelElement.setValue(this.getDisplayValue(this.viewOptions.ceil, LabelType.Ceil));
    this.ceilLabelElement.calculateDimension();
    // const position: number = this.viewOptions.rightToLeft
    //   ? 0
    //   : this.fullBarElement.dimension - this.ceilLabelElement.dimension;
    const position = this.fullBarElement.dimension - this.ceilLabelElement.dimension;
    this.ceilLabelElement.setPosition(position);
  }

  // Update slider handles and label positions
  private updateHandles(which: PointerType, newPos: number): void {
    if (which === PointerType.Min) {
      this.updateLowHandle(newPos);
    } else if (which === PointerType.Max) {
      this.updateHighHandle(newPos);
    }

    this.updateSelectionBar();
  }

  // Helper function to work out the position for handle labels depending on RTL or not
  private getHandleLabelPos(labelType: PointerType, newPos: number): number {
    const labelDimension: number =
      labelType === PointerType.Min
        ? this.minHandleLabelElement.dimension
        : this.maxHandleLabelElement.dimension;
    const nearHandlePos: number = newPos - labelDimension / 2 + this.handleHalfDimension;
    const endOfBarPos: number = this.fullBarElement.dimension - labelDimension;

    if (!this.viewOptions.boundPointerLabels) {
      return nearHandlePos;
    }

    if (labelType === PointerType.Max) {
      return Math.min(nearHandlePos, endOfBarPos);
    } else {
      return Math.min(Math.max(nearHandlePos, 0), endOfBarPos);
    }
  }

  // Update low slider handle position and label
  private updateLowHandle(newPos: number): void {
    this.minHandleElement.setPosition(newPos);
    this.minHandleLabelElement.setValue(this.getDisplayValue(this.viewLowValue, LabelType.Low));
    this.minHandleLabelElement.setPosition(this.getHandleLabelPos(PointerType.Min, newPos));

    if (!ValoresHelper.isNullOrUndefined(this.viewOptions.getPointerColor)) {
      this.minPointerStyle = {
        backgroundColor: this.getPointerColor(PointerType.Min)
      };
    }

    if (this.viewOptions.autoHideLimitLabels) {
      this.updateFloorAndCeilLabelsVisibility();
    }
  }

  // Update high slider handle position and label
  private updateHighHandle(newPos: number): void {
    this.maxHandleElement.setPosition(newPos);
    this.maxHandleLabelElement.setValue(this.getDisplayValue(this.viewHighValue, LabelType.High));
    this.maxHandleLabelElement.setPosition(this.getHandleLabelPos(PointerType.Max, newPos));

    if (!ValoresHelper.isNullOrUndefined(this.viewOptions.getPointerColor)) {
      this.maxPointerStyle = {
        backgroundColor: this.getPointerColor(PointerType.Max)
      };
    }
    if (this.viewOptions.autoHideLimitLabels) {
      this.updateFloorAndCeilLabelsVisibility();
    }
  }

  // Show/hide floor/ceiling label
  private updateFloorAndCeilLabelsVisibility(): void {
    return;
  }

  // Update slider selection bar, combined label and range label
  private updateSelectionBar(): void {
    let position: number = 0;
    let dimension: number = 0;
    const positionForRange: number = this.minHandleElement.position + this.handleHalfDimension;

    dimension = Math.abs(this.maxHandleElement.position - this.minHandleElement.position);
    position = positionForRange;
    this.selectionBarElement.setDimension(dimension);
    this.selectionBarElement.setPosition(position);
    if (!ValoresHelper.isNullOrUndefined(this.viewOptions.getSelectionBarColor)) {
      const color: string = this.getSelectionBarColor();
      this.barStyle = {
        backgroundColor: color
      };
    }
  }

  // Wrapper around the getSelectionBarColor of the user to pass to correct parameters
  private getSelectionBarColor(): string {
    return this.viewOptions.getSelectionBarColor(this.value, this.highValue);
  }

  // Wrapper around the getPointerColor of the user to pass to  correct parameters
  private getPointerColor(pointerType: PointerType): string {
    if (pointerType === PointerType.Max) {
      return this.viewOptions.getPointerColor(this.highValue, pointerType);
    }
    return this.viewOptions.getPointerColor(this.value, pointerType);
  }

  // Return the translated value if a translate function is provided else the original value
  private getDisplayValue(value: number, which: LabelType): string {
    if (
      !ValoresHelper.isNullOrUndefined(this.viewOptions.stepsArray) &&
      !this.viewOptions.bindIndexForStepsArray
    ) {
      value = this.getStepValue(value);
    }
    return this.viewOptions.translate(value, which);
  }

  // Round value to step and precision based on minValue
  private roundStep(value: number, customStep?: number): number {
    const step: number = !ValoresHelper.isNullOrUndefined(customStep) ? customStep : this.viewOptions.step;
    let steppedDifference: number = MathHelper.roundToPrecisionLimit(
      (value - this.viewOptions.floor) / step,
      this.viewOptions.precisionLimit
    );
    steppedDifference = Math.round(steppedDifference) * step;
    return MathHelper.roundToPrecisionLimit(
      this.viewOptions.floor + steppedDifference,
      this.viewOptions.precisionLimit
    );
  }

  // Translate value to pixel position
  private valueToPosition(val: number): number {
    let fn: ValueToPositionFunction = ValoresHelper.linearValueToPosition;
    if (!ValoresHelper.isNullOrUndefined(this.viewOptions.customValueToPosition)) {
      fn = this.viewOptions.customValueToPosition;
    } else if (this.viewOptions.logScale) {
      fn = ValoresHelper.logValueToPosition;
    }

    val = MathHelper.clampToRange(val, this.viewOptions.floor, this.viewOptions.ceil);
    let percent: number = fn(val, this.viewOptions.floor, this.viewOptions.ceil);
    if (ValoresHelper.isNullOrUndefined(percent)) {
      percent = 0;
    }
    // if (this.viewOptions.rightToLeft) {
    //   percent = 1 - percent;
    // }
    return percent * this.maxHandlePosition;
  }

  // Translate position to model value
  private positionToValue(position: number): number {
    let percent: number = position / this.maxHandlePosition;
    // if (this.viewOptions.rightToLeft) {
    //   percent = 1 - percent;
    // }
    let fn: PositionToValueFunction = ValoresHelper.linearPositionToValue;
    if (!ValoresHelper.isNullOrUndefined(this.viewOptions.customPositionToValue)) {
      fn = this.viewOptions.customPositionToValue;
    } else if (this.viewOptions.logScale) {
      fn = ValoresHelper.logPositionToValue;
    }
    const value: number = fn(percent, this.viewOptions.floor, this.viewOptions.ceil);
    return !ValoresHelper.isNullOrUndefined(value) ? value : 0;
  }

  // Compute the event position depending on whether the slider is horizontal or vertical
  private getEventPosition(event: MouseEvent): number {
    const sliderElementBoundingRect: ClientRect = this.elementRef.nativeElement.getBoundingClientRect();

    const sliderPos: number = sliderElementBoundingRect.left;
    let eventPos: number = 0;
    eventPos = event.clientX - sliderPos;
    return eventPos * this.viewOptions.scale - this.handleHalfDimension;
  }

  // Get the handle closest to an event
  private getNearestHandle(event: MouseEvent): PointerType {
    const position: number = this.getEventPosition(event);
    const distanceMin: number = Math.abs(position - this.minHandleElement.position);
    const distanceMax: number = Math.abs(position - this.maxHandleElement.position);

    if (distanceMin < distanceMax) {
      return PointerType.Min;
    } else if (distanceMin > distanceMax) {
      return PointerType.Max;
      // } else if (!this.viewOptions.rightToLeft) {
      //   // if event is at the same distance from min/max then if it's at left of minH, we return minH else maxH
    }
    return position < this.minHandleElement.position ? PointerType.Min : PointerType.Max;
    // reverse in rtl
    // return position > this.minHandleElement.position ? PointerType.Min : PointerType.Max;
  }

  // Bind mouse and touch events to slider handles
  private bindEvents(): void {
    this.selectionBarElement.on('mousedown', (event: MouseEvent): void =>
      this.onStart(null, event, true, true, true)
    );

    this.minHandleElement.on('mousedown', (event: MouseEvent): void =>
      this.onStart(PointerType.Min, event, true, true)
    );

    this.maxHandleElement.on('mousedown', (event: MouseEvent): void =>
      this.onStart(PointerType.Max, event, true, true)
    );

    this.fullBarElement.on('mousedown', (event: MouseEvent): void =>
      this.onStart(null, event, true, true, true)
    );
  }

  // Unbind mouse and touch events to slider handles
  private unbindEvents(): void {
    this.unsubscribeOnMove();
    this.unsubscribeOnEnd();

    for (const element of this.getAllSliderElements()) {
      if (!ValoresHelper.isNullOrUndefined(element)) {
        element.off();
      }
    }
  }

  // onStart event handler
  private onStart(
    pointerType: PointerType,
    event: MouseEvent,
    bindMove: boolean,
    bindEnd: boolean,
    simulateImmediateMove?: boolean,
    simulateImmediateEnd?: boolean
  ): void {
    event.stopPropagation();
    // Only call preventDefault() when handling non-passive events (passive events don't need it)
    event.preventDefault();

    this.moving = false;

    // We have to do this in case the HTML where the sliders are on
    // have been animated into view.
    this.calculateViewDimensions();

    if (ValoresHelper.isNullOrUndefined(pointerType)) {
      pointerType = this.getNearestHandle(event);
    }

    this.currentTrackingPointer = pointerType;

    const pointerElement: CustomRangeHandleDirective = this.getPointerElement(pointerType);
    pointerElement.active = true;
    if (bindMove) {
      this.unsubscribeOnMove();

      const onMoveCallback: (e: MouseEvent) => void = (e: MouseEvent): void =>
        this.dragging.active ? this.onDragMove(e) : this.onMove(e);

      this.onMoveEventListener = this.eventListenerHelper.attachEventListener(
        document,
        'mousemove',
        onMoveCallback,
        this.viewOptions.mouseEventsInterval
      );
    }

    if (bindEnd) {
      this.unsubscribeOnEnd();

      const onEndCallback: (e: MouseEvent) => void = (e: MouseEvent): void => this.onEnd(e);
      this.onEndEventListener = this.eventListenerHelper.attachEventListener(
        document,
        'mouseup',
        onEndCallback
      );
    }

    this.userChangeStart.emit(this.getSliderChange());

    // Click events, either with mouse or touch gesture are weird. Sometimes they result in full
    // start, move, end sequence, and sometimes, they don't - they only invoke mousedown
    // As a workaround, we simulate the first move event and the end event if it's necessary
    if (simulateImmediateMove) {
      this.onMove(event);
    }

    if (simulateImmediateEnd) {
      this.onEnd(event);
    }
  }

  // onMove event handler
  private onMove(event: MouseEvent): void {
    if (this.viewOptions.animate && !this.viewOptions.animateOnMove && this.moving) {
      this.sliderElementAnimateClass = false;
    }

    this.moving = true;
    const newPos: number = this.getEventPosition(event);
    let newValue: number;
    const ceilValue: number = this.viewOptions.ceil;
    const floorValue: number = this.viewOptions.floor;

    if (newPos <= 0) {
      newValue = floorValue;
    } else if (newPos >= this.maxHandlePosition) {
      newValue = ceilValue;
    } else {
      newValue = this.positionToValue(newPos);
      newValue = this.roundStep(newValue);
    }
    this.positionTrackingHandle(newValue);
  }

  private onEnd(event: MouseEvent): void {
    this.moving = false;
    if (this.viewOptions.animate) {
      this.sliderElementAnimateClass = true;
    }

    this.dragging.active = false;

    this.unsubscribeOnMove();
    this.unsubscribeOnEnd();

    this.userChangeEnd.emit(this.getSliderChange());
  }

  /** Get min value depending on whether the newPos is outOfBounds above or below the bar and rightToLeft */
  private getMinValue(newPos: number, outOfBounds: boolean, isAbove: boolean): number {
    let value: number = null;

    if (outOfBounds) {
      if (isAbove) {
        value = this.viewOptions.ceil - this.dragging.difference;
      } else {
        value = this.viewOptions.floor;
      }
    } else {
      value = this.positionToValue(newPos - this.dragging.lowLimit);
    }
    return this.roundStep(value);
  }

  /** Get max value depending on whether the newPos is outOfBounds above or below the bar and rightToLeft */
  private getMaxValue(newPos: number, outOfBounds: boolean, isAbove: boolean): number {
    let value: number = null;

    if (outOfBounds) {
      if (isAbove) {
        value = this.viewOptions.ceil;
      } else {
        value = this.viewOptions.floor + this.dragging.difference;
      }
    } else {
      value = this.positionToValue(newPos - this.dragging.lowLimit) + this.dragging.difference;
    }

    return this.roundStep(value);
  }

  private onDragMove(event?: MouseEvent): void {
    const newPos: number = this.getEventPosition(event);

    if (this.viewOptions.animate && !this.viewOptions.animateOnMove) {
      if (this.moving) {
        this.sliderElementAnimateClass = false;
      }
    }

    this.moving = true;

    let ceilLimit: number,
      floorLimit: number,
      floorHandleElement: CustomRangeHandleDirective,
      ceilHandleElement: CustomRangeHandleDirective;
    ceilLimit = this.dragging.highLimit;
    floorLimit = this.dragging.lowLimit;
    floorHandleElement = this.minHandleElement;
    ceilHandleElement = this.maxHandleElement;

    const isUnderFloorLimit: boolean = newPos <= floorLimit;
    const isOverCeilLimit: boolean = newPos >= this.maxHandlePosition - ceilLimit;

    let newMinValue: number;
    let newMaxValue: number;
    if (isUnderFloorLimit) {
      if (floorHandleElement.position === 0) {
        return;
      }
      newMinValue = this.getMinValue(newPos, true, false);
      newMaxValue = this.getMaxValue(newPos, true, false);
    } else if (isOverCeilLimit) {
      if (ceilHandleElement.position === this.maxHandlePosition) {
        return;
      }
      newMaxValue = this.getMaxValue(newPos, true, true);
      newMinValue = this.getMinValue(newPos, true, true);
    } else {
      newMinValue = this.getMinValue(newPos, false, false);
      newMaxValue = this.getMaxValue(newPos, false, false);
    }

    this.positionTrackingBar(newMinValue, newMaxValue);
  }

  // Set the new value and position for the entire bar
  private positionTrackingBar(newMinValue: number, newMaxValue: number): void {
    if (
      !ValoresHelper.isNullOrUndefined(this.viewOptions.minLimit) &&
      newMinValue < this.viewOptions.minLimit
    ) {
      newMinValue = this.viewOptions.minLimit;
      newMaxValue = MathHelper.roundToPrecisionLimit(
        newMinValue + this.dragging.difference,
        this.viewOptions.precisionLimit
      );
    }
    if (
      !ValoresHelper.isNullOrUndefined(this.viewOptions.maxLimit) &&
      newMaxValue > this.viewOptions.maxLimit
    ) {
      newMaxValue = this.viewOptions.maxLimit;
      newMinValue = MathHelper.roundToPrecisionLimit(
        newMaxValue - this.dragging.difference,
        this.viewOptions.precisionLimit
      );
    }

    this.viewLowValue = newMinValue;
    this.viewHighValue = newMaxValue;
    this.applyViewChange();
    this.updateHandles(PointerType.Min, this.valueToPosition(newMinValue));
    this.updateHandles(PointerType.Max, this.valueToPosition(newMaxValue));
  }

  // Set the new value and position to the current tracking handle
  private positionTrackingHandle(newValue: number): void {
    newValue = this.applyMinMaxLimit(newValue);
    if (this.currentTrackingPointer === PointerType.Min && newValue > this.viewHighValue) {
      newValue = this.applyMinMaxRange(this.viewHighValue);
    } else if (this.currentTrackingPointer === PointerType.Max && newValue < this.viewLowValue) {
      newValue = this.applyMinMaxRange(this.viewLowValue);
    }
    newValue = this.applyMinMaxRange(newValue);
    /* This is to check if we need to switch the min and max handles */
    if (this.currentTrackingPointer === PointerType.Min && newValue > this.viewHighValue) {
      this.viewLowValue = this.viewHighValue;
      this.applyViewChange();
      this.updateHandles(PointerType.Min, this.maxHandleElement.position);
      this.currentTrackingPointer = PointerType.Max;
      this.minHandleElement.active = false;
      this.maxHandleElement.active = true;
    } else if (this.currentTrackingPointer === PointerType.Max && newValue < this.viewLowValue) {
      this.viewHighValue = this.viewLowValue;
      this.applyViewChange();
      this.updateHandles(PointerType.Max, this.minHandleElement.position);
      this.currentTrackingPointer = PointerType.Min;
      this.maxHandleElement.active = false;
      this.minHandleElement.active = true;
    }

    if (this.getCurrentTrackingValue() !== newValue) {
      if (this.currentTrackingPointer === PointerType.Min) {
        this.viewLowValue = newValue;
        this.applyViewChange();
      } else if (this.currentTrackingPointer === PointerType.Max) {
        this.viewHighValue = newValue;
        this.applyViewChange();
      }
      this.updateHandles(this.currentTrackingPointer, this.valueToPosition(newValue));
    }
  }

  private applyMinMaxLimit(newValue: number): number {
    if (!ValoresHelper.isNullOrUndefined(this.viewOptions.minLimit) && newValue < this.viewOptions.minLimit) {
      return this.viewOptions.minLimit;
    }
    if (!ValoresHelper.isNullOrUndefined(this.viewOptions.maxLimit) && newValue > this.viewOptions.maxLimit) {
      return this.viewOptions.maxLimit;
    }
    return newValue;
  }

  private applyMinMaxRange(newValue: number): number {
    const oppositeValue: number =
      this.currentTrackingPointer === PointerType.Min ? this.viewHighValue : this.viewLowValue;
    const difference: number = Math.abs(newValue - oppositeValue);
    if (!ValoresHelper.isNullOrUndefined(this.viewOptions.minRange)) {
      if (difference < this.viewOptions.minRange) {
        if (this.currentTrackingPointer === PointerType.Min) {
          return MathHelper.roundToPrecisionLimit(
            this.viewHighValue - this.viewOptions.minRange,
            this.viewOptions.precisionLimit
          );
        } else if (this.currentTrackingPointer === PointerType.Max) {
          return MathHelper.roundToPrecisionLimit(
            this.viewLowValue + this.viewOptions.minRange,
            this.viewOptions.precisionLimit
          );
        }
      }
    }
    if (!ValoresHelper.isNullOrUndefined(this.viewOptions.maxRange)) {
      if (difference > this.viewOptions.maxRange) {
        if (this.currentTrackingPointer === PointerType.Min) {
          return MathHelper.roundToPrecisionLimit(
            this.viewHighValue - this.viewOptions.maxRange,
            this.viewOptions.precisionLimit
          );
        } else if (this.currentTrackingPointer === PointerType.Max) {
          return MathHelper.roundToPrecisionLimit(
            this.viewLowValue + this.viewOptions.maxRange,
            this.viewOptions.precisionLimit
          );
        }
      }
    }
    return newValue;
  }

  private getSliderChange(): SliderChange {
    const sliderChange: SliderChange = new SliderChange();
    sliderChange.pointerType = this.currentTrackingPointer;
    sliderChange.value = +this.value;
    sliderChange.highValue = +this.highValue;
    return sliderChange;
  }
}
