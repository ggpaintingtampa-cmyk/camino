import { afterEach, describe, expect, it, vi } from 'vitest';
import { Repository } from '../server/repository.js';
import { WeatherService } from '../server/weather.js';
import type { WeatherLocation } from '../shared/types.js';

const location:WeatherLocation={id:'location-fixture',name:'Synthetic Tampa',postcode:'34638',latitude:28.2,longitude:-82.5,primary:true,createdAt:'2026-09-18T00:00:00Z',updatedAt:'2026-09-18T00:00:00Z'};
const repositories:Repository[]=[];
const repository=()=>{const repo=new Repository(':memory:');repositories.push(repo);return repo;};
afterEach(()=>{for(const repo of repositories.splice(0))repo.close();});
const json=(data:unknown)=>new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}});

describe('weather providers and honest cache behavior',()=>{
  it('loads NWS forecast, caches it, and keeps original timestamp while stale',async()=>{
    let now=Date.parse('2026-09-18T15:00:00Z');
    const fetcher=vi.fn().mockResolvedValueOnce(json({properties:{forecast:'https://api.weather.gov/gridpoints/TBW/1,1/forecast'}})).mockResolvedValueOnce(json({properties:{periods:[{name:'Today',isDaytime:true,temperature:88,temperatureUnit:'F',shortForecast:'Sunny',probabilityOfPrecipitation:{value:10}},{name:'Tonight',isDaytime:false,temperature:70,temperatureUnit:'F',shortForecast:'Clear'}]}}));
    const service=new WeatherService(repository(),fetcher,()=>now);
    const fresh=await service.forecast(location);
    expect(fresh.temperature).toBe(88);
    expect(fresh.low).toBe(70);
    expect(fresh.stale).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(await service.forecast(location)).toEqual(fresh);
    expect(fetcher).toHaveBeenCalledTimes(2);
    now+=31*60*1000;
    fetcher.mockRejectedValue(new Error('Network unavailable'));
    const stale=await service.forecast(location);
    expect(stale.stale).toBe(true);
    expect(stale.fetchedAt).toBe(fresh.fetchedAt);
    expect(stale.temperature).toBe(88);
  });
  it('uses Open-Meteo when NWS is unavailable and reports empty honest outage without a cache',async()=>{
    const fetcher=vi.fn().mockRejectedValueOnce(new Error('NWS down')).mockResolvedValueOnce(json({current:{temperature_2m:75.1,weather_code:3},daily:{temperature_2m_max:[80],temperature_2m_min:[65],precipitation_probability_max:[20]}}));
    const service=new WeatherService(repository(),fetcher);
    const forecast=await service.forecast(location);
    expect(forecast.temperature).toBe(75);
    expect(forecast.attribution).toContain('Open-Meteo');
    const offline=new WeatherService(repository(),vi.fn().mockRejectedValue(new Error('Offline')));
    const empty=await offline.forecast(location);
    expect(empty.temperature).toBeNull();
    expect(empty.fetchedAt).toBe('');
    expect(empty.shortForecast).toContain('unavailable');
  });
  it('never follows a provider forecast URL into another host',async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(json({properties:{forecast:'http://127.0.0.1:3003/api/export'}})).mockRejectedValue(new Error('Fallback down'));
    await new WeatherService(repository(),fetcher).forecast(location);
    expect(fetcher.mock.calls.every(x=>!String(x[0]).startsWith('http://127.0.0.1'))).toBe(true);
  });
  it('keeps ambiguous city results for owner selection and caches geocoding',async()=>{
    const fetcher=vi.fn().mockResolvedValue(json({results:[{name:'Springfield',admin1:'Illinois',country:'United States',latitude:39.7,longitude:-89.6},{name:'Springfield',admin1:'Massachusetts',country:'United States',latitude:42.1,longitude:-72.5}]}));
    const service=new WeatherService(repository(),fetcher);
    const results=await service.search('Springfield');
    expect(results).toHaveLength(2);
    expect(results[0].name).toContain('Illinois');
    expect(results[1].name).toContain('Massachusetts');
    expect(await service.search('Springfield')).toEqual(results);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(await service.search('a')).toEqual([]);
  });
  it('resolves US ZIPs absent from the city index using the postal fallback',async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(json({generationtime_ms:0.2})).mockResolvedValueOnce(json({country:'United States',places:[{'place name':'Land O Lakes',state:'Florida',latitude:'28.2478',longitude:'-82.4962'}]}));
    const service=new WeatherService(repository(),fetcher);
    expect(await service.search('34638')).toEqual([{name:'Land O Lakes, Florida, United States',latitude:28.2478,longitude:-82.4962,postcode:'34638'}]);
    expect(fetcher.mock.calls[1][0]).toBe('https://api.zippopotam.us/us/34638');
  });
});
