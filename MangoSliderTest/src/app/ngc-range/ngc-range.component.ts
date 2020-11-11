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
  Config,
  Dragging,
  EventListener,
  InputModelChange,
  TipoLabel,
  ModelChange,
  SlideValores,
  OutputModelChange,
  PositionToValueFunction,
  SliderChange,
  SliderNodo,
  TipoPunto,
  ValueToPositionFunction
} from '../models';
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
  public valor: number = null;
  // Output for low value slider to support two-way bindings
  @Output()
  public valueChange: EventEmitter<number> = new EventEmitter();

  // Model for high value of slider. Not used in simple slider. For range slider, this is the high value.
  @Input()
  public valorSuperior: number = null;
  // Output for high value slider to support two-way bindings
  @Output()
  public valorSuperiorChange: EventEmitter<number> = new EventEmitter();

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
  private verValorSuperior: number = null;
  // Options synced to model options, based on defaults
  private configuracionDefault: Config = new Config();

  // Half of the width or height of the slider handles
  private handleHalfDimension: number = 0;
  // Maximum position the slider handle can have
  private maxHandlePosition: number = 0;

  // Which handle is currently tracked for move events
  private currentTrackingPointer: TipoPunto = null;
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
    this.configuracionDefault.floor = this.min;
    this.configuracionDefault.ceil = this.max;
  }

  // AfterViewInit interface
  public ngAfterViewInit(): void {
    this.aplicarConfiguracion();
    this.subscribeInputModelChangeSubject(this.configuracionDefault.inputEventsInterval);
    this.subscribeOutputModelChangeSubject(this.configuracionDefault.outputEventsInterval);

    // Once we apply options, we need to normalise model values for the first time
    this.renormaliseSlideValores();

    this.viewLowValue = this.modelValueToViewValue(this.valor);
    this.verValorSuperior = this.modelValueToViewValue(this.valorSuperior);

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
      !ValoresHelper.isNullOrUndefined(changes.valorSuperior)
    ) {
      this.inputModelChangeSubject.next({
        valor: this.valor,
        valorSuperior: this.valorSuperior,
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
      this.valor = obj[0];
      this.valorSuperior = obj[1];
    } else {
      this.valor = obj;
    }

    // ngOnChanges() is not called in this instance, so we need to communicate the change manually
    this.inputModelChangeSubject.next({
      valor: this.valor,
      valorSuperior: this.valorSuperior,
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

  private getPointerElement(pointerType: TipoPunto): CustomRangeHandleDirective {
    if (pointerType === TipoPunto.Min) {
      return this.minHandleElement;
    } else if (pointerType === TipoPunto.Max) {
      return this.maxHandleElement;
    }
    return null;
  }

  private getCurrentTrackingValue(): number {
    if (this.currentTrackingPointer === TipoPunto.Min) {
      return this.viewLowValue;
    } else if (this.currentTrackingPointer === TipoPunto.Max) {
      return this.verValorSuperior;
    }
    return null;
  }

  private modelValueToViewValue(modelValue: number): number {
    if (ValoresHelper.isNullOrUndefined(modelValue)) {
      return NaN;
    }

    if (
      !ValoresHelper.isNullOrUndefined(this.configuracionDefault.stepsArray) &&
      !this.configuracionDefault.bindIndexForStepsArray
    ) {
      return ValoresHelper.findStepIndex(+modelValue, this.configuracionDefault.stepsArray);
    }
    return +modelValue;
  }

  private viewValueToModelValue(viewValue: number): number {
    if (
      !ValoresHelper.isNullOrUndefined(this.configuracionDefault.stepsArray) &&
      !this.configuracionDefault.bindIndexForStepsArray
    ) {
      return this.getStepValue(viewValue);
    }
    return viewValue;
  }

  private getStepValue(sliderValue: number): number {
    const step: SliderNodo = this.configuracionDefault.stepsArray[sliderValue];
    return !ValoresHelper.isNullOrUndefined(step) ? step.valor : NaN;
  }

  private applyViewChange(): void {
    this.valor = this.viewValueToModelValue(this.viewLowValue);
    this.valorSuperior = this.viewValueToModelValue(this.verValorSuperior);

    this.outputModelChangeSubject.next({
      valor: this.valor,
      valorSuperior: this.valorSuperior,
      userEventInitiated: true,
      forceChange: false
    });

    // At this point all changes are applied and outputs are emitted, so we should be done.
    // However, input changes are communicated in different stream and we need to be ready to
    // act on the next input change even if it is exactly the same as last input change.
    // Therefore, we send a special event to reset the stream.
    this.inputModelChangeSubject.next({
      valor: this.valor,
      valorSuperior: this.valorSuperior,
      forceChange: false,
      internalChange: true
    });
  }

  // Apply model change to the slider view
  private applyInputModelChange(modelChange: InputModelChange): void {
    const normalisedModelChange: SlideValores = this.normaliseSlideValores(modelChange);

    // If normalised model change is different, apply the change to the model values
    const normalisationChange: boolean = !SlideValores.compare(modelChange, normalisedModelChange);
    if (normalisationChange) {
      this.valor = normalisedModelChange.valor;
      this.valorSuperior = normalisedModelChange.valorSuperior;
    }

    this.viewLowValue = this.modelValueToViewValue(normalisedModelChange.valor);
    this.verValorSuperior = this.modelValueToViewValue(normalisedModelChange.valorSuperior);

    this.updateLowHandle(this.valueToPosition(this.viewLowValue));
    this.updateHighHandle(this.valueToPosition(this.verValorSuperior));
    this.updateSelectionBar();

    // At the end, we need to communicate the model change to the outputs as well
    // Normalisation changes are also always forced out to ensure that subscribers always end up in correct state
    this.outputModelChangeSubject.next({
      valor: normalisedModelChange.valor,
      valorSuperior: normalisedModelChange.valorSuperior,
      forceChange: normalisationChange,
      userEventInitiated: false
    });
  }

  // Publish model change to output event emitters and registered callbacks
  private publishOutputModelChange(modelChange: OutputModelChange): void {
    const emitOutputs: () => void = (): void => {
      this.valueChange.emit(modelChange.valor);
      this.valorSuperiorChange.emit(modelChange.valorSuperior);

      if (!ValoresHelper.isNullOrUndefined(this.onChangeCallback)) {
        this.onChangeCallback([modelChange.valor, modelChange.valorSuperior]);
      }
      if (!ValoresHelper.isNullOrUndefined(this.onTouchedCallback)) {
        this.onTouchedCallback([modelChange.valor, modelChange.valorSuperior]);
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

  private normaliseSlideValores(input: SlideValores): SlideValores {
    const normalisedInput: SlideValores = new SlideValores();
    normalisedInput.valor = input.valor;
    normalisedInput.valorSuperior = input.valorSuperior;

    if (!ValoresHelper.isNullOrUndefined(this.configuracionDefault.stepsArray)) {
      // When using steps array, only round to nearest step in the array
      // No other enforcement can be done, as the step array may be out of order, and that is perfectly fine
      if (this.configuracionDefault.enforceStepsArray) {
        const valueIndex: number = ValoresHelper.findStepIndex(
          normalisedInput.valor,
          this.configuracionDefault.stepsArray
        );
        normalisedInput.valor = this.configuracionDefault.stepsArray[valueIndex].valor;

        const valorSuperiorIndex: number = ValoresHelper.findStepIndex(
          normalisedInput.valorSuperior,
          this.configuracionDefault.stepsArray
        );
        normalisedInput.valorSuperior = this.configuracionDefault.stepsArray[valorSuperiorIndex].valor;
      }

      return normalisedInput;
    }

    if (this.configuracionDefault.enforceStep) {
      normalisedInput.valor = this.roundStep(normalisedInput.valor);
      normalisedInput.valorSuperior = this.roundStep(normalisedInput.valorSuperior);
    }

    if (this.configuracionDefault.enforceRange) {
      normalisedInput.valor = MathHelper.clampToRange(
        normalisedInput.valor,
        this.configuracionDefault.floor,
        this.configuracionDefault.ceil
      );

      normalisedInput.valorSuperior = MathHelper.clampToRange(
        normalisedInput.valorSuperior,
        this.configuracionDefault.floor,
        this.configuracionDefault.ceil
      );

      // Make sure that range slider invariant (value <= highValue) is always satisfied
      if (input.valor > input.valorSuperior) {
        normalisedInput.valor = normalisedInput.valorSuperior;
      }
    }

    return normalisedInput;
  }

  private renormaliseSlideValores(): void {
    const previousSlideValores: SlideValores = {
      valor: this.valor,
      valorSuperior: this.valorSuperior
    };
    const normalisedSlideValores: SlideValores = this.normaliseSlideValores(previousSlideValores);
    if (!SlideValores.compare(normalisedSlideValores, previousSlideValores)) {
      this.valor = normalisedSlideValores.valor;
      this.valorSuperior = normalisedSlideValores.valorSuperior;

      this.outputModelChangeSubject.next({
        valor: this.valor,
        valorSuperior: this.valorSuperior,
        forceChange: true,
        userEventInitiated: false
      });
    }
  }

  private onChangeOptions(): void {
    if (!this.initHasRun) {
      return;
    }

    const previousInputEventsInterval: number = this.configuracionDefault.inputEventsInterval;
    const previousOutputEventsInterval: number = this.configuracionDefault.outputEventsInterval;

    this.aplicarConfiguracion();

    if (previousInputEventsInterval !== this.configuracionDefault.inputEventsInterval) {
      this.unsubscribeInputModelChangeSubject();
      this.subscribeInputModelChangeSubject(this.configuracionDefault.inputEventsInterval);
    }

    if (previousOutputEventsInterval !== this.configuracionDefault.outputEventsInterval) {
      this.unsubscribeInputModelChangeSubject();
      this.subscribeInputModelChangeSubject(this.configuracionDefault.outputEventsInterval);
    }

    // With new options, we need to re-normalise model values if necessary
    this.renormaliseSlideValores();

    this.viewLowValue = this.modelValueToViewValue(this.valor);
    this.verValorSuperior = this.modelValueToViewValue(this.valorSuperior);

    this.resetSlider();
  }

  // Read the user options and apply them to the slider model
  private aplicarConfiguracion(): void {
    this.configuracionDefault.showSelectionBar =
      this.configuracionDefault.showSelectionBar ||
      this.configuracionDefault.showSelectionBarEnd ||
      !ValoresHelper.isNullOrUndefined(this.configuracionDefault.showSelectionBarFromValue);

    if (!ValoresHelper.isNullOrUndefined(this.configuracionDefault.stepsArray)) {
      this.applyStepsArrayOptions();
    } else {
      this.aplicarConfiguracionTopes();
    }

    if (this.configuracionDefault.logScale && this.configuracionDefault.floor === 0) {
      throw Error("Can't use floor=0 with logarithmic scale");
    }
  }

  private applyStepsArrayOptions(): void {
    this.configuracionDefault.floor = 0;
    this.configuracionDefault.ceil = this.configuracionDefault.stepsArray.length - 1;
    this.configuracionDefault.step = 1;

    if (ValoresHelper.isNullOrUndefined(this.configuracionDefault.translate)) {
      this.configuracionDefault.translate = (modelValue: number): string => {
        if (this.configuracionDefault.bindIndexForStepsArray) {
          return String(this.getStepValue(modelValue));
        }
        return String(modelValue);
      };
    }
  }

  private aplicarConfiguracionTopes(): void {
    if (ValoresHelper.isNullOrUndefined(this.configuracionDefault.step)) {
      this.configuracionDefault.step = 1;
    } else {
      this.configuracionDefault.step = +this.configuracionDefault.step;
      if (this.configuracionDefault.step <= 0) {
        this.configuracionDefault.step = 1;
      }
    }

    if (
      ValoresHelper.isNullOrUndefined(this.configuracionDefault.ceil) ||
      ValoresHelper.isNullOrUndefined(this.configuracionDefault.floor)
    ) {
      throw Error('floor and ceil options must be supplied');
    }
    this.configuracionDefault.ceil = +this.configuracionDefault.ceil;
    this.configuracionDefault.floor = +this.configuracionDefault.floor;

    if (ValoresHelper.isNullOrUndefined(this.configuracionDefault.translate)) {
      this.configuracionDefault.translate = (value: number): string => String(value);
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

    this.fullBarTransparentClass = this.configuracionDefault.showOuterSelectionBars;

    // Changing animate class may interfere with slider reset/initialisation, so we should set it separately,
    // after all is properly set up
    if (this.sliderElementAnimateClass !== this.configuracionDefault.animate) {
      setTimeout((): void => {
        this.sliderElementAnimateClass = this.configuracionDefault.animate;
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
      element.setScale(this.configuracionDefault.scale);
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
    this.updateHighHandle(this.valueToPosition(this.verValorSuperior));

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
    this.floorLabelElement.setValue(this.getDisplayValue(this.configuracionDefault.floor, TipoLabel.Floor));
    this.floorLabelElement.calculateDimension();
    this.floorLabelElement.setPosition(0);
  }

  // Update position of the ceiling label
  private updateCeilLabel(): void {
    this.ceilLabelElement.setValue(this.getDisplayValue(this.configuracionDefault.ceil, TipoLabel.Ceil));
    this.ceilLabelElement.calculateDimension();
    const position = this.fullBarElement.dimension - this.ceilLabelElement.dimension;
    this.ceilLabelElement.setPosition(position);
  }

  // Update slider handles and label positions
  private updateHandles(which: TipoPunto, newPos: number): void {
    if (which === TipoPunto.Min) {
      this.updateLowHandle(newPos);
    } else if (which === TipoPunto.Max) {
      this.updateHighHandle(newPos);
    }

    this.updateSelectionBar();
  }

  // Helper function to work out the position for handle labels depending on RTL or not
  private getHandleLabelPos(labelType: TipoPunto, newPos: number): number {
    const labelDimension: number =
      labelType === TipoPunto.Min
        ? this.minHandleLabelElement.dimension
        : this.maxHandleLabelElement.dimension;
    const nearHandlePos: number = newPos - labelDimension / 2 + this.handleHalfDimension;
    const endOfBarPos: number = this.fullBarElement.dimension - labelDimension;

    if (!this.configuracionDefault.boundPointerLabels) {
      return nearHandlePos;
    }

    if (labelType === TipoPunto.Max) {
      return Math.min(nearHandlePos, endOfBarPos);
    } else {
      return Math.min(Math.max(nearHandlePos, 0), endOfBarPos);
    }
  }

  // Update low slider handle position and label
  private updateLowHandle(newPos: number): void {
    this.minHandleElement.setPosition(newPos);
    this.minHandleLabelElement.setValue(this.getDisplayValue(this.viewLowValue, TipoLabel.Low));
    this.minHandleLabelElement.setPosition(this.getHandleLabelPos(TipoPunto.Min, newPos));

    if (!ValoresHelper.isNullOrUndefined(this.configuracionDefault.getPointerColor)) {
      this.minPointerStyle = {
        backgroundColor: this.getPointerColor(TipoPunto.Min)
      };
    }

    if (this.configuracionDefault.autoHideLimitLabels) {
      this.updateFloorAndCeilLabelsVisibility();
    }
  }

  // Update high slider handle position and label
  private updateHighHandle(newPos: number): void {
    this.maxHandleElement.setPosition(newPos);
    this.maxHandleLabelElement.setValue(this.getDisplayValue(this.verValorSuperior, TipoLabel.High));
    this.maxHandleLabelElement.setPosition(this.getHandleLabelPos(TipoPunto.Max, newPos));

    if (!ValoresHelper.isNullOrUndefined(this.configuracionDefault.getPointerColor)) {
      this.maxPointerStyle = {
        backgroundColor: this.getPointerColor(TipoPunto.Max)
      };
    }
    if (this.configuracionDefault.autoHideLimitLabels) {
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
    if (!ValoresHelper.isNullOrUndefined(this.configuracionDefault.getSelectionBarColor)) {
      const color: string = this.getSelectionBarColor();
      this.barStyle = {
        backgroundColor: color
      };
    }
  }

  // Wrapper around the getSelectionBarColor of the user to pass to correct parameters
  private getSelectionBarColor(): string {
    return this.configuracionDefault.getSelectionBarColor(this.valor, this.valorSuperior);
  }

  // Wrapper around the getPointerColor of the user to pass to  correct parameters
  private getPointerColor(pointerType: TipoPunto): string {
    if (pointerType === TipoPunto.Max) {
      return this.configuracionDefault.getPointerColor(this.valorSuperior, pointerType);
    }
    return this.configuracionDefault.getPointerColor(this.valor, pointerType);
  }

  // Return the translated value if a translate function is provided else the original value
  private getDisplayValue(value: number, which: TipoLabel): string {
    if (
      !ValoresHelper.isNullOrUndefined(this.configuracionDefault.stepsArray) &&
      !this.configuracionDefault.bindIndexForStepsArray
    ) {
      value = this.getStepValue(value);
    }
    return this.configuracionDefault.translate(value, which);
  }

  // Round value to step and precision based on minValue
  private roundStep(value: number, customStep?: number): number {
    const step: number = !ValoresHelper.isNullOrUndefined(customStep)
      ? customStep
      : this.configuracionDefault.step;
    let steppedDifference: number = MathHelper.roundToPrecisionLimit(
      (value - this.configuracionDefault.floor) / step,
      this.configuracionDefault.precisionLimit
    );
    steppedDifference = Math.round(steppedDifference) * step;
    return MathHelper.roundToPrecisionLimit(
      this.configuracionDefault.floor + steppedDifference,
      this.configuracionDefault.precisionLimit
    );
  }

  // Translate value to pixel position
  private valueToPosition(val: number): number {
    let fn: ValueToPositionFunction = ValoresHelper.linearValueToPosition;
    if (!ValoresHelper.isNullOrUndefined(this.configuracionDefault.customValueToPosition)) {
      fn = this.configuracionDefault.customValueToPosition;
    } else if (this.configuracionDefault.logScale) {
      fn = ValoresHelper.logValueToPosition;
    }

    val = MathHelper.clampToRange(val, this.configuracionDefault.floor, this.configuracionDefault.ceil);
    let percent: number = fn(val, this.configuracionDefault.floor, this.configuracionDefault.ceil);
    if (ValoresHelper.isNullOrUndefined(percent)) {
      percent = 0;
    }
    return percent * this.maxHandlePosition;
  }

  // Translate position to model value
  private positionToValue(position: number): number {
    let percent: number = position / this.maxHandlePosition;
    let fn: PositionToValueFunction = ValoresHelper.linearPositionToValue;
    if (!ValoresHelper.isNullOrUndefined(this.configuracionDefault.customPositionToValue)) {
      fn = this.configuracionDefault.customPositionToValue;
    } else if (this.configuracionDefault.logScale) {
      fn = ValoresHelper.logPositionToValue;
    }
    const value: number = fn(percent, this.configuracionDefault.floor, this.configuracionDefault.ceil);
    return !ValoresHelper.isNullOrUndefined(value) ? value : 0;
  }

  // Compute the event position depending on whether the slider is horizontal or vertical
  private getEventPosition(event: MouseEvent): number {
    const sliderElementBoundingRect: ClientRect = this.elementRef.nativeElement.getBoundingClientRect();

    const sliderPos: number = sliderElementBoundingRect.left;
    let eventPos: number = 0;
    eventPos = event.clientX - sliderPos;
    return eventPos * this.configuracionDefault.scale - this.handleHalfDimension;
  }

  // Get the handle closest to an event
  private getNearestHandle(event: MouseEvent): TipoPunto {
    const position: number = this.getEventPosition(event);
    const distanceMin: number = Math.abs(position - this.minHandleElement.position);
    const distanceMax: number = Math.abs(position - this.maxHandleElement.position);

    if (distanceMin < distanceMax) {
      return TipoPunto.Min;
    } else if (distanceMin > distanceMax) {
      return TipoPunto.Max;
    }
    return position < this.minHandleElement.position ? TipoPunto.Min : TipoPunto.Max;
  }

  // Bind mouse and touch events to slider handles
  private bindEvents(): void {
    this.selectionBarElement.on('mousedown', (event: MouseEvent): void =>
      this.onStart(null, event, true, true, true)
    );

    this.minHandleElement.on('mousedown', (event: MouseEvent): void =>
      this.onStart(TipoPunto.Min, event, true, true)
    );

    this.maxHandleElement.on('mousedown', (event: MouseEvent): void =>
      this.onStart(TipoPunto.Max, event, true, true)
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
    pointerType: TipoPunto,
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
        this.configuracionDefault.mouseEventsInterval
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
    if (this.configuracionDefault.animate && !this.configuracionDefault.animateOnMove && this.moving) {
      this.sliderElementAnimateClass = false;
    }

    this.moving = true;
    const newPos: number = this.getEventPosition(event);
    let newValue: number;
    const ceilValue: number = this.configuracionDefault.ceil;
    const floorValue: number = this.configuracionDefault.floor;

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
    if (this.configuracionDefault.animate) {
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
        value = this.configuracionDefault.ceil - this.dragging.difference;
      } else {
        value = this.configuracionDefault.floor;
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
        value = this.configuracionDefault.ceil;
      } else {
        value = this.configuracionDefault.floor + this.dragging.difference;
      }
    } else {
      value = this.positionToValue(newPos - this.dragging.lowLimit) + this.dragging.difference;
    }

    return this.roundStep(value);
  }

  private onDragMove(event?: MouseEvent): void {
    const newPos: number = this.getEventPosition(event);

    if (this.configuracionDefault.animate && !this.configuracionDefault.animateOnMove && this.moving) {
      this.sliderElementAnimateClass = false;
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
      !ValoresHelper.isNullOrUndefined(this.configuracionDefault.minLimit) &&
      newMinValue < this.configuracionDefault.minLimit
    ) {
      newMinValue = this.configuracionDefault.minLimit;
      newMaxValue = MathHelper.roundToPrecisionLimit(
        newMinValue + this.dragging.difference,
        this.configuracionDefault.precisionLimit
      );
    }
    if (
      !ValoresHelper.isNullOrUndefined(this.configuracionDefault.maxLimit) &&
      newMaxValue > this.configuracionDefault.maxLimit
    ) {
      newMaxValue = this.configuracionDefault.maxLimit;
      newMinValue = MathHelper.roundToPrecisionLimit(
        newMaxValue - this.dragging.difference,
        this.configuracionDefault.precisionLimit
      );
    }

    this.viewLowValue = newMinValue;
    this.verValorSuperior = newMaxValue;
    this.applyViewChange();
    this.updateHandles(TipoPunto.Min, this.valueToPosition(newMinValue));
    this.updateHandles(TipoPunto.Max, this.valueToPosition(newMaxValue));
  }

  // Set the new value and position to the current tracking handle
  private positionTrackingHandle(newValue: number): void {
    newValue = this.applyMinMaxLimit(newValue);
    if (this.currentTrackingPointer === TipoPunto.Min && newValue > this.verValorSuperior) {
      newValue = this.applyMinMaxRange(this.verValorSuperior);
    } else if (this.currentTrackingPointer === TipoPunto.Max && newValue < this.viewLowValue) {
      newValue = this.applyMinMaxRange(this.viewLowValue);
    }
    newValue = this.applyMinMaxRange(newValue);
    /* This is to check if we need to switch the min and max handles */
    if (this.currentTrackingPointer === TipoPunto.Min && newValue > this.verValorSuperior) {
      this.viewLowValue = this.verValorSuperior;
      this.applyViewChange();
      this.updateHandles(TipoPunto.Min, this.maxHandleElement.position);
      this.currentTrackingPointer = TipoPunto.Max;
      this.minHandleElement.active = false;
      this.maxHandleElement.active = true;
    } else if (this.currentTrackingPointer === TipoPunto.Max && newValue < this.viewLowValue) {
      this.verValorSuperior = this.viewLowValue;
      this.applyViewChange();
      this.updateHandles(TipoPunto.Max, this.minHandleElement.position);
      this.currentTrackingPointer = TipoPunto.Min;
      this.maxHandleElement.active = false;
      this.minHandleElement.active = true;
    }

    if (this.getCurrentTrackingValue() !== newValue) {
      if (this.currentTrackingPointer === TipoPunto.Min) {
        this.viewLowValue = newValue;
        this.applyViewChange();
      } else if (this.currentTrackingPointer === TipoPunto.Max) {
        this.verValorSuperior = newValue;
        this.applyViewChange();
      }
      this.updateHandles(this.currentTrackingPointer, this.valueToPosition(newValue));
    }
  }

  private applyMinMaxLimit(newValue: number): number {
    if (
      !ValoresHelper.isNullOrUndefined(this.configuracionDefault.minLimit) &&
      newValue < this.configuracionDefault.minLimit
    ) {
      return this.configuracionDefault.minLimit;
    }
    if (
      !ValoresHelper.isNullOrUndefined(this.configuracionDefault.maxLimit) &&
      newValue > this.configuracionDefault.maxLimit
    ) {
      return this.configuracionDefault.maxLimit;
    }
    return newValue;
  }

  private applyMinMaxRange(newValue: number): number {
    const oppositeValue: number =
      this.currentTrackingPointer === TipoPunto.Min ? this.verValorSuperior : this.viewLowValue;
    const difference: number = Math.abs(newValue - oppositeValue);
    if (!ValoresHelper.isNullOrUndefined(this.configuracionDefault.minRange)) {
      if (difference < this.configuracionDefault.minRange) {
        if (this.currentTrackingPointer === TipoPunto.Min) {
          return MathHelper.roundToPrecisionLimit(
            this.verValorSuperior - this.configuracionDefault.minRange,
            this.configuracionDefault.precisionLimit
          );
        } else if (this.currentTrackingPointer === TipoPunto.Max) {
          return MathHelper.roundToPrecisionLimit(
            this.viewLowValue + this.configuracionDefault.minRange,
            this.configuracionDefault.precisionLimit
          );
        }
      }
    }
    if (!ValoresHelper.isNullOrUndefined(this.configuracionDefault.maxRange)) {
      if (difference > this.configuracionDefault.maxRange) {
        if (this.currentTrackingPointer === TipoPunto.Min) {
          return MathHelper.roundToPrecisionLimit(
            this.verValorSuperior - this.configuracionDefault.maxRange,
            this.configuracionDefault.precisionLimit
          );
        } else if (this.currentTrackingPointer === TipoPunto.Max) {
          return MathHelper.roundToPrecisionLimit(
            this.viewLowValue + this.configuracionDefault.maxRange,
            this.configuracionDefault.precisionLimit
          );
        }
      }
    }
    return newValue;
  }

  private getSliderChange(): SliderChange {
    const sliderChange: SliderChange = new SliderChange();
    sliderChange.tipoPunto = this.currentTrackingPointer;
    sliderChange.valor = +this.valor;
    sliderChange.valorSuperior = +this.valorSuperior;
    return sliderChange;
  }
}
