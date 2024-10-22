import type { LidClient } from "tcpClient.ts";

export type tag = {
    tag: number,
    tagName: string,
    tagMessage?: string,
    tagcolor: string,
    isDynamic: boolean
};

export type Level = {
    lvlName: string,
    lvlColor: string,
    level: number,
    tags: tag[],
    tagsCount: number
};

export type LevelArgs = {
    lvlName: string,
    lvlColor?: string,
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
    writeOnconsole?: boolean,
    bufferedConnection?:boolean,
    bufferedTimeout?:number
};

export type LogArgs={
    excludeAddresses?:string[]|string,
    excludePorts?:string[]|string,
    excludeFiles?:string[]|string,
    filesAppendMode?:boolean,
    skipFileLog?:boolean,
    skipConnectionLog?:boolean,

}

export type tcpConnection={
    [connectionAdress:string]:LidClient
}

export type ClientData={
    status:string,
    message?:string
}

export type LogEntry = {
    currentDateTime: Date;
    lvlName: string;
    level: number;
    lvlColor: string;
    message: string;
    tags: Tag[];
    args: LogArgs;
}
