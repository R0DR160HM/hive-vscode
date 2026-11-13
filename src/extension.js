const cp = require('child_process');
const vscode = require('vscode');
const { LanguageClient } = require('vscode-languageclient/node');

// The first release whose compiler is also the language server.
const FIRST = [0, 3, 7];

let client;
let turn = Promise.resolve();

function configured() {
  return vscode.workspace.getConfiguration('hive').get('path') || 'hive';
}

// On Windows `hive` may be a .cmd, which only a shell starts, and one quoted and found on the PATH loses its `%~dp0`.
function launch(command, args) {
  if (process.platform === 'win32') {
    const named = /\s/.test(command) ? `"${command}"` : command;
    return { command: `${named} ${args.join(' ')}`, args: [], options: { shell: true } };
  }
  return { command, args };
}

function versionOf(command) {
  const run = launch(command, ['version']);
  const options = { ...run.options, timeout: 10000, windowsHide: true };
  return new Promise((resolve) => {
    cp.execFile(run.command, run.args, options, (failed, stdout) => {
      resolve(failed ? undefined : String(stdout).trim());
    });
  });
}

function older(version) {
  const written = /^v(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!written) {
    return false;
  }
  for (let i = 0; i < FIRST.length; i++) {
    const part = Number(written[i + 1]);
    if (part !== FIRST[i]) {
      return part < FIRST[i];
    }
  }
  return false;
}

async function complain(message) {
  const chosen = await vscode.window.showErrorMessage(message, 'Open Settings');
  if (chosen) {
    vscode.commands.executeCommand('workbench.action.openSettings', 'hive.path');
  }
}

async function start() {
  // The server reads what a file imports, a git repository included.
  if (!vscode.workspace.isTrusted) {
    return;
  }
  const command = configured();
  const version = await versionOf(command);
  if (version === undefined) {
    complain(`Hive: \`${command}\` could not be run, so there is no language server. Install Hive, or name the compiler in the \`hive.path\` setting.`);
    return;
  }
  if (older(version)) {
    complain(`Hive: \`${command}\` is ${version}, and the language server is in v${FIRST.join('.')} and later. Update it, or name a newer one in the \`hive.path\` setting.`);
    return;
  }
  const started = new LanguageClient('hive', 'Hive', launch(command, ['lsp']), {
    documentSelector: [{ scheme: 'file', language: 'hive' }],
  });
  client = started;
  await started.start();
}

async function stop() {
  const running = client;
  client = undefined;
  if (running) {
    await running.stop().catch(() => {});
  }
}

// One at a time: a restart asked for while the server is still starting waits for it.
function queue(step) {
  turn = turn.then(step).catch((failed) => {
    vscode.window.showErrorMessage(`Hive: the language server did not start. ${failed.message || failed}`);
  });
  return turn;
}

function restart() {
  return queue(async () => {
    await stop();
    await start();
  });
}

exports.activate = function (context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('hive.restartServer', restart),
    vscode.workspace.onDidChangeConfiguration((changed) => {
      if (changed.affectsConfiguration('hive.path')) {
        restart();
      }
    }),
    vscode.workspace.onDidGrantWorkspaceTrust(restart),
  );
  return queue(start);
};

exports.deactivate = function () {
  return queue(stop);
};
