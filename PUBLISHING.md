# Publishing Git Hook Guard to the VS Code Marketplace

You do NOT need to publish to use the extension locally. This is only for sharing it
publicly. Two registries exist:
- **VS Code Marketplace** (Microsoft) — what the built-in Extensions view searches.
- **Open VSX** (open-vsx.org) — used by VSCodium, Cursor, Gitpod, Eclipse Theia.
Publishing to both is common. Steps for each are below.

---

## A. VS Code Marketplace (via `vsce`)

### 1. Install the packaging tool
```
npm install -g @vscode/vsce
```
(Requires Node.js + npm.)

### 2. Create a publisher
The Marketplace ties identity to **Azure DevOps**.
1. Sign in at https://dev.azure.com with a Microsoft account (create a free org if prompted).
2. Go to https://marketplace.visualstudio.com/manage and **Create publisher**.
   - Pick a unique **Publisher ID** (lowercase, e.g. `masif-tools`) and a display name.
3. Put that Publisher ID into `package.json` -> `"publisher"` (replace `REPLACE_WITH_YOUR_PUBLISHER_ID`).

### 3. Create a Personal Access Token (PAT)
1. In Azure DevOps: top-right avatar -> **Personal access tokens** -> **New Token**.
2. **Organization:** "All accessible organizations".
3. **Scopes:** click "Show all scopes" -> **Marketplace** -> check **Manage**.
4. Set an expiration, create it, and **copy the token now** (shown once).

### 4. Finish package.json (required/recommended fields)
- `name` (unique within your publisher), `version`, `publisher`, `engines.vscode` — required.
- `displayName`, `description`, `categories`, `keywords` — for discovery.
- `repository`, `license` (+ a LICENSE file), `README.md` — strongly recommended.
- `icon` — a 128x128 PNG (optional but recommended). If you add `"icon": "icon.png"`, the file must exist.

### 5. Log in and publish
```
vsce login <your-publisher-id>      # paste the PAT when asked
vsce package                        # optional: builds a .vsix to test locally
code --install-extension git-hook-guard-0.0.1.vsix   # local test
vsce publish                        # publishes the version in package.json
```
Version bumps (auto-edits package.json + git tag): `vsce publish patch` | `minor` | `major`.
Non-interactive/CI: `vsce publish -p <PAT>`.

### 6. Verify
Your page appears at `https://marketplace.visualstudio.com/items?itemName=<publisher>.git-hook-guard`
(may take a few minutes). Install with `code --install-extension <publisher>.git-hook-guard`.

---

## B. Open VSX (for VSCodium / Cursor / Gitpod)
```
npm install -g ovsx
```
1. Sign in at https://open-vsx.org with GitHub, create an access token (Settings).
2. Create your namespace: `ovsx create-namespace <your-publisher-id> -p <token>`
3. Publish: `ovsx publish git-hook-guard-0.0.1.vsix -p <token>`

---

## Common gotchas
- **Publisher mismatch:** `package.json`.publisher must equal your created Publisher ID.
- **Name collision:** `name` must be unique under your publisher.
- **PAT scope:** must be Marketplace **Manage**, org = "All accessible organizations".
- **Missing repository/LICENSE:** `vsce` warns; add them or pass `--allow-missing-repository`.
- **Icon listed but absent:** `vsce` errors. Either add `icon.png` or remove the `icon` field.
- **Don't hand-craft the .vsix for real publishing** — always use `vsce package`/`vsce publish`,
  which generates the manifest from `package.json`. (The hand-built .vsix in this repo's history
  was only a local shortcut.)
- **Secrets:** never commit your PAT. Keep it out of the repo and CI logs.
- **Updating:** bump `version`, run `vsce publish` (and `ovsx publish`) again.
