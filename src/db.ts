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
        ts INTEGER NOT NULL,
        chars INTEGER
    )`);
    // Databases from before chars existed. Racing sessions may both try, so
    // "already there" is fine.
    try {
        db.run("ALTER TABLE events ADD COLUMN chars INTEGER");
    } catch (e) {
        if (!String(e).includes("duplicate column")) throw e;
    }
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
        chars = null,
    }: { skill: string; agent: string; ts?: number; chars?: number | null },
) {
    db.run("INSERT INTO events (skill, agent, ts, chars) VALUES (?, ?, ?, ?)", [
        skill.replace(/^.*:/, ""),
        agent,
        ts,
        chars,
    ]);
}

// ponytail: sends the whole history; filter by ts in SQL if it ever gets slow
export function events(db: Database) {
    return db
        .query<{ skill: string; ts: number; chars: number | null }, []>(
            "SELECT skill, ts, chars FROM events ORDER BY ts",
        )
        .all();
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
