import { Test, TestingModule } from '@nestjs/testing';
import { DlmmApiService } from './dlmm-api.service';

describe('DlmmApiService', () => {
  let service: DlmmApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DlmmApiService],
    }).compile();

    service = module.get<DlmmApiService>(DlmmApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
