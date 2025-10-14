export const isFunction = (value: unknown): value is (...args: any[]) => any =>
    typeof value === "function"

export const isString = (value: unknown): value is string =>
    typeof value === "string" || value instanceof String

export const isObject = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === "object"

export const cloneShallow = <T>(value: T): T => {
    if (Array.isArray(value)) {
        return value.slice() as T
    }
    if (isObject(value)) {
        return { ...(value as Record<string, unknown>) } as T
    }
    return value
}

export const flattenOnce = (list: any[]): any[] => {
    const result: any[] = []
    for (const item of list) {
        if (Array.isArray(item)) {
            result.push(...item)
        } else {
            result.push(item)
        }
    }
    return result
}
