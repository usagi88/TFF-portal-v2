// src/lib/overall.ts
import { CANONICAL_TEAMS, toCanonical } from './teamCanon';

export type Match = {
  home?: string;
  away?: string;
  homeScore?: number;
  awayScore?: number;
  bye?: string;
  byeScore?: number;
};

export type OverallRow = { team: string; week: number; season: number };

type ResultsByWeek = Record<string, Match[] | undefined>;
type NumMap = Map<string, number>;

const zeroMap = (keys: string[]): NumMap => new Map<string, number>(keys.map((k) => [k, 0]));

function totalsUpToWeek(results: ResultsByWeek, weekMax: number): NumMap {
  const totals: NumMap = zeroMap(CANONICAL_TEAMS);
  for (let w = 1; w <= weekMax; w++) {
    const wk: Match[] = results[`week${w}`] || [];
    wk.forEach((m: Match) => {
      if (m.bye && typeof m.byeScore === 'number') {
        const t = toCanonical(m.bye);
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
  results: ResultsByWeek,
  currentWeek: number
): { rows: OverallRow[]; prevPos: Map<string, number>; unmapped: string[] } {
  const seasonTotals: NumMap = totalsUpToWeek(results, currentWeek);
  const prevTotals: NumMap =
    currentWeek > 1 ? totalsUpToWeek(results, currentWeek - 1) : zeroMap(CANONICAL_TEAMS);

  // current-week only
  const weekPts: NumMap = zeroMap(CANONICAL_TEAMS);
  const wk: Match[] = results[`week${currentWeek}`] || [];
  wk.forEach((m: Match) => {
    if (m.bye && typeof m.byeScore === 'number') {
      const t = toCanonical(m.bye);
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

  // previous positions (for Move)
  const prevSorted: Array<{ team: string; pts: number }> = CANONICAL_TEAMS.map((team: string) => ({
    team,
    pts: prevTotals.get(team) ?? 0,
  })).sort((a: { pts: number; team: string }, b: { pts: number; team: string }) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    return a.team.localeCompare(b.team);
  });

  const prevPos: Map<string, number> = new Map<string, number>();
  prevSorted.forEach((r: { team: string; pts: number }, i: number) => prevPos.set(r.team, i + 1));

  // rows for render
  const rows: OverallRow[] = CANONICAL_TEAMS.map((team: string) => ({
    team,
    week: weekPts.get(team) ?? 0,
    season: seasonTotals.get(team) ?? 0,
  })).sort((a: OverallRow, b: OverallRow) => {
    if (b.season !== a.season) return b.season - a.season;
    if (b.week !== a.week) return b.week - a.week;
    return a.team.localeCompare(b.team);
  });

  // any unmapped raw strings (to help extend TEAM_ALIAS_MAP)
  const unmappedSet: Set<string> = new Set<string>();
  for (let w = 1; w <= currentWeek; w++) {
    const wk2: Match[] = results[`week${w}`] || [];
    wk2.forEach((m: Match) => {
      [m.home, m.away, m.bye].forEach((raw) => {
        if (raw && !toCanonical(raw)) unmappedSet.add(raw);
      });
    });
  }

  return { rows, prevPos, unmapped: Array.from(unmappedSet) };
}
