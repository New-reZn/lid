import {Level,Options,LevelArgs,tagArgs,tag,LogArgs} from './types.js';

import chalk from 'chalk';
import showdown from 'showdown';
import { promises as fs } from 'fs';
import { tcp } from './tcpclient.js';
import { getRandomValues } from 'crypto';

export class lid{
    private levels:Level[];
    LevelCount:number=0;
    private options:Options;
    private tcpConnections;
    private files;
    constructor(level:LevelArgs[],options:Options={},SecretKey:string=""){
        
        function isIterable(obj: any): boolean {
            return obj != null && typeof obj[Symbol.iterator] === 'function';
        }

        this.levels=[];
        for(const i of level){
            
            const level:Level={
                level:i.level??this.LevelCount,
                lvlName:i.lvlName,
                lvlcolor:this.hslToHex(this.getRandomNumber(),100,50),
                tags:[],
                tagsCount:0
            }

            if(i.tags){
                for(const j of i.tags){
                    level.tags.push({
                        isDynamic:false,
                        tag:j.tag??level.tagsCount,
                        tagcolor:this.hslToHex(this.getRandomNumber(),100,50),
                        tagMessage:j.tagMessage,
                        tagName:j.tagName
                    })
                    level.tagsCount++;
                }
            }

            this.levels.push(level);
            this.LevelCount++;
        }
     
        this.options=options;
        
        this.options.writeOnconsole=options.writeOnconsole??true;

        if(options.tcpConnections){
            this.tcpConnections=[];
            if(isIterable(options)){
                //@ts-ignore
                for (const tcpConnection of options.tcpConnections) {
                    this.tcpConnections.push(new tcp(tcpConnection.adderess,tcpConnection.port,tcpConnection.secretKey));
                }
            }else{
                //@ts-ignore
                this.tcpConnections.push(new tcp(options.tcpConnections.adderess,options.tcpConnections.port,options.tcpConnections.secretKey));
            }
        }

        if(options.files){
            if(isIterable(options.files)){
                this.files=options.files;
            }else{
                this.files=[options.files];
            }
        }

    }
    
    addlevel(){}
    removelevel(){}

    addtag(){}
    removetag(){}

    log(level:number|string,message:string,args:LogArgs,tags:tagArgs[]|undefined=undefined){
        let LoggingLevel:Level|undefined;
            for (const levels of this.levels) {
                if(typeof level==="number"){
                    if(levels.level===level){
                        LoggingLevel=levels;
                    }
                }else if(typeof level==="string"){
                    if(levels.lvlName===level){
                        LoggingLevel=levels;
                }
            }
        }
        if(!LoggingLevel){
            console.error('Lid Logger error (id): cannot find level to log');
            return;
        }

        let LoggingTags:tag[]=[];
        if(tags){
            if(LoggingLevel.tags && LoggingLevel.tagsCount===0){
                for (const UserTags of tags) {
                    LoggingTags.push({
                        isDynamic:true,
                        tag:LoggingLevel.tagsCount++,
                        tagcolor:this.hslToHex(this.getRandomNumber(),100,50),
                        tagName:UserTags.tagName,
                        tagMessage:UserTags.tagMessage
                    })
                }
                
            }else{
                

                const copy = new Map(tags.map(tag => [tag.tagName, tag]));
                
                for (const Logtag of LoggingLevel.tags) {
                    if (copy.has(Logtag.tagName)) {
                        LoggingTags.push(Logtag);
                        copy.delete(Logtag.tagName);
                    }
                }

                for (const tag of copy.values()) {
                    LoggingTags.push({
                        isDynamic: true,
                        tag: LoggingLevel.tagsCount++,
                        tagcolor: this.hslToHex(this.getRandomNumber(), 100, 50),
                        tagName: tag.tagName,
                        tagMessage: tag.tagMessage
                    });
                }
            
            }
        }

        if(this.options.writeOnconsole){
            this.writeconsole(LoggingLevel.lvlName,LoggingLevel.lvlcolor,message,LoggingTags);
        }
    }

    writeconsole(lvlName:string,LvlColor:string,message:string,tags:tag[]=[]){
        console.log(
            new Date().toISOString(),
            chalk.bgHex(LvlColor).black(lvlName.toUpperCase()),
            chalk.hex(LvlColor)(message),
        );
        
        if(tags&&tags.length>0){
            const tagtable:{}[]=[]
            for (const tag of tags) {
                tagtable.push({tags:chalk.bgHex(tag.tagcolor).black(tag.tagName),message:tag.tagMessage??''})
            }
            console.table(tagtable);
        }
    }

    writefiles(){

    }

    writeConnection(){

    }

    private getRandomNumber(min:number=0, max:number=360) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private hslToHex(h:number, s:number, l:number) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = (n:number) => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
        };

        return `#${f(0)}${f(8)}${f(4)}`;
      }

}