import { Module } from '@nestjs/common';
import { DefensesController } from './defenses.controller.js';
import { DefensesService } from './defenses.service.js';

@Module({
  controllers: [DefensesController],
  providers: [DefensesService],
  exports: [DefensesService],
})
export class DefensesModule {}
