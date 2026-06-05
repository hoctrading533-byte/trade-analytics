import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalculateDailyScoresCommand } from '../commands/calculate-daily-scores.command';
import { BehaviorInsight } from '../../domain/entities/behavior-insight.entity';
// import { AIInsightEngine } from '../../domain/services/ai-insight.engine';

@CommandHandler(CalculateDailyScoresCommand)
export class CalculateDailyScoresHandler implements ICommandHandler<CalculateDailyScoresCommand> {
  constructor(
    @InjectRepository(BehaviorInsight)
    private readonly insightRepo: Repository<BehaviorInsight>,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: CalculateDailyScoresCommand): Promise<void> {
    const { accountId, recordDate } = command;

    console.log(`[CQRS] Executing CalculateDailyScoresCommand for Account ${accountId}`);

    // 1. Fetch trades from DB (Domain Repository)
    // 2. Pass to AIInsightEngine (Domain Service)
    // 3. Save Insights to DB
    // 4. Publish Domain Events for WebSockets
    
    /* 
      const engine = new AIInsightEngine(...);
      const insights = engine.generate();
      await this.insightRepo.save(insights);
      
      const event = this.publisher.mergeObjectContext(new PsychologyUpdatedEvent(accountId));
      event.commit();
    */
  }
}
