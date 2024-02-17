const selfClosingTags: string[] = ["area", "base", "br", "col", "command", "embed", "hr", "img", "input", "keygen", "link", "meta", "param", "source", "track", "wbr"];

export interface Attributes {
    [key: string]: string;
}

interface Node {
    type: string;
    attributes?: Attributes;
    content?: string | Node | Node[];
}

const attributeToString = (attributes: Attributes|undefined): string => {
    return attributes!=undefined? Object.keys(attributes).map((key) => ` ${key.replace(/([A-Z])/g, (match) => `-${match[0].toLowerCase()}`)}="${attributes[key]}"`).join("") : "";
};

const nodeToString = (node: Node): string => {
    if (!node.type) {
        return typeof node.content === 'string' || node.content instanceof String ? node.content as string : '';
    }

    const content = node.content as string | Node | Node[];

    if (selfClosingTags.includes(node.type)) {
        return `<${node.type}${attributeToString(node.attributes)} />`;
    } else {
        return `<${node.type}${attributeToString(node.attributes)}>${Array.isArray(content) ? content.map((child) => nodeToString(child)).join("") : content || ""}</${node.type}>`;
    }
};


const findNodes = ({ stack, type, id, className }: { stack: Node[], type?: string, id?: string, className?: string }): Node[] => {
    const result: Node[] = [];

    stack.forEach((node) => {
        if (type && node.type === type) {
            result.push(node);
        } else if (id && node.attributes && node.attributes.id === id) {
            result.push(node);
        } else if (className && node.attributes && node.attributes.class === className) {
            result.push(node);
        }

        if (node.content && Array.isArray(node.content)) {
            const children = findNodes({ stack: node.content, type, id, className });
            result.push(...children);
        }
    });

    return result;
};

class Document {
    private content: Node[];

    constructor(content: Node[]) {
        this.content = Array.isArray(content) ? content : [];
    }

    private renderContent(): string {
        let html = "";
        this.content.forEach((node) => {
            html += nodeToString(node);
        });
        return html;
    }

    public getHTML(options?: { htmlTagAttributes?: Attributes;}): string {
        const html = `<!DOCTYPE html>${nodeToString({ type: "html", content: this.renderContent(), attributes: options?.htmlTagAttributes })}`;
        return html.replace(/(\r\n|\n|\r)/gm, "");
    }

    public setTitle(title: string): string {
        const titleNode = this.findNodesByType("title")[0];
        if (titleNode) {
            titleNode.content = title;
            return title;
        }

        const headNode = this.findNodesByType("head")[0];
        if (headNode) {
            headNode.content  = headNode.content || [];
            if (Array.isArray(headNode.content)){
                headNode.content.push({ type: "title", content: title });
            }
            return title;
        }

        this.content.push({ type: "head", content: [{ type: "title", content: title }] });
        return title;
    }

    public addElement(node: Node | Node[]): this {
        if (Array.isArray(node)) {
            this.content.push(...node);
        } else {
            this.content.push(node);
        }
        return this;
    }

    public addElementToTarget(node: Node, target: { id?: string; className?: string; type?: string }): this {
        if (!target) return this;

        let targets: Node[] = [];

        if (target.id) {
            targets = this.findNodesById(target.id);
        } else if (target.className) {
            targets = this.findNodesByClassName(target.className);
        } else if (target.type) {
            targets = this.findNodesByType(target.type);
        }

        targets.forEach((targetNode) => {
            targetNode.content = targetNode.content || [];
            if(Array.isArray(targetNode.content))
                targetNode.content.push(node);
        });

        return this;
    }

    public findNodesByType(type: string): Node[] {
        return findNodes({ stack: this.content, type });
    }

    public findNodesById(id: string): Node[] {
        return findNodes({ stack: this.content, id });
    }

    public findNodesByClassName(className: string): Node[] {
        return findNodes({ stack: this.content, className });
    }

    public withBoilerplate(): this {
        this.content.unshift({
            type: "head",
            content: [
                { type: "meta", attributes: { charset: "utf-8" } },
                { type: "meta", attributes: { name: "viewport", content: "width=device-width, initial-scale=1, shrink-to-fit=no" } }
            ]
        });

        this.content.unshift({
            type: "body",
            content: this.content
        });

        return this;
    }
}

export interface NodeWithHTML extends Node {
    toHTML: () => string;
    toCompleteHTML: () => string
}
export interface IntrinsicElements {
    [elemName: string]: Attributes & { children?: (string | NodeWithHTML)[]};
}
const JSX = {
    createElement(
        type: string,
        props: Attributes | null,
        ...children: (string | NodeWithHTML)[]
    ): NodeWithHTML {
        const attributes = props || {};
        const content = children.map(child =>
            typeof child === 'string' ? { type: 'text', content: child } : child
        );
        const node: NodeWithHTML = {
            type,
            attributes,
            content,
            toHTML() {
                return new Document([this]).getHTML();
            },
            toCompleteHTML(){
                return new Document([this]).withBoilerplate().getHTML()
            }
        };

        return node;
    },
}
export default JSX;