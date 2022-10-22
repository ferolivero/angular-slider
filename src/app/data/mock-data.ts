import { FixedData, NormalData } from '../models';

export class MockData {
  static normalData: NormalData = {
    min: 1,
    max: 100
  };

  static fixedData: FixedData = {
    valores: [1.99, 5.99, 10.99, 30.99, 50.99, 70.99]
  };
}
