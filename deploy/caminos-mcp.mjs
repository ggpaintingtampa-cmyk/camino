#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const project = process.env.CAMINOS_PROJECT ?? process.env.HERMES_PROJECT ?? '/home/andre/Desktop/LargeConcierge/Hermes';
const nodeBin = process.env.CAMINOS_NODE_BIN ?? process.env.HERMES_NODE_BIN ?? '/home/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin';
const pnpm = process.env.CAMINOS_PNPM ?? process.env.HERMES_PNPM ?? '/home/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pnpm/bin/pnpm.cjs';
const path = `${nodeBin}:${process.env.PATH ?? ''}`;

const tools = [
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

function send(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function textResult(text) {
  return { content: [{ type: 'text', text }] };
}

function runCaminos(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [pnpm, 'exec', 'tsx', 'server/cli.ts', ...args], {
      cwd: project,
      env: { ...process.env, PATH: path },
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
    if (input) child.stdin.end(input);
    else child.stdin.end();
  });
}

async function callTool(name, args = {}) {
  // Existing connected clients may still use the previous tool names.
  name = name?.replace(/^hermes_/, 'caminos_');
  if (name === 'caminos_snapshot') return textResult(await runCaminos(['snapshot']));
  if (name === 'caminos_export') return textResult(await runCaminos(['export']));
  if (name === 'caminos_command') {
    const envelope = {
      requestId: args.requestId ?? randomUUID(),
      baseRevision: args.baseRevision,
      command: args.command,
    };
    const file = join(tmpdir(), `caminos-command-${randomUUID()}.json`);
    await writeFile(file, `${JSON.stringify(envelope)}\n`, { mode: 0o600, flag: 'wx' });
    try {
      return textResult(await runCaminos(['command', '--file', file]));
    } finally {
      await unlink(file).catch(() => {});
    }
  }
  throw new Error(`Unknown Caminos tool: ${name}`);
}

process.stdin.setEncoding('utf8');
let buffer = '';
process.stdin.on('data', chunk => {
  buffer += chunk;
  for (;;) {
    const index = buffer.indexOf('\n');
    if (index < 0) break;
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!line) continue;
    void handleLine(line);
  }
});

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
