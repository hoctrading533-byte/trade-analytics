export class CalculateDailyScoresCommand {
  constructor(
    public readonly accountId: number,
    public readonly recordDate: Date,
  ) {}
}
