declare module "pm2" {
    export function connect(callback: () => void): void
    const pm2: any
    export = pm2
}
