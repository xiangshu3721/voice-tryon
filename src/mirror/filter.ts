/**
 * One Euro 滤波：静止时压抖动，快速动作时少拖影。
 * Casiez et al. 2012。每个关键点的 x、y 各用一个。
 */
export class OneEuro {
  private x: number | null = null
  private dx = 0
  private t: number | null = null

  constructor(
    private readonly minCutoff = 1.4,
    private readonly beta = 0.6,
    private readonly dCutoff = 1.0,
  ) {}

  private static alpha(cutoff: number, dt: number) {
    const tau = 1 / (2 * Math.PI * cutoff)
    return 1 / (1 + tau / dt)
  }

  reset() {
    this.x = null
    this.t = null
    this.dx = 0
  }

  /** value 用相对坐标（0–1），time 用毫秒。 */
  filter(value: number, timeMs: number): number {
    if (this.x === null || this.t === null) {
      this.x = value
      this.t = timeMs
      return value
    }
    const dt = Math.max(1e-3, (timeMs - this.t) / 1000)
    this.t = timeMs
    const rawDx = (value - this.x) / dt
    const aD = OneEuro.alpha(this.dCutoff, dt)
    this.dx = aD * rawDx + (1 - aD) * this.dx
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx)
    const a = OneEuro.alpha(cutoff, dt)
    this.x = a * value + (1 - a) * this.x
    return this.x
  }
}

export class PointFilter {
  private fx: OneEuro
  private fy: OneEuro
  constructor(minCutoff?: number, beta?: number) {
    this.fx = new OneEuro(minCutoff, beta)
    this.fy = new OneEuro(minCutoff, beta)
  }
  reset() {
    this.fx.reset()
    this.fy.reset()
  }
  filter(p: { x: number; y: number }, t: number) {
    return { x: this.fx.filter(p.x, t), y: this.fy.filter(p.y, t) }
  }
}
