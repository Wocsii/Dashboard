/** Small, process-local cache. Pending requests are shared; failures are never cached. */
export class CalendarCache<T> {
  private entries = new Map<string, { expires: number; value: Promise<T> }>()
  constructor(private ttl: number, private limit = 100) {}

  get(key: string, load: () => Promise<T>): Promise<T> {
    const cached = this.entries.get(key)
    if (cached && cached.expires > Date.now()) return cached.value
    this.entries.delete(key)
    for (const [id, entry] of this.entries) {
      if (entry.expires <= Date.now()) this.entries.delete(id)
    }
    if (this.entries.size >= this.limit) this.entries.delete(this.entries.keys().next().value!)
    const value = Promise.resolve().then(load)
    const entry = { expires: Date.now() + this.ttl, value }
    this.entries.set(key, entry)
    void value.catch(() => {
      if (this.entries.get(key) === entry) this.entries.delete(key)
    })
    return value
  }

  delete(key: string) { this.entries.delete(key) }
}
