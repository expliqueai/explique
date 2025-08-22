function getUTCTime(date: Date): number {
  return date.getTime() - date.getTimezoneOffset() * 60000
}

export function toDatetimeLocalString(date: Date) {
  const offset = date.getTimezoneOffset()
  const adjustedDate = new Date(date.getTime() - offset * 60 * 1000)

  const isoString = adjustedDate.toISOString()
  const datetimeLocalString = isoString.substring(0, 16)
  return datetimeLocalString
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WEEK_IN_MILLIS = 6.048e8,
  DAY_IN_MILLIS = 8.64e7,
  HOUR_IN_MILLIS = 3.6e6,
  MIN_IN_MILLIS = 6e4,
  SEC_IN_MILLIS = 1e3

// https://stackoverflow.com/a/53800501/4652564
export const timeFromNow = (date: Date) => {
  const formatter = new Intl.RelativeTimeFormat("en", { style: "long" })

  const millis = getUTCTime(date)
  const diff = millis - getUTCTime(new Date())

  if (Math.abs(diff) > DAY_IN_MILLIS)
    return formatter.format(Math.trunc(diff / DAY_IN_MILLIS), "day")
  else if (Math.abs(diff) > HOUR_IN_MILLIS)
    return formatter.format(
      Math.trunc((diff % DAY_IN_MILLIS) / HOUR_IN_MILLIS),
      "hour"
    )
  else if (Math.abs(diff) > MIN_IN_MILLIS)
    return formatter.format(
      Math.trunc((diff % HOUR_IN_MILLIS) / MIN_IN_MILLIS),
      "minute"
    )
  else
    return formatter.format(
      Math.trunc((diff % MIN_IN_MILLIS) / SEC_IN_MILLIS),
      "second"
    )
}

export function formatTimestampFull(timestamp: number) {
  const date = new Date(timestamp)
  return formatDateTime(date)
}

export function formatDateTime(date: Date) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()

  return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")} ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

export function formatTimestampHumanFormat(timestamp: number) {
  const date = new Date(timestamp)
  // format the date using intl format
  return new Intl.DateTimeFormat("en-GB", {
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    month: "long",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}
