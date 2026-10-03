import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installedSkills } from "./skills";

test("finds user skills and installed plugin skills, nothing else", () => {
    const home = mkdtempSync(join(tmpdir(), "skillmon-"));
    const skill = (dir: string) => {
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, "SKILL.md"), "");
    };
    const plugin = join(home, ".claude/plugins/cache/p/p/1.0");

    skill(join(home, ".claude/skills/mine"));
    skill(join(home, ".agents/skills/linked"));
    symlinkSync(
        join(home, ".agents/skills/linked"),
        join(home, ".claude/skills/linked"),
    );
    mkdirSync(join(home, ".claude/skills/not-a-skill"));
    skill(join(plugin, "skills/from-plugin"));
    skill(join(home, ".claude/plugins/cache/old/old/0.1/skills/uninstalled"));
    writeFileSync(
        join(home, ".claude/plugins/installed_plugins.json"),
        JSON.stringify({ plugins: { "p@p": [{ installPath: plugin }] } }),
    );

    expect(installedSkills(home)).toEqual(["from-plugin", "linked", "mine"]);
});
