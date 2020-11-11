import { CustomFixedRange, CustomNormalRange } from '../models';

export class CustomRangeData {
  static customNormalRange: CustomNormalRange = {
    min: 1,
    max: 100
  };

  static customFixedRange: CustomFixedRange = {
    valores: [1.99, 5.99, 10.99, 30.99, 50.99, 70.99]
  };
}
