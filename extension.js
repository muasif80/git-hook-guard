'use strict';
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// Patterns that indicate a git hook is doing something malicious.
const DANGER = [
  { re: /bit\.ly|tinyurl\.com|goo\.gl|is\.gd|t\.co\/|cutt\.ly|rebrand\.ly/i, why: 'uses a URL shortener to hide the real destination' },
  { re: /\b(curl|wget)\b[^\n|]*\|\s*(sh|bash|zsh|cmd|powershell|pwsh)\b/i, why: 'downloads code and pipes it straight into a shell' },
  { re: /\|\s*(sh|bash|zsh|cmd|powershell|pwsh)\b/i, why: 'pipes content into a shell interpreter' },
  { re: />\s*\/dev\/null\s*2>&1\s*&/, why: 'runs silently in the background (hides itself)' },
  { re: /base64\s+(-d|--decode)|FromBase64String/i, why: 'decodes a base64-encoded payload' },
  { re: /\b(certutil|bitsadmin|mshta|rundll32|regsvr32)\b/i, why: 'uses a Windows living-off-the-land download/exec tool' },
  { re: /Invoke-WebRequest|Invoke-Expression|\biex\b|\biwr\b|DownloadString|DownloadFile/i, why: 'PowerShell remote download / execute' },
  { re: /-enc(odedcommand)?\s+[A-Za-z0-9+/=]{16,}/i, why: 'runs an encoded PowerShell command' },
  { re: /nc\s+-e|\/dev\/tcp\//i, why: 'opens a reverse shell / raw network connection' }
];

let output;
function log(msg) { if (output) output.appendLine('[' + new Date().toISOString() + '] ' + msg); }

function findGitDir(root) {
  const dotgit = path.join(root, '.git');
  try {
    const st = fs.statSync(dotgit);
    if (st.isDirectory()) return dotgit;
    if (st.isFile()) {
      const txt = fs.readFileSync(dotgit, 'utf8');
      const m = txt.match(/gitdir:\s*(.+)/);
      if (m) {
        let p = m[1].trim();
        if (!path.isAbsolute(p)) p = path.resolve(root, p);
        return p;
      }
    }
  } catch (e) { /* not a repo */ }
  return null;
}

function scanHooksDir(hooksDir) {
  const findings = [];
  let entries;
  try { entries = fs.readdirSync(hooksDir); } catch (e) { return findings; }
  for (const name of entries) {
    if (name.endsWith('.sample') || name.endsWith('.quarantined')) continue;
    const fp = path.join(hooksDir, name);
    let content = '';
    try {
      const st = fs.statSync(fp);
      if (!st.isFile()) continue;
      content = fs.readFileSync(fp, 'utf8');
    } catch (e) { continue; }
    const reasons = [];
    for (const d of DANGER) { if (d.re.test(content)) reasons.push(d.why); }
    findings.push({ file: fp, name: name, dangerous: reasons.length > 0, reasons: reasons });
  }
  return findings;
}

function readHooksPathOverride(gitDir) {
  try {
    const cfg = fs.readFileSync(path.join(gitDir, 'config'), 'utf8');
    const m = cfg.match(/^\s*hooksPath\s*=\s*(.+)$/im);
    if (m) return m[1].trim();
  } catch (e) { /* no config */ }
  return null;
}

function scanFolder(folderPath) {
  const gitDir = findGitDir(folderPath);
  if (!gitDir) return null;
  const res = { folderPath: folderPath, gitDir: gitDir, findings: [], override: null };
  res.findings = scanHooksDir(path.join(gitDir, 'hooks'));
  const ov = readHooksPathOverride(gitDir);
  if (ov) {
    res.override = ov;
    let ovPath = ov;
    if (!path.isAbsolute(ovPath)) ovPath = path.resolve(folderPath, ovPath);
    // Scan the overridden hooks dir too (attackers can point core.hooksPath at a tracked dir).
    for (const f of scanHooksDir(ovPath)) { f.name = '(hooksPath) ' + f.name; res.findings.push(f); }
  }
  return res;
}

function quarantineFile(fp) {
  let target = fp + '.quarantined';
  try {
    if (fs.existsSync(target)) target = fp + '.quarantined-' + Date.now();
    fs.renameSync(fp, target);
    return target;
  } catch (e) {
    log('Failed to quarantine ' + fp + ': ' + e.message);
    return null;
  }
}

function quarantineAll(res, onlyDangerous) {
  let count = 0;
  for (const f of res.findings) {
    if (onlyDangerous && !f.dangerous) continue;
    if (f.name.indexOf('(hooksPath) ') === 0) continue; // handled below by raw path
    if (quarantineFile(f.file)) count++;
  }
  // Handle hooksPath-sourced files by raw path
  for (const f of res.findings) {
    if (f.name.indexOf('(hooksPath) ') !== 0) continue;
    if (onlyDangerous && !f.dangerous) continue;
    if (quarantineFile(f.file)) count++;
  }
  return count;
}

function buildDetail(res, dangerous) {
  const lines = [];
  lines.push('Repository: ' + res.folderPath);
  if (res.override) lines.push('WARNING: core.hooksPath override = ' + res.override);
  lines.push('');
  lines.push('Suspicious hook files:');
  for (const f of dangerous) {
    lines.push('  • ' + f.name + '  —  ' + f.reasons.join('; '));
  }
  lines.push('');
  lines.push('These scripts run automatically on git operations (commit, checkout, merge, push, ...).');
  lines.push('Quarantining renames them to *.quarantined so git can no longer execute them.');
  return lines.join('\n');
}

async function runScan(manual) {
  const cfg = vscode.workspace.getConfiguration('gitHookGuard');
  if (!manual && !cfg.get('scanOnOpen', true)) return;
  const flagAll = cfg.get('flagAllActiveHooks', false);
  const folders = (vscode.workspace.workspaceFolders) || [];
  let hitRepos = 0;

  for (const folder of folders) {
    let res;
    try { res = scanFolder(folder.uri.fsPath); } catch (e) { log('scan error: ' + e.message); continue; }
    if (!res) continue;
    const flagged = res.findings.filter(function (f) { return flagAll ? true : f.dangerous; });
    if (!flagged.length && !res.override) { log('clean: ' + res.folderPath); continue; }
    hitRepos++;
    const dangerous = res.findings.filter(function (f) { return f.dangerous; });
    const showList = dangerous.length ? dangerous : flagged;
    log('FLAGGED ' + res.folderPath + ' -> ' + showList.map(function (f) { return f.name; }).join(', '));

    const title = (dangerous.length ? '⚠ Malicious git hook(s) detected' : '⚠ Active git hook(s) detected') +
      ' in "' + path.basename(res.folderPath) + '"';
    const pick = await vscode.window.showWarningMessage(
      title,
      { modal: true, detail: buildDetail(res, showList) },
      'Quarantine hooks (recommended)',
      'Reveal folder',
      'Ignore'
    );
    if (pick && pick.indexOf('Quarantine') === 0) {
      const n = quarantineAll(res, false);
      vscode.window.showInformationMessage('Git Hook Guard: quarantined ' + n + ' hook file(s) in "' + path.basename(res.folderPath) + '". They can no longer run.');
      log('quarantined ' + n + ' file(s) in ' + res.folderPath);
    } else if (pick === 'Reveal folder') {
      const hooksUri = vscode.Uri.file(path.join(res.gitDir, 'hooks'));
      vscode.commands.executeCommand('revealFileInOS', hooksUri);
    }
  }

  if (manual && hitRepos === 0) {
    vscode.window.showInformationMessage('Git Hook Guard: no suspicious git hooks found in the open workspace.');
  }
}

function activate(context) {
  output = vscode.window.createOutputChannel('Git Hook Guard');
  context.subscriptions.push(output);
  log('Git Hook Guard activated.');

  context.subscriptions.push(vscode.commands.registerCommand('gitHookGuard.scan', function () { runScan(true); }));
  context.subscriptions.push(vscode.commands.registerCommand('gitHookGuard.quarantine', function () {
    const folders = (vscode.workspace.workspaceFolders) || [];
    let total = 0;
    for (const folder of folders) {
      const res = scanFolder(folder.uri.fsPath);
      if (res) total += quarantineAll(res, false);
    }
    vscode.window.showInformationMessage('Git Hook Guard: quarantined ' + total + ' active hook file(s) across the workspace.');
  }));
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(function () { runScan(false); }));

  // Initial scan on startup.
  runScan(false);
}

function deactivate() {}

module.exports = { activate: activate, deactivate: deactivate };
