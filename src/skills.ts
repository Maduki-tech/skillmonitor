import { Glob } from "bun";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

type InstalledPlugins = { plugins: Record<string, { installPath: string }[]> };

export type Invocation = "both" | "user" | "agent" | "none";

function invocation(skillMd: string): Invocation {
    const frontmatter = skillMd.split(/^---$/m)[1] ?? "";
    const user = !/^user-invocable:\s*false\s*$/m.test(frontmatter);
    const agent = !/^disable-model-invocation:\s*true\s*$/m.test(frontmatter);
    if (user && agent) return "both";
    return user ? "user" : agent ? "agent" : "none";
}

export function installedSkills(home = homedir()): Map<string, Invocation> {
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
            .map((f): [string, Invocation] => [
                basename(dirname(f)),
                invocation(readFileSync(f, "utf8")),
            ])
            .sort(([a], [b]) => a.localeCompare(b)),
    );
}
