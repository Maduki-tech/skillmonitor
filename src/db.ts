import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const DAY = 86400;

export type Stats = {
    skill: string;
    d1: number;
    d7: number;
    d30: number;
    d90: number;
    d180: number;
};

export function open(
    path = join(homedir(), ".local/share/skillmon/events.db"),
) {
    mkdirSync(dirname(path), { recursive: true });
    const db = new Database(path);
    db.run("PRAGMA busy_timeout = 5000");
    db.run(`CREATE TABLE IF NOT EXISTS events (
        skill TEXT NOT NULL,
        agent TEXT NOT NULL,
        ts INTEGER NOT NULL
    )`);
    return db;
}

// ponytail: same-named skills from different plugins merge into one row;
// keep the prefix if that ever matters
export function record(
    db: Database,
    {
        skill,
        agent,
        ts = Math.floor(Date.now() / 1000),
    }: { skill: string; agent: string; ts?: number },
) {
    db.run("INSERT INTO events VALUES (?, ?, ?)", [
        skill.replace(/^.*:/, ""),
        agent,
        ts,
    ]);
}

export function stats(
    db: Database,
    now = Math.floor(Date.now() / 1000),
): Stats[] {
    return db
        .query<Stats, [number]>(
            `SELECT skill,
        SUM(ts > ?1 - ${DAY}) AS d1,
        SUM(ts > ?1 - ${7 * DAY}) AS d7,
        SUM(ts > ?1 - ${30 * DAY}) AS d30,
        SUM(ts > ?1 - ${90 * DAY}) AS d90,
        COUNT(*) AS d180
      FROM events WHERE ts > ?1 - ${180 * DAY}
      GROUP BY skill ORDER BY d180 DESC, skill`,
        )
        .all(now);
}
