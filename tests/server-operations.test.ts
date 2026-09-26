import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('private service deployment contract',()=>{
  it('has a syntactically valid installer with a harmless help path',()=>{
    const installer=resolve('deploy/install.sh');
    expect(()=>execFileSync('bash',['-n',installer])).not.toThrow();
    expect(execFileSync('bash',[installer,'--help'],{encoding:'utf8'})).toContain('does not start services or alter Caddy');
  });
  it('provides a production wrapper that refuses the wrong identity before loading the app',()=>{
    const wrapper=resolve('deploy/hermesctl');
    expect(()=>execFileSync('sh',['-n',wrapper])).not.toThrow();
    const serviceUser=spawnSync('id',['-u','hermes'],{encoding:'utf8'});
    if(serviceUser.status===0 && Number(serviceUser.stdout.trim())===process.getuid?.()) return;
    const result=spawnSync('sh',[wrapper,'help'],{encoding:'utf8'});
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/private Caminos service account|service account is not installed/);
    expect(result.stdout).toBe('');
  });
  it('fixes production database/runtime and rejects database overrides in the wrapper',()=>{
    const wrapper=readFileSync(resolve('deploy/hermesctl'),'utf8');
    expect(wrapper).toContain('HERMES_DB=/var/lib/hermes/hermes.sqlite');
    expect(wrapper).toContain('HERMES_ORIGIN=https://hermes.andresinbox.tech');
    expect(wrapper).toContain('cd /srv/hermes/current');
    expect(wrapper).toContain('--db|--db=*');
    expect(wrapper).toContain('unset HERMES_ALLOW_HTTP NODE_OPTIONS NODE_PATH TSX_TSCONFIG_PATH ESBUILD_BINARY_PATH');
    expect(wrapper).toContain('exec /opt/hermes/node/bin/node /srv/hermes/current/node_modules/tsx/dist/cli.mjs');
    const installer=readFileSync(resolve('deploy/install.sh'),'utf8');
    expect(installer).toContain('cmp -s "$project_source/deploy/hermesctl" /usr/local/bin/hermesctl');
    expect(installer).toContain('install -m 0755 -o root -g root "$project_source/deploy/hermesctl" /usr/local/bin/hermesctl');
  });
  it('runs API and backup under a private OS identity with narrowly writable paths',()=>{
    const api=readFileSync(resolve('deploy/hermes.service'),'utf8');
    const backup=readFileSync(resolve('deploy/hermes-backup.service'),'utf8');
    for(const unit of [api,backup]) {
      expect(unit).toContain('\nUser=hermes\n');
      expect(unit).toContain('\nGroup=hermes\n');
      expect(unit).toContain('\nUMask=0077\n');
      expect(unit).toContain('\nProtectSystem=strict\n');
      expect(unit).toContain('\nProtectHome=true\n');
      expect(unit).toContain('\nNoNewPrivileges=true\n');
      expect(unit).toContain('InaccessiblePaths=-/var/lib/pirata -/var/backups/pirata -/srv/pirata');
      expect(unit).toContain('-/var/lib/morgan-research -/var/backups/morgan-research -/srv/research');
      expect(unit).toContain('-/var/lib/caddy -/etc/caddy');
    }
    expect(api).toContain('\nReadWritePaths=/var/lib/hermes\n');
    expect(backup).toContain('\nReadWritePaths=/var/lib/hermes /var/backups/hermes\n');
    expect(backup).toContain('/server/cli.ts backup\n');
    expect(backup).toContain('\nPrivateNetwork=true\n');
    const timer=readFileSync(resolve('deploy/hermes-backup.timer'),'utf8');
    expect(timer).toContain('OnCalendar=*-*-* 04:10:00 America/New_York');
    expect(timer).toContain('Persistent=true');
  });
});
