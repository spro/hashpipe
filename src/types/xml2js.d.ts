declare module "xml2js" {
    export class Parser {
        parseStringPromise(xml: string): Promise<any>
    }
}
