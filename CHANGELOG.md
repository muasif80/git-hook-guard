# Change Log

## 0.0.1
- Initial release.
- Auto-scan opened Git repositories for malicious hooks on startup.
- Detects shortened URLs, pipe-to-shell, hidden background exec, base64 payloads,
  Windows LOLBins, PowerShell IEX/IWR, encoded commands, reverse shells, and
  `core.hooksPath` overrides.
- One-click quarantine (renames hooks to `*.quarantined`) and manual scan/quarantine commands.
