/**
 * Sliding-window cap on outgoing mail. A mailbox service (Namecheap Private Email) limits how many messages one mailbox may send per
 * hour and per day, and a provider that sees the limit exceeded can block the mailbox. Checkpoint stays under the cap on purpose: when
 * the budget is spent, queued mail simply waits in the outbox for the next window (it is not counted as a failed attempt).
 * One API instance sends, so the counters live in memory (D-11).
 */
export interface SendBudgetLimits {
  perHour: number;
  perDay: number;
}

export class SendBudget {
  private sent: number[] = [];

  constructor(
    private readonly limits: SendBudgetLimits,
    private readonly now: () => number = Date.now,
  ) {}

  private prune(): void {
    const dayAgo = this.now() - 86_400_000;
    while (this.sent.length && this.sent[0] < dayAgo) this.sent.shift();
  }

  hasRoom(): boolean {
    this.prune();
    const hourAgo = this.now() - 3_600_000;
    const lastHour = this.sent.filter((t) => t >= hourAgo).length;
    return lastHour < this.limits.perHour && this.sent.length < this.limits.perDay;
  }

  record(): void {
    this.sent.push(this.now());
  }

  usage(): { lastHour: number; lastDay: number; perHour: number; perDay: number } {
    this.prune();
    const hourAgo = this.now() - 3_600_000;
    return { lastHour: this.sent.filter((t) => t >= hourAgo).length, lastDay: this.sent.length, ...this.limits };
  }
}
