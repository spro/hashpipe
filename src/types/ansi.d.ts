declare module "ansi" {
    function ansi(stream: NodeJS.WriteStream): {
        fg: {
            red(): void
            [key: string]: () => void
        }
        reset(): void
    }
    export = ansi
}
