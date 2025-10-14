import type { HashpipeFunction } from "../helpers"

// Shared helpers and types reused across builtin modules.
export type BuiltinMap = Record<string, HashpipeFunction>

export function toNumber(value: any): number {
    return Number(value) || 0
}

export function toBoolean(value: any): boolean {
    if (typeof value === "string") {
        if (value === "false") return false
        if (value === "true") return true
    }
    return !!value
}
