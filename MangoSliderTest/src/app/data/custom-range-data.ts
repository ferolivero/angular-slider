import { CustomFixedRange, CustomNormalRange } from '../models';

export class CustomRangeData {
  static customNormalRange: CustomNormalRange = {
    min: 15,
    max: 100
  };

  static customFixedRange: CustomFixedRange = {
    values: [1.99, 5.99, 10.99, 30.99, 50.99, 70.99]
  };
}
