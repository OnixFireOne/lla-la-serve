import { Test, TestingModule } from '@nestjs/testing';
import { SetServiceService } from './set-service.service';

describe('SetServiceService', () => {
  let service: SetServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SetServiceService],
    }).compile();

    service = module.get<SetServiceService>(SetServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
