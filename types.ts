export type tag = {
    tag: number,
    tagName: string,
    tagMessage?: string,
    tagcolor: string,
    isDynamic: boolean
};

export type Level = {
    lvlName: string,
    lvlcolor: string,
    level: number,
    tags: tag[],
    tagsCount: number
};

export type LevelArgs = {
    lvlName: string,
    lvlcolor?: string,
    level?: number,
    tags?: tagArgs[]
};

export type tagArgs = {
    tag?: number,
    tagName: string,
    tagMessage?: string,
    tagcolor?: string,
};

export type Options = {
    tcpConnections?: {
        adderess: string,
        port: number,
        secretKey: string
    } | {
        adderess: string,
        port: number,
        secretKey: string
    }[],
    files?: string | string[],
    writeOnconsole?: boolean
};

export type LogArgs={
    excludeConnections?:string[]|string,
    excludeFiles?:string[]|string,
    filesAppendMode?:boolean
}