import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import staticFiles from '@fastify/static';
import argon2 from 'argon2';
import { timingSafeEqual } from 'node:crypto';
import { relative, resolve } from 'node:path';
import { ZodError, z } from 'zod';
import type { CommandEnvelope } from '../shared/types.js';
import { DuplicateRequest, Repository, RevisionConflict, type Session } from './repository.js';
import { WeatherService } from './weather.js';

export interface AppOptions {
  dbPath:string;
  origin:string;
  allowInsecureLocalhost?:boolean;
  staticDir?:string;
  now?:()=>number;
  weather?:Pick<WeatherService,'forecast'|'search'>;
}
export type CaminosApp = FastifyInstance & {repository:Repository};
const safeEqual = (a:string, b:string) => { const left = Buffer.from(a); const right = Buffer.from(b); return left.length === right.length && timingSafeEqual(left,right); };

/** Testable factory. Authentication is never bypassed; tests provision an isolated owner. */
export async function createApp(options:AppOptions):Promise<CaminosApp> {
  const originURL = new URL(options.origin);
  const isLoopback = ['localhost','127.0.0.1','[::1]'].includes(originURL.hostname);
  const insecure = options.allowInsecureLocalhost === true && originURL.protocol === 'http:' && isLoopback;
  if (originURL.origin !== options.origin || (!insecure && originURL.protocol !== 'https:')) throw new Error('Caminos requires an exact HTTPS origin. HTTP is allowed only with an explicit loopback development option.');
  if(options.staticDir && options.dbPath!==':memory:') {
    const databaseRelative=relative(resolve(options.staticDir),resolve(options.dbPath));
    if(!databaseRelative.startsWith('..')) throw new Error('The private database cannot be inside the public asset directory.');
  }
  const now = options.now ?? Date.now;
  const repository = new Repository(options.dbPath);
  const weather = options.weather ?? new WeatherService(repository,fetch,now);
  const app = Fastify({logger:false,bodyLimit:1024*1024,trustProxy:'127.0.0.1'}) as unknown as CaminosApp;
  app.decorate('repository',repository);
  const cookieName = insecure ? 'hermes_dev_session' : '__Host-hermes_session';
  const cookieOptions = {httpOnly:true,secure:!insecure,sameSite:'strict' as const,path:'/'};
  await app.register(cookie);
  const sessionFor = (request:FastifyRequest):Session|undefined => repository.session(request.cookies[cookieName],now());
  const setSession = (reply:FastifyReply, authenticated:boolean) => {
    const result = repository.createSession(authenticated,now());
    reply.setCookie(cookieName,result.raw,{...cookieOptions,maxAge:Math.max(1,Math.floor((result.session.expires-now())/1000))});
    return result.session;
  };
  app.addHook('onRequest', async (request,reply) => {
    reply.header('Cache-Control','no-store, private, max-age=0');
    reply.header('Pragma','no-cache');
    reply.header('X-Content-Type-Options','nosniff');
    reply.header('X-Frame-Options','DENY');
    reply.header('Referrer-Policy','no-referrer');
    reply.header('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    reply.header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    if (!insecure) reply.header('Strict-Transport-Security','max-age=31536000');
    if (!['GET','HEAD','OPTIONS'].includes(request.method)) {
      if (request.headers.origin !== options.origin) return reply.code(403).send({error:'This request did not come from Caminos.',code:'ORIGIN_REJECTED'});
      const session = sessionFor(request);
      const csrf = request.headers['x-csrf-token'];
      if (!session || typeof csrf !== 'string' || !safeEqual(session.csrf,csrf)) return reply.code(403).send({error:'Your session has changed. Refresh and try again.',code:'CSRF_REJECTED'});
    }
    // Fastify matches percent-decoded paths. Authorize the matched route, never
    // only the raw URL (e.g. /%61pi/snapshot is the same private route).
    const matchedRoute=request.routeOptions.url;
    const rawPath=request.url.split('?')[0];
    const isApi=matchedRoute?.startsWith('/api/') || rawPath.startsWith('/api/');
    const publicAuthRoute=matchedRoute && ['/api/session','/api/login','/api/setup'].includes(matchedRoute);
    if (isApi && !publicAuthRoute) {
      if (!sessionFor(request)?.authenticated) return reply.code(401).send({error:'Please sign in to Caminos.',code:'UNAUTHENTICATED'});
    }
  });
  app.setErrorHandler((error,request,reply) => {
    if (error instanceof ZodError) return reply.code(400).send({error:'Please check the information and try again.',code:'VALIDATION',issues:error.issues.map(x=>({path:x.path.join('.'),message:x.message}))});
    if (error instanceof RevisionConflict) return reply.code(409).send({error:error.message,code:'REVISION_CONFLICT',currentRevision:error.currentRevision});
    if (error instanceof DuplicateRequest) return reply.code(409).send({error:error.message,code:'REQUEST_ID_REUSED'});
    const known = error as Error & {statusCode?:number;code?:string};
    if (known.statusCode && known.statusCode >= 400 && known.statusCode < 500) return reply.code(known.statusCode).send({error:known.message,code:known.code ?? 'INVALID_REQUEST'});
    // Never log form bodies, session cookies, diary entries, or credentials.
    process.stderr.write(`Caminos request error: ${request.method} ${request.routeOptions.url ?? '/unknown'}\n`);
    return reply.code(500).send({error:'Caminos could not complete that request. Your saved data is unchanged.',code:'SERVER_ERROR'});
  });
  app.get('/healthz',async () => ({ok:true,service:'caminos'}));
  app.get('/api/session',async (request,reply) => {
    const session = sessionFor(request) ?? setSession(reply,false);
    return {authenticated:!!session.authenticated,csrfToken:session.csrf,ownerConfigured:!!repository.ownerHash()};
  });
  app.post('/api/login',async (request,reply) => {
    const input = z.object({password:z.string().min(1).max(1024)}).strict().parse(request.body);
    const rateKey = 'owner';
    const hash = repository.ownerHash();
    if (!hash) return reply.code(503).send({error:'Your private account has not been set up yet. Run owner setup on the Caminos server.',code:'OWNER_SETUP_REQUIRED'});
    // Reserve before asynchronous Argon work so parallel guesses cannot bypass the limit.
    if (!repository.reserveLoginAttempt(rateKey,now())) return reply.code(429).header('Retry-After','900').send({error:'Too many sign-in attempts. Try again in 15 minutes.',code:'RATE_LIMIT'});
    if (!await argon2.verify(hash,input.password)) {
      return reply.code(401).send({error:'That password did not match.',code:'INVALID_CREDENTIALS'});
    }
    const oldSession = sessionFor(request);
    const authenticated=repository.authenticateOwner(hash,oldSession?.hash,now());
    repository.loginSuccess(rateKey);
    reply.setCookie(cookieName,authenticated.raw,{...cookieOptions,maxAge:Math.max(1,Math.floor((authenticated.session.expires-now())/1000))});
    return {authenticated:true,csrfToken:authenticated.session.csrf};
  });
  app.post('/api/setup',async(request,reply)=>{
    const input=z.object({token:z.string().min(32).max(128),password:z.string().min(12).max(1024)}).strict().parse(request.body);
    if(repository.ownerHash()) return reply.code(409).send({error:'Your private account is already configured. Sign in instead.',code:'OWNER_ALREADY_CONFIGURED'});
    if(!repository.setupTokenValid(input.token,now())) return reply.code(403).send({error:'That setup link has expired or was replaced. Generate a new private setup link.',code:'SETUP_LINK_EXPIRED'});
    const hash=await argon2.hash(input.password,{type:argon2.argon2id,memoryCost:65536,timeCost:3,parallelism:1});
    // Recheck inside one write transaction so concurrent use cannot replace the owner.
    repository.completeSetup(input.token,hash,now());
    const authenticated=repository.authenticateOwner(hash,undefined,now());
    reply.setCookie(cookieName,authenticated.raw,{...cookieOptions,maxAge:Math.max(1,Math.floor((authenticated.session.expires-now())/1000))});
    return {authenticated:true,csrfToken:authenticated.session.csrf};
  });
  app.post('/api/logout',async (request,reply) => {
    const session = sessionFor(request);
    if (session) repository.deleteSession(session.hash);
    reply.clearCookie(cookieName,cookieOptions);
    reply.header('Clear-Site-Data','"cache", "storage"');
    return {authenticated:false};
  });
  const snapshot = () => ({...repository.snapshot(),serverNow:new Date(now()).toISOString()});
  app.get('/api/snapshot',async () => snapshot());
  app.post('/api/commands',async (request) => {
    const state = repository.execute(request.body as CommandEnvelope,new Date(now()).toISOString());
    return {snapshot:{...state,serverNow:new Date(now()).toISOString()}};
  });
  app.get('/api/export',async (_request,reply) => {
    reply.header('Content-Disposition',`attachment; filename="caminos-export-${new Date(now()).toISOString().slice(0,10)}.json"`);
    return {format:'caminos-owner-export',version:1,exportedAt:new Date(now()).toISOString(),state:repository.snapshot()};
  });
  app.get('/api/search',async (request) => {
    const {q} = z.object({q:z.string().max(200).default('')}).parse(request.query);
    return repository.search(q);
  });
  app.get('/api/weather/locations',async (request,reply) => {
    const {q} = z.object({q:z.string().min(2).max(100)}).parse(request.query);
    try { return await weather.search(q); }
    catch { return reply.code(503).send({error:'Location search is temporarily unavailable. Try again shortly.',code:'WEATHER_UNAVAILABLE'}); }
  });
  app.get('/api/weather',async (request,reply) => {
    const {locationId} = z.object({locationId:z.string().max(100).optional()}).parse(request.query);
    const locations = repository.snapshot().locations.filter(x=>!x.archived);
    const location = locationId ? locations.find(x=>x.id===locationId) : locations.find(x=>x.primary) ?? locations[0];
    if (!location) return reply.code(404).send({error:'Choose a weather location first.',code:'NOT_FOUND'});
    return weather.forecast(location);
  });
  if (options.staticDir) {
    const root=resolve(options.staticDir);
    await app.register(staticFiles,{root,prefix:'/',cacheControl:false,redirect:false,dotfiles:'deny',serveDotFiles:false,
      allowedPath:(path)=>{
        const clean=path.replace(/^\/+/, '');
        if(clean.split('/').some(part=>part.startsWith('.'))) return false;
        return clean==='index.html' || clean==='manifest.webmanifest' || /^[^/]+\.(svg|ico|png|webp)$/.test(clean) || /^assets\/.+\.(js|css|svg|png|webp|ico|woff2?|ttf)$/.test(clean);
      }});
    app.setNotFoundHandler((request,reply) => {
      if (request.url.startsWith('/api/') || !['GET','HEAD'].includes(request.method) || /\.[a-z0-9]+(?:\?|$)/i.test(request.url)) return reply.code(404).send({error:'Not found.'});
      return reply.type('text/html').sendFile('index.html');
    });
  }
  app.addHook('onClose',async ()=>repository.close());
  await app.ready();
  return app;
}
