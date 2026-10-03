import type { Register } from "claude-code";

export const register: Register = (on) => {
    on("skill.prompt", async ($, e, next) => {
        const argv = ["skillmon", "record", e.skill, "--agent", "claude-code"];
        const { exitCode, stderr } = await $.process.run(argv);
        if (exitCode !== 0) $.ui.toast(`skillmon failed: ${stderr}`);
        return next(e);
    });
};
