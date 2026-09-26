import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createApp} from '../server/app';

it('serves a linked, standalone install manifest and real icons without exposing private data',async()=>{
  const app=await createApp({dbPath:':memory:',origin:'https://caminos.test',staticDir:resolve('public')});
  try {
    expect(readFileSync('index.html','utf8')).toContain('rel="manifest" href="/manifest.webmanifest"');
    const response=await app.inject('/manifest.webmanifest');
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('manifest+json');
    const manifest=response.json();
    expect(manifest).toMatchObject({name:'Caminos by Morgan',short_name:'Caminos',id:'/',start_url:'/#/home',scope:'/',display:'standalone',prefer_related_applications:false});
    for(const size of [192,512]) {
      const icon=manifest.icons.find((i:{sizes:string})=>i.sizes===`${size}x${size}`);
      const result=await app.inject(icon.src);
      expect(result.statusCode).toBe(200);
      expect(result.headers['content-type']).toContain('image/png');
      expect(result.rawPayload.readUInt32BE(16)).toBe(size);
      expect(result.rawPayload.readUInt32BE(20)).toBe(size);
    }
    expect((await app.inject('/api/snapshot')).statusCode).toBe(401);
  } finally {await app.close();}
});
