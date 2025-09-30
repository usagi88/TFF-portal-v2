import React, { useEffect, useMemo, useState } from 'react';
import { CANONICAL_TEAMS } from '../lib/teamCanon';
import fixtures from '../data/fixtures.json';
import { toCanonical } from '../lib/teamCanon';


type Match = {
  home?: string;
  away?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  bye?: string;
  byeScore?: number | null;
};

function broadcastResultsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('tff-results-updated'));
  }
}

type ResultsByWeek = Record<string, Match[] | undefined>;

const LS_POINTS_KEY = 'tff_week_points';
const LS_RESULTS_KEY = 'tff_results';

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function getWeekKeys(): number[] {
  return Object.keys(fixtures as Record<string, unknown>)
    .filter((k) => k.startsWith('week'))
    .map((k) => Number(k.replace('week', '')))
    .sort((a, b) => a - b);
}

export default function ManualResults({ onUpdate }: { onUpdate: () => void }) {
  const weekKeys = useMemo(() => getWeekKeys(), []);
  const [selectedWeek, setSelectedWeek] = useState<number>(weekKeys[0] ?? 1);

  const [pointsStore, setPointsStore] = useState<Record<number, Record<string, number>>>({});
  const [currentWeekPoints, setCurrentWeekPoints] = useState<Record<string, number>>({});

  useEffect(() => {
    const fromLS = readJSON<Record<number, Record<string, number>>>(LS_POINTS_KEY, {});
    setPointsStore(fromLS);
  }, []);

  useEffect(() => {
    const wk = pointsStore[selectedWeek] || {};
    const seed: Record<string, number> = {};
    CANONICAL_TEAMS.forEach((t) => {
      seed[t] = typeof wk[t] === 'number' ? wk[t] : 0;
    });
    setCurrentWeekPoints(seed);
  }, [pointsStore, selectedWeek]);

  const setScore = (team: string, value: string) => {
    const n = value === '' ? 0 : Number(value);
    const safe = Number.isFinite(n) && n >= 0 ? n : 0;
    setCurrentWeekPoints((prev) => ({ ...prev, [team]: safe }));
  };

const synthesizeWeekResults = (
  week: number,
  teamPts: Record<string, number>
): Match[] => {
  const fx = ((fixtures as any)[`week${week}`] || []) as Array<any>;

  // helper to safely fetch a team’s points using canonical mapping
  const getPts = (rawName: string | undefined): number => {
    if (!rawName) return 0;
    const canon = toCanonical(rawName);
    if (canon && typeof teamPts[canon] === 'number') return teamPts[canon];
    // fallback: if someone keyed LS by raw fixture name previously
    if (typeof teamPts[rawName] === 'number') return teamPts[rawName];
    return 0;
  };

  return fx.map((f) => {
    if (f.bye) {
      // Keep original fixture team string in results, but resolve points via canonical
      const byeTeam = String(f.bye);
      return {
        bye: byeTeam,
        byeScore: getPts(byeTeam),
      };
    }
    const home = String(f.home);
    const away = String(f.away);
    return {
      home,               // keep original fixture label for display consistency
      away,
      homeScore: getPts(home), // resolve using canonical so input matches
      awayScore: getPts(away),
    };
  });
};


  const handleSave = () => {
    const nextStore = { ...pointsStore, [selectedWeek]: { ...currentWeekPoints } };
    setPointsStore(nextStore);
    writeJSON(LS_POINTS_KEY, nextStore);

    const existingResults = readJSON<ResultsByWeek>(LS_RESULTS_KEY, {});
    const weekArr = synthesizeWeekResults(selectedWeek, currentWeekPoints);
    const updated: ResultsByWeek = { ...existingResults, [`week${selectedWeek}`]: weekArr };
    writeJSON(LS_RESULTS_KEY, updated);

    onUpdate();
    broadcastResultsUpdated();
  };

  const handleClearWeek = () => {
    const nextStore = { ...pointsStore };
    delete nextStore[selectedWeek];
    setPointsStore(nextStore);
    writeJSON(LS_POINTS_KEY, nextStore);

    const existingResults = readJSON<ResultsByWeek>(LS_RESULTS_KEY, {});
    delete existingResults[`week${selectedWeek}`];
    writeJSON(LS_RESULTS_KEY, existingResults);

    onUpdate();
    broadcastResultsUpdated();
  };

  const totalEntered = Object.values(currentWeekPoints).filter((n) => typeof n === 'number').length;
  const zeroCount = Object.values(currentWeekPoints).filter((n) => n === 0).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">Week:</label>
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
          className="border rounded-md px-3 py-2 text-sm"
        >
          {weekKeys.map((w) => (
            <option key={w} value={w}>
              Week {w}
            </option>
          ))}
        </select>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          Save Week {selectedWeek}
        </button>

        <button
          onClick={handleClearWeek}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-200 text-gray-900 text-sm hover:bg-gray-300"
        >
          Clear Week {selectedWeek}
        </button>

        <span className="ml-auto text-xs text-gray-600">
          Entered: {totalEntered} / 26 &nbsp;•&nbsp; Zeroes: {zeroCount}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CANONICAL_TEAMS.map((team) => {
          const val = currentWeekPoints[team] ?? 0;
          const isEmpty = val === 0;
          return (
            <label
              key={team}
              className={
                'p-3 rounded-md border flex items-center justify-between ' +
                (isEmpty ? 'bg-yellow-50 border-yellow-200' : 'bg-white')
              }
            >
              <span className="text-sm font-medium">{team}</span>
              <input
                type="number"
                min={0}
                step={1}
                value={val}
                onChange={(e) => setScore(team, e.target.value)}
                className="w-24 ml-3 border rounded-md px-2 py-1 text-sm text-right"
              />
            </label>
          );
        })}
      </div>

      <div className="mt-4">
        <div className="text-sm font-semibold mb-2">Preview — Week {selectedWeek} (what will be saved to results)</div>
        <div className="space-y-2">
          {(fixtures as any)[`week${selectedWeek}`]?.map((f: any, i: number) =>
            f.bye ? (
              <div key={i} className="p-2 rounded bg-blue-50 border-l-4 border-blue-400 text-sm">
                <strong>BYE:</strong> {f.bye} ({(() => {
  const canonB = toCanonical(f.bye);
  const v = (canonB && currentWeekPoints[canonB] !== undefined)
    ? currentWeekPoints[canonB]
    : (currentWeekPoints[f.bye] ?? 0);
  return v;
})()})
              </div>
            ) : (
              <div key={i} className="p-2 rounded bg-gray-50 border-l-4 border-gray-300 text-sm flex justify-between">
                <span>
                  {f.home} vs {f.away}
                </span>
                <span className="font-semibold">
            {(() => {
    const canonH = toCanonical(f.home);
    const canonA = toCanonical(f.away);
    const h = (canonH && currentWeekPoints[canonH] !== undefined) ? currentWeekPoints[canonH] : (currentWeekPoints[f.home] ?? 0);
    const a = (canonA && currentWeekPoints[canonA] !== undefined) ? currentWeekPoints[canonA] : (currentWeekPoints[f.away] ?? 0);
    return `${h}–${a}`;
  })()}
</span>
              </div>
            )
          )}
          {((fixtures as any)[`week${selectedWeek}`] || []).length === 0 && (
            <div className="text-sm text-gray-600">No fixtures defined for Week {selectedWeek}.</div>
          )}
        </div>
      </div>
    </div>
  );
}
