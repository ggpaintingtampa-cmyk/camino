// Keep existing installations connected to their configured storage and origin.
// New configuration uses CAMINOS_; deployed HERMES_ settings remain supported.
export function appEnvironment(name:string, env:NodeJS.ProcessEnv = process.env):string|undefined {
  return env[`CAMINOS_${name}`] ?? env[`HERMES_${name}`];
}
