import { Glob } from "bun";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

type InstalledPlugins = { plugins: Record<string, { installPath: string }[]> };

export type Invocation = "both" | "user" | "agent" | "none";

// chars: the body, which a call adds to the conversation.
// listingChars: what every session carries so the model can pick the skill;
// 0 when the model may not run it.
export type Skill = {
    invocation: Invocation;
    chars: number;
    listingChars: number;
};

type Frontmatter = {
    description?: unknown;
    "user-invocable"?: unknown;
    "disable-model-invocation"?: unknown;
};

function parse(name: string, skillMd: string): Skill {
    const [, yaml = "", body = skillMd] =
        skillMd.match(/^---\n(?:([\s\S]*?)\n)?---(?:\n|$)([\s\S]*)$/) ?? [];
    let fm: Frontmatter = {};
    try {
        fm = (Bun.YAML.parse(yaml) as Frontmatter | null) ?? {};
    } catch {} // a broken file still counts as installed
    const user = fm["user-invocable"] !== false;
    const agent = fm["disable-model-invocation"] !== true;
    const description =
        typeof fm.description === "string" ? fm.description : "";
    return {
        invocation:
            user && agent ? "both" : user ? "user" : agent ? "agent" : "none",
        chars: body.trim().length,
        // ponytail: name + description only; Claude Code may add or trim text
        listingChars: agent ? `${name}: ${description}`.length : 0,
    };
}

export function installedSkills(home = homedir()): Map<string, Skill> {
    const claude = join(home, ".claude");
    const pluginsFile = join(claude, "plugins/installed_plugins.json");
    const { plugins }: InstalledPlugins = existsSync(pluginsFile)
        ? JSON.parse(readFileSync(pluginsFile, "utf8"))
        : { plugins: {} };
    const roots = [
        join(claude, "skills"),
        ...Object.values(plugins)
            .flat()
            .map((p) => join(p.installPath, "skills")),
    ];
    const files = roots.flatMap((cwd) =>
        existsSync(cwd)
            ? [
                  ...new Glob("*/SKILL.md").scanSync({
                      cwd,
                      followSymlinks: true,
                      absolute: true,
                  }),
              ]
            : [],
    );
    return new Map(
        files
            .map((f): [string, Skill] => {
                const name = basename(dirname(f));
                return [name, parse(name, readFileSync(f, "utf8"))];
            })
            .sort(([a], [b]) => a.localeCompare(b)),
    );
}
