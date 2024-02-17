declare module JSX {
    namespace JSX{
        interface IntrinsicElements {
            [elemName: string]: Attributes & { children?: (string | NodeWithHTML)[]};
        }
    }
}
