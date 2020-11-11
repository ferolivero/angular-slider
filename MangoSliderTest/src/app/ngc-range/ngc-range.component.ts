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
  Deslizable,
  EventListener,
  InputModelChange,
  ModelChange,
  OutputModelChange,
  PosicionAValorFunction,
  SliderChange,
  SliderNodo,
  SlideValores,
  TipoLabel,
  TipoPunto,
  ValorAPosicionFunction
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
  private vistaValorInferior: number = null;
  // High value synced to model high value
  private vistaValorSuperior: number = null;
  // Options synced to model options, based on defaults
  private configuracionDefault: Config = new Config();

  // Half of the width or height of the slider handles
  private handleHalfDimension: number = 0;
  // Maximum position the slider handle can have
  private maxHandlePosition: number = 0;

  // Which handle is currently tracked for move events
  private tipoPuntoActivo: TipoPunto = null;
  // Values recorded when first dragging the bar
  private deslizable: Deslizable = new Deslizable();

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
    this.configuracionDefault.limiteInferior = this.min;
    this.configuracionDefault.limiteSuperior = this.max;
  }

  // AfterViewInit interface
  public ngAfterViewInit(): void {
    this.aplicarConfiguracion();
    this.subscribeInputModelChangeSubject(this.configuracionDefault.inputEventsInterval);
    this.subscribeOutputModelChangeSubject(this.configuracionDefault.outputEventsInterval);

    // Once we apply options, we need to normalise model values for the first time
    this.renormaliseSlideValores();

    this.vistaValorInferior = this.modelValueToViewValue(this.valor);
    this.vistaValorSuperior = this.modelValueToViewValue(this.valorSuperior);

    this.manageElementsStyle();
    this.calcularDimensiones();
    this.actualizarLimiteSuperiorLabel();
    this.actualizarLimiteInferiorLabel();
    this.inicializarDeslizables();
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

  private obtenerDeslizableElement(tipoPunto: TipoPunto): CustomRangeHandleDirective {
    if (tipoPunto === TipoPunto.Min) {
      return this.minHandleElement;
    } else if (tipoPunto === TipoPunto.Max) {
      return this.maxHandleElement;
    }
    return null;
  }

  private getCurrentTrackingValue(): number {
    if (this.tipoPuntoActivo === TipoPunto.Min) {
      return this.vistaValorInferior;
    } else if (this.tipoPuntoActivo === TipoPunto.Max) {
      return this.vistaValorSuperior;
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

  private aplicarValorAlModelo(viewValue: number): number {
    if (
      !ValoresHelper.isNullOrUndefined(this.configuracionDefault.stepsArray) &&
      !this.configuracionDefault.bindIndexForStepsArray
    ) {
      return this.obtenerValorNodo(viewValue);
    }
    return viewValue;
  }

  private obtenerValorNodo(sliderValor: number): number {
    const nodo: SliderNodo = this.configuracionDefault.stepsArray[sliderValor];
    return !ValoresHelper.isNullOrUndefined(nodo) ? nodo.valor : NaN;
  }

  private aplicarCambiosAlModelo(): void {
    this.valor = this.aplicarValorAlModelo(this.vistaValorInferior);
    this.valorSuperior = this.aplicarValorAlModelo(this.vistaValorSuperior);

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
    const valoresNormalizados: SlideValores = this.normalizarValores(modelChange);

    // If normalised model change is different, apply the change to the model values
    const normalisationChange: boolean = !SlideValores.compare(modelChange, valoresNormalizados);
    if (normalisationChange) {
      this.valor = valoresNormalizados.valor;
      this.valorSuperior = valoresNormalizados.valorSuperior;
    }

    this.vistaValorInferior = this.modelValueToViewValue(valoresNormalizados.valor);
    this.vistaValorSuperior = this.modelValueToViewValue(valoresNormalizados.valorSuperior);

    this.actualizarDeslizableInferior(this.valorAPosicion(this.vistaValorInferior));
    this.actualizarDeslizableSuperior(this.valorAPosicion(this.vistaValorSuperior));
    this.updateSelectionBar();

    // At the end, we need to communicate the model change to the outputs as well
    // Normalisation changes are also always forced out to ensure that subscribers always end up in correct state
    this.outputModelChangeSubject.next({
      valor: valoresNormalizados.valor,
      valorSuperior: valoresNormalizados.valorSuperior,
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

  private normalizarValores(input: SlideValores): SlideValores {
    const inputNormalizado: SlideValores = new SlideValores();
    inputNormalizado.valor = input.valor;
    inputNormalizado.valorSuperior = input.valorSuperior;

    if (!ValoresHelper.isNullOrUndefined(this.configuracionDefault.stepsArray)) {
      // When using steps array, only round to nearest step in the array
      // No other enforcement can be done, as the step array may be out of order, and that is perfectly fine
      if (this.configuracionDefault.enforceStepsArray) {
        const valueIndex: number = ValoresHelper.findStepIndex(
          inputNormalizado.valor,
          this.configuracionDefault.stepsArray
        );
        inputNormalizado.valor = this.configuracionDefault.stepsArray[valueIndex].valor;

        const valorSuperiorIndex: number = ValoresHelper.findStepIndex(
          inputNormalizado.valorSuperior,
          this.configuracionDefault.stepsArray
        );
        inputNormalizado.valorSuperior = this.configuracionDefault.stepsArray[valorSuperiorIndex].valor;
      }

      return inputNormalizado;
    }

    if (this.configuracionDefault.enforceStep) {
      inputNormalizado.valor = this.redondearNodo(inputNormalizado.valor);
      inputNormalizado.valorSuperior = this.redondearNodo(inputNormalizado.valorSuperior);
    }

    if (this.configuracionDefault.enforceRange) {
      inputNormalizado.valor = MathHelper.clampToRange(
        inputNormalizado.valor,
        this.configuracionDefault.limiteInferior,
        this.configuracionDefault.limiteSuperior
      );

      inputNormalizado.valorSuperior = MathHelper.clampToRange(
        inputNormalizado.valorSuperior,
        this.configuracionDefault.limiteInferior,
        this.configuracionDefault.limiteSuperior
      );

      // Make sure that range slider invariant (value <= highValue) is always satisfied
      if (input.valor > input.valorSuperior) {
        inputNormalizado.valor = inputNormalizado.valorSuperior;
      }
    }

    return inputNormalizado;
  }

  private renormaliseSlideValores(): void {
    const previousSlideValores: SlideValores = {
      valor: this.valor,
      valorSuperior: this.valorSuperior
    };
    const normalisedSlideValores: SlideValores = this.normalizarValores(previousSlideValores);
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

    this.vistaValorInferior = this.modelValueToViewValue(this.valor);
    this.vistaValorSuperior = this.modelValueToViewValue(this.valorSuperior);

    this.reiniciarSlider();
  }

  // Read the user options and apply them to the slider model
  private aplicarConfiguracion(): void {
    this.configuracionDefault.showSelectionBar =
      this.configuracionDefault.showSelectionBar ||
      this.configuracionDefault.showSelectionBarEnd ||
      !ValoresHelper.isNullOrUndefined(this.configuracionDefault.showSelectionBarFromValue);

    if (!ValoresHelper.isNullOrUndefined(this.configuracionDefault.stepsArray)) {
      this.aplicarConfiguracionArrayNodos();
    } else {
      this.aplicarConfiguracionTopes();
    }
  }

  private aplicarConfiguracionArrayNodos(): void {
    this.configuracionDefault.limiteInferior = 0;
    this.configuracionDefault.limiteSuperior = this.configuracionDefault.stepsArray.length - 1;
    this.configuracionDefault.nodo = 1;

    if (ValoresHelper.isNullOrUndefined(this.configuracionDefault.translate)) {
      this.configuracionDefault.translate = (modelValue: number): string => {
        if (this.configuracionDefault.bindIndexForStepsArray) {
          return String(this.obtenerValorNodo(modelValue));
        }
        return String(modelValue);
      };
    }
  }

  private aplicarConfiguracionTopes(): void {
    if (ValoresHelper.isNullOrUndefined(this.configuracionDefault.nodo)) {
      this.configuracionDefault.nodo = 1;
    } else {
      this.configuracionDefault.nodo = +this.configuracionDefault.nodo;
      if (this.configuracionDefault.nodo <= 0) {
        this.configuracionDefault.nodo = 1;
      }
    }

    if (
      ValoresHelper.isNullOrUndefined(this.configuracionDefault.limiteSuperior) ||
      ValoresHelper.isNullOrUndefined(this.configuracionDefault.limiteInferior)
    ) {
      throw Error('floor and ceil options must be supplied');
    }
    this.configuracionDefault.limiteSuperior = +this.configuracionDefault.limiteSuperior;
    this.configuracionDefault.limiteInferior = +this.configuracionDefault.limiteInferior;

    if (ValoresHelper.isNullOrUndefined(this.configuracionDefault.translate)) {
      this.configuracionDefault.translate = (value: number): string => String(value);
    }
  }

  private reiniciarSlider(): void {
    this.manageElementsStyle();
    this.actualizarLimiteSuperiorLabel();
    this.actualizarLimiteInferiorLabel();
    this.unbindEvents();
    this.manageEventsBindings();
    this.calcularDimensiones();
  }

  // Update each elements style based on options
  private manageElementsStyle(): void {
    this.actualizarEscala();

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

  private actualizarEscala(): void {
    let elements = this.obtenerSliders();
    for (const element of elements) {
      element.setScale(this.configuracionDefault.scale);
    }
  }

  private obtenerSliders(): CustomRangeElementDirective[] {
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

  private inicializarDeslizables(): void {
    this.actualizarDeslizableInferior(this.valorAPosicion(this.vistaValorInferior));
    this.actualizarDeslizableSuperior(this.valorAPosicion(this.vistaValorSuperior));
    this.updateSelectionBar();
  }

  // Calculate dimensions that are dependent on view port size
  // Run once during initialization and every time view port changes size.
  private calcularDimensiones(): void {
    this.minHandleElement.calcularDimension();
    const handleWidth: number = this.minHandleElement.dimension;

    this.handleHalfDimension = handleWidth / 2;
    this.fullBarElement.calcularDimension();

    this.maxHandlePosition = this.fullBarElement.dimension - handleWidth;

    if (this.initHasRun) {
      this.actualizarLimiteInferiorLabel();
      this.actualizarLimiteSuperiorLabel();
      this.inicializarDeslizables();
    }
  }

  private calculateViewDimensionsAndDetectChanges(): void {
    this.calcularDimensiones();
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
  private actualizarLimiteInferiorLabel(): void {
    this.floorLabelElement.setValue(
      this.getDisplayValue(this.configuracionDefault.limiteInferior, TipoLabel.LimiteInferior)
    );
    this.floorLabelElement.calcularDimension();
    this.floorLabelElement.setPosition(0);
  }

  // Update position of the ceiling label
  private actualizarLimiteSuperiorLabel(): void {
    this.ceilLabelElement.setValue(
      this.getDisplayValue(this.configuracionDefault.limiteSuperior, TipoLabel.LimiteSuperior)
    );
    this.ceilLabelElement.calcularDimension();
    const position = this.fullBarElement.dimension - this.ceilLabelElement.dimension;
    this.ceilLabelElement.setPosition(position);
  }

  // Update slider handles and label positions
  private actualizarDeslizables(tipoPunto: TipoPunto, newPos: number): void {
    if (tipoPunto === TipoPunto.Min) {
      this.actualizarDeslizableInferior(newPos);
    } else if (tipoPunto === TipoPunto.Max) {
      this.actualizarDeslizableSuperior(newPos);
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

    if (labelType === TipoPunto.Max) {
      return Math.min(nearHandlePos, endOfBarPos);
    } else {
      return Math.min(Math.max(nearHandlePos, 0), endOfBarPos);
    }
  }

  // Update low slider handle position and label
  private actualizarDeslizableInferior(newPos: number): void {
    this.minHandleElement.setPosition(newPos);
    this.minHandleLabelElement.setValue(
      this.getDisplayValue(this.vistaValorInferior, TipoLabel.ValorInferior)
    );
    this.minHandleLabelElement.setPosition(this.getHandleLabelPos(TipoPunto.Min, newPos));
  }

  // Update high slider handle position and label
  private actualizarDeslizableSuperior(newPos: number): void {
    this.maxHandleElement.setPosition(newPos);
    this.maxHandleLabelElement.setValue(
      this.getDisplayValue(this.vistaValorSuperior, TipoLabel.ValorSuperior)
    );
    this.maxHandleLabelElement.setPosition(this.getHandleLabelPos(TipoPunto.Max, newPos));
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
  }

  // Return the translated value if a translate function is provided else the original value
  private getDisplayValue(value: number, which: TipoLabel): string {
    if (
      !ValoresHelper.isNullOrUndefined(this.configuracionDefault.stepsArray) &&
      !this.configuracionDefault.bindIndexForStepsArray
    ) {
      value = this.obtenerValorNodo(value);
    }
    return this.configuracionDefault.translate(value, which);
  }

  // Round value to step and precision based on minValue
  private redondearNodo(value: number): number {
    let diferenciaNodo: number = MathHelper.roundToPrecisionLimit(
      (value - this.configuracionDefault.limiteInferior) / this.configuracionDefault.nodo,
      this.configuracionDefault.precisionLimit
    );

    diferenciaNodo = Math.round(diferenciaNodo) * this.configuracionDefault.nodo;
    return MathHelper.roundToPrecisionLimit(
      this.configuracionDefault.limiteInferior + diferenciaNodo,
      this.configuracionDefault.precisionLimit
    );
  }

  // Translate value to pixel position
  private valorAPosicion(val: number): number {
    let fn: ValorAPosicionFunction = ValoresHelper.linearValueToPosition;
    if (!ValoresHelper.isNullOrUndefined(this.configuracionDefault.customValueToPosition)) {
      fn = this.configuracionDefault.customValueToPosition;
    }

    val = MathHelper.clampToRange(
      val,
      this.configuracionDefault.limiteInferior,
      this.configuracionDefault.limiteSuperior
    );
    let percent: number = fn(
      val,
      this.configuracionDefault.limiteInferior,
      this.configuracionDefault.limiteSuperior
    );
    if (ValoresHelper.isNullOrUndefined(percent)) {
      percent = 0;
    }
    return percent * this.maxHandlePosition;
  }

  // Translate position to model value
  private positionToValue(position: number): number {
    let percent: number = position / this.maxHandlePosition;
    let fn: PosicionAValorFunction = ValoresHelper.linearPositionToValue;
    if (!ValoresHelper.isNullOrUndefined(this.configuracionDefault.customPositionToValue)) {
      fn = this.configuracionDefault.customPositionToValue;
    }
    const value: number = fn(
      percent,
      this.configuracionDefault.limiteInferior,
      this.configuracionDefault.limiteSuperior
    );
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

  private obtenerDeslizableMasCercano(event: MouseEvent): TipoPunto {
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

    for (const element of this.obtenerSliders()) {
      if (!ValoresHelper.isNullOrUndefined(element)) {
        element.off();
      }
    }
  }

  // onStart event handler
  private onStart(
    tipoPunto: TipoPunto,
    event: MouseEvent,
    bindMove: boolean,
    bindEnd: boolean,
    simulateImmediateMove?: boolean
  ): void {
    event.stopPropagation();
    event.preventDefault();
    this.moving = false;
    this.calcularDimensiones();

    if (ValoresHelper.isNullOrUndefined(tipoPunto)) {
      tipoPunto = this.obtenerDeslizableMasCercano(event);
    }

    this.tipoPuntoActivo = tipoPunto;

    const deslizableElement: CustomRangeHandleDirective = this.obtenerDeslizableElement(tipoPunto);
    deslizableElement.active = true;
    if (bindMove) {
      this.unsubscribeOnMove();

      const onMoveCallback: (e: MouseEvent) => void = (e: MouseEvent): void =>
        this.deslizable.activo ? this.onDragMove(e) : this.onMove(e);

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
  }

  // onMove event handler
  private onMove(event: MouseEvent): void {
    if (this.configuracionDefault.animate && this.moving) {
      this.sliderElementAnimateClass = false;
    }

    this.moving = true;
    const newPos: number = this.getEventPosition(event);
    let newValue: number;
    const ceilValue: number = this.configuracionDefault.limiteSuperior;
    const floorValue: number = this.configuracionDefault.limiteInferior;

    if (newPos <= 0) {
      newValue = floorValue;
    } else if (newPos >= this.maxHandlePosition) {
      newValue = ceilValue;
    } else {
      newValue = this.positionToValue(newPos);
      newValue = this.redondearNodo(newValue);
    }
    this.positionTrackingHandle(newValue);
  }

  private onEnd(event: MouseEvent): void {
    this.moving = false;
    if (this.configuracionDefault.animate) {
      this.sliderElementAnimateClass = true;
    }

    this.deslizable.activo = false;

    this.unsubscribeOnMove();
    this.unsubscribeOnEnd();

    this.userChangeEnd.emit(this.getSliderChange());
  }

  /** Get min value depending on whether the newPos is outOfBounds above or below the bar */
  private getMinValue(newPos: number, outOfBounds: boolean, isAbove: boolean): number {
    let value: number = null;

    if (outOfBounds) {
      if (isAbove) {
        value = this.configuracionDefault.limiteSuperior - this.deslizable.diferencia;
      } else {
        value = this.configuracionDefault.limiteInferior;
      }
    } else {
      value = this.positionToValue(newPos - this.deslizable.limiteInferior);
    }
    return this.redondearNodo(value);
  }

  /** Get max value depending on whether the newPos is outOfBounds above or below the bar */
  private getMaxValue(newPos: number, outOfBounds: boolean, isAbove: boolean): number {
    let value: number = null;

    if (outOfBounds) {
      if (isAbove) {
        value = this.configuracionDefault.limiteSuperior;
      } else {
        value = this.configuracionDefault.limiteInferior + this.deslizable.diferencia;
      }
    } else {
      value = this.positionToValue(newPos - this.deslizable.limiteInferior) + this.deslizable.diferencia;
    }

    return this.redondearNodo(value);
  }

  private onDragMove(event?: MouseEvent): void {
    const newPos: number = this.getEventPosition(event);

    if (this.configuracionDefault.animate && this.moving) {
      this.sliderElementAnimateClass = false;
    }
    this.moving = true;
    let newMinValue = this.getMinValue(newPos, false, false);
    let newMaxValue = this.getMaxValue(newPos, false, false);
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
        newMinValue + this.deslizable.diferencia,
        this.configuracionDefault.precisionLimit
      );
    }
    if (
      !ValoresHelper.isNullOrUndefined(this.configuracionDefault.maxLimit) &&
      newMaxValue > this.configuracionDefault.maxLimit
    ) {
      newMaxValue = this.configuracionDefault.maxLimit;
      newMinValue = MathHelper.roundToPrecisionLimit(
        newMaxValue - this.deslizable.diferencia,
        this.configuracionDefault.precisionLimit
      );
    }

    this.vistaValorInferior = newMinValue;
    this.vistaValorSuperior = newMaxValue;
    this.aplicarCambiosAlModelo();
    this.actualizarDeslizables(TipoPunto.Min, this.valorAPosicion(newMinValue));
    this.actualizarDeslizables(TipoPunto.Max, this.valorAPosicion(newMaxValue));
  }

  // Set the new value and position to the current tracking handle
  private positionTrackingHandle(newValue: number): void {
    newValue = this.applyMinMaxLimit(newValue);
    if (this.tipoPuntoActivo === TipoPunto.Min && newValue > this.vistaValorSuperior) {
      newValue = this.applyMinMaxRange(this.vistaValorSuperior);
    } else if (this.tipoPuntoActivo === TipoPunto.Max && newValue < this.vistaValorInferior) {
      newValue = this.applyMinMaxRange(this.vistaValorInferior);
    }
    newValue = this.applyMinMaxRange(newValue);
    /* This is to check if we need to switch the min and max handles */
    if (this.tipoPuntoActivo === TipoPunto.Min && newValue > this.vistaValorSuperior) {
      this.vistaValorInferior = this.vistaValorSuperior;
      this.aplicarCambiosAlModelo();
      this.actualizarDeslizables(TipoPunto.Min, this.maxHandleElement.position);
      this.tipoPuntoActivo = TipoPunto.Max;
      this.minHandleElement.active = false;
      this.maxHandleElement.active = true;
    } else if (this.tipoPuntoActivo === TipoPunto.Max && newValue < this.vistaValorInferior) {
      this.vistaValorSuperior = this.vistaValorInferior;
      this.aplicarCambiosAlModelo();
      this.actualizarDeslizables(TipoPunto.Max, this.minHandleElement.position);
      this.tipoPuntoActivo = TipoPunto.Min;
      this.maxHandleElement.active = false;
      this.minHandleElement.active = true;
    }

    if (this.getCurrentTrackingValue() !== newValue) {
      if (this.tipoPuntoActivo === TipoPunto.Min) {
        this.vistaValorInferior = newValue;
        this.aplicarCambiosAlModelo();
      } else if (this.tipoPuntoActivo === TipoPunto.Max) {
        this.vistaValorSuperior = newValue;
        this.aplicarCambiosAlModelo();
      }
      this.actualizarDeslizables(this.tipoPuntoActivo, this.valorAPosicion(newValue));
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
      this.tipoPuntoActivo === TipoPunto.Min ? this.vistaValorSuperior : this.vistaValorInferior;
    const diferencia: number = Math.abs(newValue - oppositeValue);
    if (!ValoresHelper.isNullOrUndefined(this.configuracionDefault.minRange)) {
      if (diferencia < this.configuracionDefault.minRange) {
        if (this.tipoPuntoActivo === TipoPunto.Min) {
          return MathHelper.roundToPrecisionLimit(
            this.vistaValorSuperior - this.configuracionDefault.minRange,
            this.configuracionDefault.precisionLimit
          );
        } else if (this.tipoPuntoActivo === TipoPunto.Max) {
          return MathHelper.roundToPrecisionLimit(
            this.vistaValorInferior + this.configuracionDefault.minRange,
            this.configuracionDefault.precisionLimit
          );
        }
      }
    }
    if (!ValoresHelper.isNullOrUndefined(this.configuracionDefault.maxRange)) {
      if (diferencia > this.configuracionDefault.maxRange) {
        if (this.tipoPuntoActivo === TipoPunto.Min) {
          return MathHelper.roundToPrecisionLimit(
            this.vistaValorSuperior - this.configuracionDefault.maxRange,
            this.configuracionDefault.precisionLimit
          );
        } else if (this.tipoPuntoActivo === TipoPunto.Max) {
          return MathHelper.roundToPrecisionLimit(
            this.vistaValorInferior + this.configuracionDefault.maxRange,
            this.configuracionDefault.precisionLimit
          );
        }
      }
    }
    return newValue;
  }

  private getSliderChange(): SliderChange {
    const sliderChange: SliderChange = new SliderChange();
    sliderChange.tipoPunto = this.tipoPuntoActivo;
    sliderChange.valor = +this.valor;
    sliderChange.valorSuperior = +this.valorSuperior;
    return sliderChange;
  }
}
