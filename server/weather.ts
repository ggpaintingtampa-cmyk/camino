import type { WeatherData, WeatherLocation } from '../shared/types.js';
import type { Repository } from './repository.js';

export interface LocationResult {name:string;latitude:number;longitude:number;postcode?:string}
type JsonFetch = (url:string, init?:RequestInit) => Promise<Response>;
interface NWSPeriod {name:string;isDaytime:boolean;temperature:number;temperatureUnit:string;shortForecast:string;probabilityOfPrecipitation?:{value:number|null}}

export class WeatherService {
  constructor(private repository:Repository, private fetcher:JsonFetch = fetch, private now:()=>number = Date.now) {}
  private async json<T>(url:string):Promise<T> {
    const response = await this.fetcher(url,{headers:{'User-Agent':'CaminosPersonalDashboard (hermes.andresinbox.tech)',Accept:'application/geo+json, application/json'},signal:AbortSignal.timeout(8_000),redirect:'error'});
    if (!response.ok) throw new Error(`Weather provider returned ${response.status}.`);
    return response.json() as Promise<T>;
  }
  async search(query:string):Promise<LocationResult[]> {
    const q = query.trim();
    if (q.length < 2 || q.length > 100) return [];
    const key = `geocode:${q.toLocaleLowerCase()}`;
    const cached = this.repository.weatherCache<LocationResult[]>(key);
    if (cached && cached.fetchedAt > this.now()-24*60*60*1000) return cached.data;
    // Open-Meteo's geocoder accepts US postcodes and cities; never use device GPS.
    const isUSZip=/^\d{5}$/.test(q);
    let results:LocationResult[]=[];
    let geocoderFailed=false;
    try {
      const data = await this.json<{results?:{name:string;latitude:number;longitude:number;admin1?:string;country?:string;postcodes?:string[]}[]}>(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`);
      results = (data.results ?? []).filter(x => Number.isFinite(x.latitude) && Number.isFinite(x.longitude)).map(x => ({name:[x.name,x.admin1,x.country].filter(Boolean).join(', '),latitude:x.latitude,longitude:x.longitude,...(isUSZip ? {postcode:q} : {})}));
    } catch(error) {if(!isUSZip)throw error;geocoderFailed=true;}
    // Some valid US ZIPs (including 34638) are absent from Open-Meteo's city index.
    if(isUSZip && !results.length) {
      try {
        const postal=await this.json<{country:string;places:{'place name':string;state:string;latitude:string;longitude:string}[]}>(`https://api.zippopotam.us/us/${q}`);
        results=(postal.places ?? []).map(place=>({name:[place['place name'],place.state,postal.country].filter(Boolean).join(', '),latitude:Number(place.latitude),longitude:Number(place.longitude),postcode:q})).filter(place=>Number.isFinite(place.latitude)&&Math.abs(place.latitude)<=90&&Number.isFinite(place.longitude)&&Math.abs(place.longitude)<=180);
      } catch(error) {if(geocoderFailed)throw error;}
    }
    this.repository.putWeatherCache(key,results,this.now());
    return results;
  }
  async forecast(location:WeatherLocation):Promise<WeatherData> {
    const key = `forecast:${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
    const cached = this.repository.weatherCache<WeatherData>(key);
    if (cached && cached.fetchedAt > this.now()-30*60*1000) return {...cached.data,locationId:location.id,stale:false};
    try {
      let weather:WeatherData;
      try { weather = await this.nws(location); }
      catch { weather = await this.openMeteo(location); }
      this.repository.putWeatherCache(key,weather,this.now());
      return weather;
    } catch {
      if (cached) return {...cached.data,locationId:location.id,stale:true};
      return {locationId:location.id,temperature:null,high:null,low:null,precipitation:null,shortForecast:'Weather is temporarily unavailable',fetchedAt:'',stale:true,attribution:'National Weather Service / Open-Meteo',periods:[]};
    }
  }
  private async nws(location:WeatherLocation):Promise<WeatherData> {
    const point = await this.json<{properties:{forecast:string;forecastHourly?:string}}>(`https://api.weather.gov/points/${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`);
    const forecastUrl = new URL(point.properties.forecast);
    if (forecastUrl.protocol !== 'https:' || forecastUrl.hostname !== 'api.weather.gov') throw new Error('Unexpected forecast source.');
    const data = await this.json<{properties:{periods:NWSPeriod[]}}>(forecastUrl.href);
    const periods = data.properties.periods;
    if (!periods?.length) throw new Error('No forecast available.');
    const fahrenheit = (p:NWSPeriod) => p.temperatureUnit === 'C' ? Math.round(p.temperature*9/5+32) : p.temperature;
    return {locationId:location.id,temperature:fahrenheit(periods[0]),shortForecast:periods[0].shortForecast,
      high:periods.find(x=>x.isDaytime) ? fahrenheit(periods.find(x=>x.isDaytime)!) : null,
      low:periods.find(x=>!x.isDaytime) ? fahrenheit(periods.find(x=>!x.isDaytime)!) : null,
      precipitation:periods[0].probabilityOfPrecipitation?.value ?? null,
      fetchedAt:new Date(this.now()).toISOString(),stale:false,attribution:'National Weather Service · forecast temperature',
      periods:periods.slice(0,6).map(x=>({name:x.name,temperature:fahrenheit(x),forecast:x.shortForecast}))};
  }
  private async openMeteo(location:WeatherLocation):Promise<WeatherData> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`;
    const data = await this.json<{current:{temperature_2m:number;weather_code:number};daily:{temperature_2m_max:number[];temperature_2m_min:number[];precipitation_probability_max:number[]}}>(url);
    if (!Number.isFinite(data.current?.temperature_2m)) throw new Error('No current weather available.');
    const code = data.current.weather_code;
    const description = code === 0 ? 'Clear sky' : code <= 3 ? 'Partly cloudy' : code <= 48 ? 'Foggy' : code <= 67 ? 'Rain' : code <= 77 ? 'Snow' : code <= 82 ? 'Rain showers' : code <= 86 ? 'Snow showers' : 'Thunderstorms';
    return {locationId:location.id,temperature:Math.round(data.current.temperature_2m),shortForecast:description,high:data.daily.temperature_2m_max[0] ?? null,low:data.daily.temperature_2m_min[0] ?? null,precipitation:data.daily.precipitation_probability_max[0] ?? null,fetchedAt:new Date(this.now()).toISOString(),stale:false,attribution:'Open-Meteo · CC BY 4.0',periods:[]};
  }
}
