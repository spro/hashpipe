import * as redis from "redis"
import { HashpipeFunction } from "../helpers"

export function connect(config?: {
    port?: number
    host?: string
}): Record<string, HashpipeFunction> {
    const redis_client = redis.createClient({
        socket: {
            port: config?.port || 6379,
            host: config?.host || "localhost",
        },
    })

    redis_client.connect()

    const fns: Record<string, HashpipeFunction> = {
        redis: (inp: any, args: any[], ctx: any, cb: any) => {
            const method = args[0]
            const methodArgs = args.slice(1)
            ;(redis_client as any)[method](
                ...methodArgs,
                (err: any, ret: any) => {
                    cb(null, ret)
                },
            )
        },
    }

    return fns
}
