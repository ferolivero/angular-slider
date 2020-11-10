import { InMemoryDbService } from 'angular-in-memory-web-api';
import { CustomFixedRange, CustomNormalRange } from './models/custom-range';
import { CustomRangeData } from './data/custom-range-data';

export class AppData implements InMemoryDbService {
  createDb(): { normal: CustomNormalRange; fixed: CustomFixedRange } {
    const normal = CustomRangeData.customNormalRange;
    const fixed = CustomRangeData.customFixedRange;
    return { normal, fixed };
  }
}
