import { Glob } from "bun";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

type InstalledPlugins = { plugins: Record<string, { installPath: string }[]> };

export function installedSkills(home = homedir()): string[] {
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
    const names = roots.flatMap((cwd) =>
        existsSync(cwd)
            ? [
                  ...new Glob("*/SKILL.md").scanSync({
                      cwd,
                      followSymlinks: true,
                  }),
              ]
            : [],
    );
    return [...new Set(names.map((n) => basename(dirname(n))))].sort();
}
