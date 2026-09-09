declare module 'suncalc' {
  export interface SunTimes {
    sunrise: Date
    sunriseEnd: Date
    goldenHourEnd: Date
    solarNoon: Date
    goldenHour: Date
    sunsetStart: Date
    sunset: Date
    dusk: Date
    nauticalDusk: Date
    night: Date
    nadir: Date
    nightEnd: Date
    nauticalDawn: Date
    dawn: Date
  }
  export function getTimes(date: Date, latitude: number, longitude: number): SunTimes
  const _default: { getTimes: typeof getTimes }
  export default _default
}
