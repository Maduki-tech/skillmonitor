import { expect, test } from "bun:test";
import { open, record, stats } from "./db";

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
