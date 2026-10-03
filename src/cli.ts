#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { events, open, record, stats } from "./db";
import { installedSkills } from "./skills";

const { positionals, values } = parseArgs({
    args: Bun.argv.slice(2),
    options: { agent: { type: "string" }, chars: { type: "string" } },
    allowPositionals: true,
});
const [command, skill] = positionals;

const chars = values.chars === undefined ? null : Number(values.chars);

if (
    command === "record" &&
    skill &&
    values.agent &&
    (chars === null || (Number.isInteger(chars) && chars >= 0))
) {
    record(open(), { skill, agent: values.agent, chars });
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
            invocation: installed.get(skill)?.invocation ?? "-",
            ...counts,
        })),
    );
} else if (command === "web") {
    const db = open();
    const server = Bun.serve({
        hostname: "localhost",
        port: 7171,
        routes: {
            "/": () => new Response(Bun.file(`${import.meta.dir}/web.html`)),
            "/api/data": () =>
                Response.json({
                    events: events(db),
                    skills: Object.fromEntries(installedSkills()),
                }),
        },
    });
    console.log(`skillmon web on ${server.url} (Ctrl+C to stop)`);
    Bun.spawn([
        process.platform === "darwin" ? "open" : "xdg-open",
        server.url.href,
    ]);
} else {
    console.error(
        "usage: skillmon record <skill> --agent <name> [--chars <n>]\n" +
            "       skillmon stats\n" +
            "       skillmon web",
    );
    process.exit(1);
}
