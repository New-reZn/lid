import chalk from 'chalk';
import showdown from 'showdown';

import { promises as fs } from 'fs';

import { tcp } from './tcpclient';

type tag={
    tag:Number,
    tagName:String,
    tagMessage?:String,
    tagcolor:String,
    isDyanmic:Boolean
}


type Level = {
    lvlName: String,
    lvlcolor: String,
    level:Number,
    tags:tag[],
    tagsCount:0
};

type LevelArgs={
    lvlName: String,
    lvlcolor?: String,
    level?:Number,
    tags?:tagArgs[]
}

type tagArgs={
    tag?:Number,
    tagName:String,
    tagMessage?:String,
    tagcolor?:String,
}

type Options={
    tcpConnections?:{
        adderess:string,
        port:number
        secretKey:string
    }|{
        adderess:string,
        port:number
        secretKey:string
    }[],
    files?:string|string[],
    writeOnconsole?:boolean
}

export class lid{
    private levels:Level[];
    LevelCount:number=0;
    private options:Options;
    private tcpConnections;
    private files;
    constructor(level:LevelArgs[],options:Options,SecretKey:string){

        function getRandomNumber(min:number=0, max:number=360) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        function isIterable(obj: any): boolean {
            return obj != null && typeof obj[Symbol.iterator] === 'function';
        }

        this.levels=[];
        for(const i of level){
            
            const level:Level={
                level:i.level??this.LevelCount,
                lvlName:i.lvlName,
                lvlcolor:this.hslToHex(getRandomNumber(),100,50),
                tags:[],
                tagsCount:0
            }

            if(i.tags){
                for(const j of i.tags){
                    level.tags.push({
                        isDyanmic:false,
                        tag:j.tag??level.tagsCount,
                        tagcolor:this.hslToHex(getRandomNumber(),100,50),
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

    log(level:number,message:string,tag:tagArgs[],args:any={}){
        
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