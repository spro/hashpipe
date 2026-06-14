import * as redis from "redis"
import { HashpipeFunction, command, isPromiseLike } from "../helpers"

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
        redis: command((inp: any, args: any[]) => {
            const method = args[0]
            const methodArgs = args.slice(1)
            return new Promise((resolve, reject) => {
                const result = (redis_client as any)[method](
                    ...methodArgs,
                    (err: any, ret: any) => {
                        if (err) reject(err)
                        else resolve(ret)
                    },
                )
                if (isPromiseLike(result)) {
                    result.then(resolve, reject)
                }
            })
        }),
    }

    return fns
}
