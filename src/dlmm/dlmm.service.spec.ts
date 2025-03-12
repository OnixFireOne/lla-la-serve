import { Test, TestingModule } from '@nestjs/testing';
import { DlmmService } from './dlmm.service';

describe('DlmmService', () => {
  let service: DlmmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DlmmService],
    }).compile();

    service = module.get<DlmmService>(DlmmService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
