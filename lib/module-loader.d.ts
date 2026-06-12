export interface LoadedModule {
    exports: Record<string, any>;
    location: string;
}
export declare function loadModule(request: string): LoadedModule;
//# sourceMappingURL=module-loader.d.ts.map