#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { open, record, stats } from "./db";

const { positionals, values } = parseArgs({
    args: Bun.argv.slice(2),
    options: { agent: { type: "string" } },
    allowPositionals: true,
});
const [command, skill] = positionals;

if (command === "record" && skill && values.agent) {
    record(open(), { skill, agent: values.agent });
} else if (command === "stats") {
    console.table(stats(open()));
} else {
    console.error(
        "usage: skillmon record <skill> --agent <name>\n" +
            "       skillmon stats",
    );
    process.exit(1);
}
