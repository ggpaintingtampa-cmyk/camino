#!/usr/bin/env node
import { spawn as nodeSpawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { lstatSync, realpathSync } from 'node:fs';
import { writeFile, unlink } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const DEFAULT_PROJECT = '/home/andre/Desktop/LargeConcierge/Hermes';
const DEFAULT_NODE_BIN = '/home/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin';
const DEFAULT_PNPM = '/home/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pnpm/bin/pnpm.cjs';
// The bridge reads and applies commands. It never initializes or migrates a database.
const ACTIONS = ['snapshot', 'export', 'command'];

export const tools = [
  {
    name: 'caminos_snapshot',
    description: 'Read the current Caminos records and revision using caminosctl snapshot.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'caminos_export',
    description: 'Export Caminos owner records without credentials or sessions.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'caminos_command',
    description: 'Apply one validated Caminos CommandEnvelope. Read caminos_snapshot first and use its baseRevision.',
    inputSchema: {
      type: 'object',
      properties: {
        requestId: { type: 'string', description: 'Optional stable request id. Reuse for uncertain retries.' },
        baseRevision: { type: 'number', description: 'Revision from caminos_snapshot.' },
        command: { type: 'object', description: 'Command matching shared/schema.ts.' },
      },
      required: ['baseRevision', 'command'],
      additionalProperties: false,
    },
  },
];

function textResult(text) {
  return { content: [{ type: 'text', text }] };
}

/** The project directory, runtime and database path the bridge will use. Reads nothing from disk. */
export function bridgeSettings(env = process.env) {
  const project = env.CAMINOS_PROJECT ?? env.HERMES_PROJECT ?? DEFAULT_PROJECT;
  if (!isAbsolute(project)) throw new Error('The Caminos project directory must be an absolute path.');
  const configured = env.CAMINOS_DB ?? env.HERMES_DB;
  // A relative configured path is refused: resolving it would depend on where the bridge was started.
  if (configured !== undefined && !isAbsolute(configured)) throw new Error('The configured Caminos database path must be absolute.');
  return {
    project,
    nodeBin: env.CAMINOS_NODE_BIN ?? env.HERMES_NODE_BIN ?? DEFAULT_NODE_BIN,
    pnpm: env.CAMINOS_PNPM ?? env.HERMES_PNPM ?? DEFAULT_PNPM,
    db: configured ?? join(project, '.data', 'hermes.sqlite'),
  };
}

/** Fails unless the path is an existing regular file that is not a symbolic link. Creates nothing. */
export function assertDatabaseFile(db) {
  const entry = lstatSync(db, { throwIfNoEntry: false });
  if (!entry) throw new Error('No Caminos database exists at the configured path. Nothing was created.');
  if (entry.isSymbolicLink()) throw new Error('The Caminos database path must not be a symbolic link.');
  if (!entry.isFile()) throw new Error('The Caminos database path is not a regular file.');
}

/** The complete caminosctl argument list. Tool arguments never become flags. */
export function buildCliArguments(action, db, file) {
  if (!ACTIONS.includes(action)) throw new Error('The Caminos bridge only reads snapshots, exports records and applies commands.');
  if (typeof db !== 'string' || !isAbsolute(db)) throw new Error('The Caminos database path must be absolute.');
  if (action !== 'command') return [action, '--db', db];
  if (typeof file !== 'string' || !isAbsolute(file)) throw new Error('A command needs an absolute envelope file.');
  return ['command', '--file', file, '--db', db];
}

export function createBridge({ env = process.env, spawn = nodeSpawn, send = value => { process.stdout.write(`${JSON.stringify(value)}\n`); } } = {}) {
  function runCaminos(action, file) {
    return new Promise((resolve, reject) => {
      const settings = bridgeSettings(env);
      assertDatabaseFile(settings.db);
      const child = spawn(process.execPath, [settings.pnpm, 'exec', 'tsx', 'server/cli.ts', ...buildCliArguments(action, settings.db, file)], {
        cwd: settings.project,
        env: { ...env, PATH: `${settings.nodeBin}:${env.PATH ?? ''}` },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', chunk => { stdout += chunk; });
      child.stderr.on('data', chunk => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', code => {
        if (code === 0) resolve(stdout.trim());
        else reject(new Error((stderr || stdout || `caminosctl exited ${code}`).trim()));
      });
      child.stdin.end();
    });
  }

  async function callTool(name, args = {}) {
    // Existing connected clients may still use the previous tool names.
    name = name?.replace(/^hermes_/, 'caminos_');
    if (name === 'caminos_snapshot') return textResult(await runCaminos('snapshot'));
    if (name === 'caminos_export') return textResult(await runCaminos('export'));
    if (name === 'caminos_command') {
      // Checked first so a refused call leaves no envelope file behind.
      assertDatabaseFile(bridgeSettings(env).db);
      const envelope = {
        requestId: args.requestId ?? randomUUID(),
        baseRevision: args.baseRevision,
        command: args.command,
      };
      const file = join(tmpdir(), `caminos-command-${randomUUID()}.json`);
      await writeFile(file, `${JSON.stringify(envelope)}\n`, { mode: 0o600, flag: 'wx' });
      try {
        return textResult(await runCaminos('command', file));
      } finally {
        await unlink(file).catch(() => {});
      }
    }
    throw new Error(`Unknown Caminos tool: ${name}`);
  }

  async function handleLine(line) {
    let message;
    try {
      message = JSON.parse(line);
      if (message.method === 'initialize') {
        send({
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: message.params?.protocolVersion ?? '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'caminos-local', version: '1.0.0' },
          },
        });
      } else if (message.method === 'notifications/initialized') {
        return;
      } else if (message.method === 'tools/list') {
        send({ jsonrpc: '2.0', id: message.id, result: { tools } });
      } else if (message.method === 'tools/call') {
        const result = await callTool(message.params?.name, message.params?.arguments ?? {});
        send({ jsonrpc: '2.0', id: message.id, result });
      } else if (message.id !== undefined) {
        send({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `Unsupported method: ${message.method}` } });
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Caminos MCP request failed.';
      send({ jsonrpc: '2.0', id: message?.id ?? null, error: { code: -32000, message: messageText } });
    }
  }

  return { callTool, handleLine };
}

/** Starts the stdio loop. Importing this module starts nothing. */
export function start(options = {}) {
  const bridge = createBridge(options);
  const input = options.input ?? process.stdin;
  input.setEncoding('utf8');
  let buffer = '';
  input.on('data', chunk => {
    buffer += chunk;
    for (;;) {
      const index = buffer.indexOf('\n');
      if (index < 0) break;
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      void bridge.handleLine(line);
    }
  });
  return bridge;
}

function runDirectly() {
  const entry = process.argv[1];
  try { return !!entry && realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}
if (runDirectly()) start();
