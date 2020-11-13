import { InMemoryDbService } from 'angular-in-memory-web-api';
import { FixedData, NormalData } from '../models';
import { MockData } from './mock-data';

export class AppData implements InMemoryDbService {
  createDb(): { normal: NormalData; fixed: FixedData } {
    const normal = MockData.normalData;
    const fixed = MockData.fixedData;
    return { normal, fixed };
  }
}
