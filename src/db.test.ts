import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { events, open, record, stats } from "./db";

test("counts each event in exactly the windows it falls inside", () => {
    const db = open(":memory:");
    const now = 1_000_000_000;
    const day = 86400;

    record(db, { skill: "a", agent: "test", ts: now - day + 1 });
    record(db, { skill: "a", agent: "test", ts: now - day });
    record(db, { skill: "a", agent: "test", ts: now - 30 * day });
    record(db, { skill: "a", agent: "test", ts: now - 180 * day });
    record(db, { skill: "pstack:b", agent: "test", ts: now });

    expect(stats(db, now)).toEqual([
        { skill: "a", d1: 1, d7: 2, d30: 2, d90: 3, d180: 3 },
        { skill: "b", d1: 1, d7: 1, d30: 1, d90: 1, d180: 1 },
    ]);
});

test("returns every call oldest first, prefix stripped", () => {
    const db = open(":memory:");

    record(db, { skill: "pstack:b", agent: "test", ts: 20 });
    record(db, { skill: "a", agent: "test", ts: 10 });

    expect(events(db)).toEqual([
        { skill: "a", ts: 10, chars: null },
        { skill: "b", ts: 20, chars: null },
    ]);
});

test("adds chars to a database from before it existed, keeping old rows", () => {
    const path = join(mkdtempSync(join(tmpdir(), "skillmon-")), "events.db");
    const old = new Database(path);
    old.run("CREATE TABLE events (skill TEXT, agent TEXT, ts INTEGER)");
    old.run("INSERT INTO events VALUES ('a', 'test', 10)");
    old.close();

    const db = open(path);
    record(db, { skill: "b", agent: "test", ts: 20, chars: 4000 });
    open(path); // a second open must not fail on the existing column

    expect(events(db)).toEqual([
        { skill: "a", ts: 10, chars: null },
        { skill: "b", ts: 20, chars: 4000 },
    ]);
});
