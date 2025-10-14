const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]

const WEEKDAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
]

const pad = (value: number, length: number = 2): string =>
    value.toString().padStart(length, "0")

const formatTokenHandlers: Record<string, (date: Date) => string> = {
    YYYY: (date) => pad(date.getFullYear(), 4),
    YY: (date) => pad(date.getFullYear(), 2).slice(-2),
    MMMM: (date) => MONTH_NAMES[date.getMonth()],
    MMM: (date) => MONTH_NAMES[date.getMonth()].slice(0, 3),
    MM: (date) => pad(date.getMonth() + 1),
    M: (date) => (date.getMonth() + 1).toString(),
    DD: (date) => pad(date.getDate()),
    D: (date) => date.getDate().toString(),
    dddd: (date) => WEEKDAY_NAMES[date.getDay()],
    ddd: (date) => WEEKDAY_NAMES[date.getDay()].slice(0, 3),
    HH: (date) => pad(date.getHours()),
    H: (date) => date.getHours().toString(),
    hh: (date) => {
        const hour = date.getHours() % 12 || 12
        return pad(hour)
    },
    h: (date) => {
        const hour = date.getHours() % 12 || 12
        return hour.toString()
    },
    mm: (date) => pad(date.getMinutes()),
    m: (date) => date.getMinutes().toString(),
    ss: (date) => pad(date.getSeconds()),
    s: (date) => date.getSeconds().toString(),
    SSS: (date) => pad(date.getMilliseconds(), 3),
    A: (date) => (date.getHours() >= 12 ? "PM" : "AM"),
    a: (date) => (date.getHours() >= 12 ? "pm" : "am"),
    Z: (date) => {
        const offset = -date.getTimezoneOffset()
        const sign = offset >= 0 ? "+" : "-"
        const abs = Math.abs(offset)
        return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
    },
    ZZ: (date) => {
        const offset = -date.getTimezoneOffset()
        const sign = offset >= 0 ? "+" : "-"
        const abs = Math.abs(offset)
        return `${sign}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`
    },
}

const TOKEN_REGEX = new RegExp(
    Object.keys(formatTokenHandlers)
        .sort((a, b) => b.length - a.length)
        .join("|"),
    "g",
)

export function formatDate(input: unknown, pattern: string): string {
    const date =
        input instanceof Date ? new Date(input) : new Date(input as any)
    if (Number.isNaN(date.getTime())) {
        return "Invalid Date"
    }

    return pattern.replace(TOKEN_REGEX, (token) => {
        const handler = formatTokenHandlers[token]
        return handler ? handler(date) : token
    })
}
