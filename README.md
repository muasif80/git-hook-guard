# Git Hook Guard (local VS Code extension)

Automatically scans every Git repository you open in VS Code for **malicious git hooks** —
the `curl | sh` / `bit.ly` style remote-code droppers that scam "coding assessments"
smuggle inside a bundled `.git/` directory. If it finds one, it shows a blocking warning
and offers one-click **quarantine** (renames the hook to `*.quarantined` so git can no
longer run it).

## How it works
- Activates on `onStartupFinished` (every window/folder open) and when folders are added.
- Finds the repo's real git dir (handles `.git` files for worktrees/submodules).
- Reads every non-`.sample` file in `.git/hooks/` and any `core.hooksPath` override target.
- Flags files matching known danger patterns (shortened URLs, pipe-to-shell, hidden
  background exec, base64 payloads, certutil/mshta/bitsadmin, PowerShell IEX/IWR, reverse shells).

## Commands (Ctrl+Shift+P)
- **Git Hook Guard: Scan Workspace for Malicious Hooks**
- **Git Hook Guard: Quarantine Active Hooks in Workspace**

## Settings
- `gitHookGuard.scanOnOpen` (default `true`) — auto-scan on open.
- `gitHookGuard.flagAllActiveHooks` (default `false`) — warn about *any* active hook, not just dangerous-looking ones.

## Note
This is a defense-in-depth layer. The stronger, editor-independent protection is the global
`core.hooksPath` setting (see `~/.githooks-disabled/README.txt`), which stops repo-delivered
hooks from running even when you use git in a terminal.

Un-quarantine (only if you trust the hook): rename `pre-commit.quarantined` back to `pre-commit`.
