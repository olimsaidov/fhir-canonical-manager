import { expect, test } from "bun:test";
import { build } from "esbuild";

test("the browser entry bundles without filesystem, child process or crypto imports", async () => {
    // A separate process keeps this audit independent of Bun test's module-resolution cache.
    const bundleProcess = Bun.spawn({
        cmd: [
            Bun.argv[0] as string,
            "build",
            new URL("../../../src/browser/index.ts", import.meta.url).pathname,
            "--target=browser",
        ],
        stdout: "pipe",
        stderr: "pipe",
    });
    const [code, errors, exitCode] = await Promise.all([
        new Response(bundleProcess.stdout).text(),
        new Response(bundleProcess.stderr).text(),
        bundleProcess.exited,
    ]);
    expect(exitCode).toBe(0);
    expect(errors).not.toMatch(/error:/);
    expect(code).not.toMatch(/\b(?:from|import)\s*["']node:|\brequire\s*\(["'](?:node:|fs|path|crypto|child_process)/);
    expect(code).not.toContain("createBrowserCanonicalManager");
});

test("the UI module graph excludes archive, index preparation and Node compatibility implementations", async () => {
    const bundle = await build({
        entryPoints: ["src/browser/index.ts"],
        bundle: true,
        platform: "browser",
        write: false,
        metafile: true,
    });
    const inputs = Object.keys(bundle.metafile?.inputs ?? {});
    expect(inputs.length).toBeGreaterThan(0);
    expect(inputs.some((path) => path.includes("src/browser/worker/"))).toBe(false);
    expect(inputs.some((path) => /node_modules\/(?:modern-tar|memfs|@npmcli\/arborist|pacote)\//.test(path))).toBe(
        false,
    );
});
