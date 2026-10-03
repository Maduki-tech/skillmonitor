import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installedSkills } from "./skills";

test("finds user and installed plugin skills with who may invoke them and their size", () => {
    const home = mkdtempSync(join(tmpdir(), "skillmon-"));
    const skill = (dir: string, frontmatter = "") => {
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, "SKILL.md"), `---\n${frontmatter}---\nbody`);
    };
    const plugin = join(home, ".claude/plugins/cache/p/p/1.0");

    skill(join(home, ".claude/skills/mine"), "description: Does a thing\n");
    skill(join(home, ".claude/skills/bare"));
    skill(join(home, ".agents/skills/linked"), "user-invocable: false\n");
    symlinkSync(
        join(home, ".agents/skills/linked"),
        join(home, ".claude/skills/linked"),
    );
    mkdirSync(join(home, ".claude/skills/not-a-skill"));
    skill(
        join(plugin, "skills/from-plugin"),
        "disable-model-invocation: true\n",
    );
    skill(join(home, ".claude/plugins/cache/old/old/0.1/skills/uninstalled"));
    writeFileSync(
        join(home, ".claude/plugins/installed_plugins.json"),
        JSON.stringify({ plugins: { "p@p": [{ installPath: plugin }] } }),
    );

    // body is "body" (4 chars); listings are "name: description"
    expect(installedSkills(home)).toEqual(
        new Map([
            ["bare", { invocation: "both", chars: 4, listingChars: 6 }],
            ["from-plugin", { invocation: "user", chars: 4, listingChars: 0 }],
            ["linked", { invocation: "agent", chars: 4, listingChars: 8 }],
            ["mine", { invocation: "both", chars: 4, listingChars: 18 }],
        ]),
    );
});
