import { toMinutes } from "./time"

export type Laid<T> = { item: T; lane: number; lanes: number }

/**
 * Side-by-side layout for overlapping intervals (one day): each item gets a
 * lane, and `lanes` is the width of its overlap cluster.
 */
export function layoutLanes<T extends { start: string; end: string }>(items: T[]): Laid<T>[] {
  const sorted = [...items].sort((a, b) => toMinutes(a.start) - toMinutes(b.start) || toMinutes(b.end) - toMinutes(a.end))
  const out: Laid<T>[] = []
  let cluster: Laid<T>[] = []
  let laneEnds: number[] = []
  let clusterEnd = -1

  const flush = () => {
    for (const l of cluster) l.lanes = laneEnds.length
    out.push(...cluster)
    cluster = []
    laneEnds = []
  }

  for (const item of sorted) {
    const start = toMinutes(item.start)
    const end = toMinutes(item.end)
    if (start >= clusterEnd) flush()
    let lane = laneEnds.findIndex((e) => e <= start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = end
    clusterEnd = Math.max(clusterEnd, end)
    cluster.push({ item, lane, lanes: 1 })
  }
  flush()
  return out
}
