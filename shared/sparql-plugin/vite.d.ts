export declare function sparqlFiles(): {
    name: string;
    enforce: "pre";
    transform(code: string, id: string): string | null;
};
