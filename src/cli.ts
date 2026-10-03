#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { open, record, stats } from "./db";
import { installedSkills } from "./skills";

const { positionals, values } = parseArgs({
    args: Bun.argv.slice(2),
    options: { agent: { type: "string" } },
    allowPositionals: true,
});
const [command, skill] = positionals;

if (command === "record" && skill && values.agent) {
    record(open(), { skill, agent: values.agent });
} else if (command === "stats") {
    const installed = installedSkills();
    const rows = stats(open());
    const used = new Set(rows.map((r) => r.skill));
    for (const skill of installed.keys()) {
        if (!used.has(skill)) {
            rows.push({ skill, d1: 0, d7: 0, d30: 0, d90: 0, d180: 0 });
        }
    }
    console.table(
        rows.map(({ skill, ...counts }) => ({
            skill,
            invocation: installed.get(skill) ?? "-",
            ...counts,
        })),
    );
} else {
    console.error(
        "usage: skillmon record <skill> --agent <name>\n" +
            "       skillmon stats",
    );
    process.exit(1);
}
