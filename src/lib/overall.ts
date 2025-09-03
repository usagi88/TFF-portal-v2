// src/lib/overall.ts
import { CANONICAL_TEAMS, toCanonical } from "./teamCanon";

export type Match = {
  home?: string;
  away?: string;
  homeScore?: number;
  awayScore?: number;
  bye?: string;
  byeScore?: number;
};

export type OverallRow = { team: string; week: number; season: number };

type NumMap = Map<string, number>;
const zeroMap = (keys: string[]): NumMap => new Map(keys.map(k => [k, 0]));

function totalsUpToWeek(results: Record<string, Match[] | undefined>, weekMax: number): NumMap {
  const totals = zeroMap(CANONICAL_TEAMS);
  for (let w = 1; w <= weekMax; w++) {
    const wk = results[`week${w}`] || [];
    wk.forEach((m) => {
      if (m.bye && typeof m.byeScore === 'number') {
        const t = m.bye ? toCanonical(m.bye) : null;
        if (t) totals.set(t, (totals.get(t) || 0) + m.byeScore);
        return;
      }
      if (m.home && typeof m.homeScore === 'number') {
        const t = toCanonical(m.home);
        if (t) totals.set(t, (totals.get(t) || 0) + m.homeScore);
      }
      if (m.away && typeof m.awayScore === 'number') {
        const t = toCanonical(m.away);
        if (t) totals.set(t, (totals.get(t) || 0) + m.awayScore);
      }
    });
  }
  return totals;
}

export function buildOverall(
  results: Record<string, Match[] | undefined>,
  currentWeek: number
): { rows: OverallRow[]; prevPos: Map<string, number>; unmapped: string[] } {
  const seasonTotals = totalsUpToWeek(results, currentWeek);
  const prevTotals = currentWeek > 1 ? totalsUpToWeek(results, currentWeek - 1) : zeroMap(CANONICAL_TEAMS);

  // current week only
  const weekPts = zeroMap(CANONICAL_TEAMS);
  (results[`week${currentWeek}`] || []).forEach((m) => {
    if (m.bye && typeof m.byeScore === 'number') {
      const t = m.bye ? toCanonical(m.bye) : null;
      if (t) weekPts.set(t, (weekPts.get(t) || 0) + m.byeScore);
    } else {
      if (m.home && typeof m.homeScore === 'number') {
        const t = toCanonical(m.home);
        if (t) weekPts.set(t, (weekPts.get(t) || 0) + m.homeScore);
      }
      if (m.away && typeof m.awayScore === 'number') {
        const t = toCanonical(m.away);
        if (t) weekPts.set(t, (weekPts.get(t) || 0) + m.awayScore);
      }
    }
  });

  // previous positions for Move
  const prevSorted = [...CANONICAL_TEAMS]
    .map(team => ({ team, pts: prevTotals.get(team) ?? 0 }))
    .sort((a, b) => (b.pts - a.pts) || a.team.localeCompare(b.team));
  const prevPos = new Map<string, number>();
  prevSorted.forEach((r, i) => prevPos.set(r.team, i + 1));

  const rows: OverallRow[] = CANONICAL_TEAMS.map((team) => ({
    team,
    week: weekPts.get(team) ?? 0,
    season: seasonTotals.get(team) ?? 0,
  })).sort(
    (a, b) => (b.season - a.season) || (b.week - a.week) || a.team.localeCompare(b.team)
  );

  // gather any strings we couldn't map (helps you fill TEAM_ALIAS_MAP fast)
  const unmappedSet = new Set<string>();
  for (let w = 1; w <= currentWeek; w++) {
    (results[`week${w}`] || []).forEach((m) => {
      const candidates = [m.home, m.away, m.bye].filter(Boolean) as string[];
      candidates.forEach((raw) => {
        if (raw && !toCanonical(raw)) unmappedSet.add(raw);
      });
    });
  }

  return { rows, prevPos, unmapped: Array.from(unmappedSet) };
}
