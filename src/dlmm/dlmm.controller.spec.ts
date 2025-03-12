import { Test, TestingModule } from '@nestjs/testing';
import { DlmmController } from './dlmm.controller';

describe('DlmmController', () => {
  let controller: DlmmController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DlmmController],
    }).compile();

    controller = module.get<DlmmController>(DlmmController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
