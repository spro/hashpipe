declare module "xml2js" {
    export class Parser {
        parseString(
            xml: string,
            callback: (err: any, result: any) => void,
        ): void
    }
}
