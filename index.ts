import type {Level,Options,LevelArgs,tagArgs,tag,LogArgs,tcpConnection} from './types.js';

import chalk from 'chalk';
import fs from 'fs';
import { tcp } from './tcpClient.js';
import { stringify } from 'csv-stringify/sync';

export default class lid{
    private levels:Level[];
    LevelCount:number=0;
    options:Options;
    tcpConnections:tcpConnection={};
    files:string|string[]='';

    constructor(level:LevelArgs[],options:Options={}){
        
        if(level){
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
        }else{
            throw new Error('Lid Logger error (id): No levels were defined')
        }
     
        this.options=options;
        
        this.options.writeOnconsole=options.writeOnconsole??true;

        if(options.tcpConnections){
            if(this.isIterable(options.tcpConnections)){
                //@ts-ignore
                for (const tcpConnection of options.tcpConnections) {
                    const tcpObject=new tcp(tcpConnection.adderess,tcpConnection.port,tcpConnection.secretKey);
                    this.tcpConnections[`${tcpConnection.adderess}::${tcpConnection.port}`]=tcpObject;
                }
            }else{
                //@ts-ignore
                const tcpObject=new tcp(options.tcpConnections.adderess,options.tcpConnections.port,options.tcpConnections.secretKey);
                //@ts-ignore
                this.tcpConnections[`${options.tcpConnections.adderess}::${options.tcpConnections.port}`]=tcpObject;   
            }
        }

        if(options.files){
            if(this.isIterable(options.files)){
                this.files=options.files;
            }else{
                this.files=[...options.files];
            }
        }
    }
    
    addlevel(){}
    removelevel(){}

    addtag(){}
    removetag(){}

    async initializeConnections(){
        for (const connection of Object.values(this.tcpConnections)) {
            await connection.connect();
        }
    }

    log(level:number|string,message:string,tags:tagArgs[]|undefined=undefined,args?:LogArgs,){
        const dateTime=new Date();
        
        if(!args){
            args={
                excludeAddresses:[],
                excludeFiles:[],
                skipConnectionLog:false,
                skipFileLog:false,
                filesAppendMode:true,
                excludePorts:[],
            }
        }

        let LoggingLevel:Level|undefined;
        for (const levels of this.levels) {
            if(typeof level==="number"){
                if(levels.level===level){
                    LoggingLevel=structuredClone(levels);
                }
            }else if(typeof level==="string"){
                if(levels.lvlName===level){
                    LoggingLevel=structuredClone(levels);
                }
            }
        }

        if(!LoggingLevel){
            console.error('Lid Logger error (id): cannot find level to log');
            return;
        }

        let LoggingTags:tag[]=[];

        if(tags){
            if(!LoggingLevel.tags.length && LoggingLevel.tagsCount===0){
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
                
                for (const logTag of LoggingLevel.tags) {
                    if (copy.has(logTag.tagName)) {
                        
                        const tag=copy.get(logTag.tagName);
                        if(tag?.tagMessage){
                            logTag.tagMessage=tag.tagMessage;
                        }

                        LoggingTags.push(logTag);
                        copy.delete(logTag.tagName);
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

        if(this.options.writeOnconsole)
        {
            this.writeconsole(dateTime,LoggingLevel.lvlName,LoggingLevel.lvlcolor,message,LoggingTags);
        }
        
        if(this.files.length && !args.skipFileLog)
        {
            this.writefiles(dateTime,LoggingLevel.lvlName,message,LoggingTags,args);
        }
        
        if(Object.keys(this.tcpConnections).length && !args.skipConnectionLog)
        {
            this.writeConnection(dateTime,LoggingLevel.lvlName,LoggingLevel.level,LoggingLevel.lvlcolor,message,LoggingTags,args);
        }
    }

    writeconsole(currentDateTime:Date,lvlName:string,LvlColor:string,message:string,tags:tag[]=[]){
        console.log(
            `[${currentDateTime.toISOString()}] :`,
            chalk.bgHex(LvlColor).black(lvlName.toUpperCase()),
            chalk.hex(LvlColor)(message),
        );
        
        if(tags&&tags.length>0){
            const tagtable:{}[]=[]
            for (const tag of tags) {
                tagtable.push({tags:tag.tagName,message:tag.tagMessage??''})
            }
            console.table(tagtable);
        }
    }

    writefiles(currentDateTime:Date,lvlName:string,message:string,tags:tag[]=[],args:LogArgs){
        if(!this.files){
            return;
        }
        
        if(this.isIterable(this.files)){

            const ExcludedFiles=new Set(args.excludeFiles??[]);

            for (const filePath of this.files) {
                if(ExcludedFiles.has(filePath)){continue};
                //add files exclusion list here
                if(filePath.slice(-3)==="txt"||filePath.slice(-3)==="log"){
                    this.WritefilesTxt(currentDateTime,filePath,lvlName,message,tags,args.filesAppendMode);
                }else if(filePath.slice(-3)==="csv"){
                    this.WritefilesCSV(currentDateTime,filePath,lvlName,message,tags,args.filesAppendMode);
                }
            }
        }else{
            if(this.files.slice(-3)==="txt"||this.files.slice(-3)==="log"){
                //@ts-ignore
                this.WritefilesTxt(currentDateTime,this.files,lvlName,message,tags,args.filesAppendMode);
            }else if(this.files.slice(-3)==="csv"){
                //@ts-ignore
                this.WritefilesCSV(currentDateTime,this.files,lvlName,message,tags,args.filesAppendMode);                
            }
        }
        
    }
    
    //TODO:add mode to cahce lated date and time postion at top row of file
    private WritefilesTxt(currentDateTime:Date,filePath:string,levelName:string,message:string,tags:tag[],filesAppendMode=true){
        
        if(filesAppendMode){
            try{
                if(!fs.existsSync(filePath)){
                   
                    this.WritefilesTxt(currentDateTime,filePath,levelName,message,tags,false);
                    return;
                }

                const fileCurrentdata=fs.readFileSync(filePath,{encoding:'utf-8'});
                
                const fileContent=fileCurrentdata;

                if(fileContent.length===0){
                    this.WritefilesTxt(currentDateTime,filePath,levelName,message,tags,false);
                    return;
                }

                const fileContentList=fileContent.split('\n');
                
                let dateListCursor=fileContentList.length;
                let timeListCursor=fileContentList.length;
                
                const latestDateRegex = /^\d{4}-\d{2}-\d{2}\u00A0:$/;
                const latestTimeRegex  =/^\t\d{2}::\d{2}\u00A0:$/
                let latestDateString:string;
                let latestTimeString:string;

                while(!latestDateRegex.test(fileContentList[dateListCursor])){   
                    dateListCursor--;
                    if(dateListCursor<0||dateListCursor>fileContentList.length){
                        console.error(`Lid Logger error (id): cannot parse file at : ${filePath}`);
                        return;
                    }
                }

                latestDateString=fileContentList[dateListCursor].slice(0,10);

                while(!latestTimeRegex.test(fileContentList[timeListCursor])){
                    timeListCursor--;
                    if(timeListCursor<0||timeListCursor>fileContentList.length){
                        console.error(`Lid Logger error (id): cannot parse file at : ${filePath}`);
                        return;
                    }
                }
                
                latestTimeString=fileContentList[timeListCursor].slice(0,7);

                const latestDateTime=new Date(latestDateString);
                const [hours,minutes]=latestTimeString.split('::').map(Number);
                latestDateTime.setHours(hours);
                latestDateTime.setMinutes(minutes);
            
                let appendingData:string;
                
                //within same date
                if(currentDateTime.getDate()===latestDateTime.getDate()){
                    if(currentDateTime.getHours()===latestDateTime.getHours()){
                        //same time
                        appendingData=`\t\t[${currentDateTime.toISOString()}] ${levelName} : ${message} ; { `;
                        
                        for (const tag of tags) {
                            appendingData=appendingData.concat(`${tag.tagName} : ${tag.tagMessage} , `)
                        }
                        
                        appendingData=appendingData.concat(' }\n');
                    
                    }else{
                        //different time
                        appendingData=`\t${currentDateTime.getHours()}::${currentDateTime.getMinutes().toString().padStart(2,'0')}\u00A0:\n`;
                        appendingData=appendingData.concat(`\t\t[${currentDateTime.toISOString()}] ${levelName} : ${message} ; { `);

                        for (const tag of tags) {
                            appendingData=appendingData.concat(`${tag.tagName} : ${tag.tagMessage} , `)
                        }
                        appendingData=appendingData.concat(' }\n');

                    }
                }else{
                    // with in different date
                    appendingData=`${currentDateTime.getFullYear()}-${currentDateTime.getMonth().toString().padStart(2,'0')}-${currentDateTime.getDate().toString().padStart(2,'0')}\u00A0:\n`;
                    appendingData=appendingData.concat(`\t${currentDateTime.getHours()}::${currentDateTime.getMinutes()}\u00A0:\n`);
                    appendingData=appendingData.concat(`\t\t[${currentDateTime.toISOString()}] ${levelName} : ${message} ; { `);

                    for (const tag of tags) {
                        appendingData=appendingData.concat(`${tag.tagName} : ${tag.tagMessage} , `)
                    }

                    appendingData=appendingData.concat(' }\n');
                    
                };


                if(appendingData){
                    try{
                        fs.appendFileSync(filePath,appendingData,{encoding:'utf-8',flush:true})
                    }catch(err){
                        console.error(`Lid Logger error (id): cannot append data to file at : ${filePath} due to \n\n ${err}`)
                    }
                }
            }catch(err){
                console.error(`Lid Logger error (id): cannot read file at : ${filePath} due to \n\n ${err}`);
            }
           
        }else{
            const currentDateTime=new Date();

            let appendingData=`${currentDateTime.getFullYear()}-${currentDateTime.getMonth().toString().padStart(2,'0')}-${currentDateTime.getDate().toString().padStart(2,'0')}\u00A0:\n`;
            appendingData=appendingData.concat(`\t${currentDateTime.getHours()}::${currentDateTime.getMinutes().toString().padStart(2,'0')}\u00A0:\n`);
            appendingData=appendingData.concat(`\t\t[${currentDateTime.toISOString()}] ${levelName} : ${message} ; { `);

            for (const tag of tags) {
                appendingData=appendingData.concat(`${tag.tagName} : ${tag.tagMessage} , `);
            }

            appendingData=appendingData.concat(' }\n');

            try {
                fs.writeFileSync(filePath,appendingData,{encoding:'utf-8',flush:true});
            } catch (err) {
                console.error(`Lid Logger error (id): cannot write file at : ${filePath} due to \n\n ${err}`)
            }
        }
    }

    private WritefilesCSV(currentDateTime:Date,filePath:string,levelName:string,message:string,tags:tag[],filesAppendMode=true){
        if(filesAppendMode){
            if(!fs.existsSync(filePath)){
                this.WritefilesCSV(currentDateTime,filePath,levelName,message,tags,false);
                return;
            }

            const csvData=fs.readFileSync(filePath,{encoding:'utf-8'});

            if(csvData.length===0){
                this.WritefilesCSV(currentDateTime,filePath,levelName,message,tags,false);
                return;
            }
            
            let fileContentList:string[];
            try{
                fileContentList=csvData.split('\n');
            }catch(err){
                console.error('Lid Logger error (id):Error parsing CSV data due to', err);
                return;
            }

            let dateContentListCursor=fileContentList.length-1;
            let timeContentListCursor=fileContentList.length-1;
            
            const latestDateRegex = /^\d{4}-\d{2}-\d{2}\u00A0:$/;
            const latestTimeRegex  =/^\,\d{2}::\d{2}\u00A0:$/
            let latestDateString:string;
            let latestTimeString:string;

            while(!latestDateRegex.test(fileContentList[dateContentListCursor])){   
                dateContentListCursor--;
                if(dateContentListCursor<0||dateContentListCursor>fileContentList.length){
                    console.error(`Lid Logger error (id): cannot parse file at : ${filePath}`);
                    return;
                }
            }

            latestDateString=fileContentList[dateContentListCursor].slice(0,10);

            while(!latestTimeRegex.test(fileContentList[timeContentListCursor])){
                timeContentListCursor--;
                if(timeContentListCursor<0||timeContentListCursor>fileContentList.length){
                    console.error(`Lid Logger error (id): cannot parse file at : ${filePath}`);
                    return;
                }
            }
            
            
            latestTimeString=fileContentList[timeContentListCursor].slice(1,10);
            
            const latestDateTime=new Date(latestDateString);
    
            const [hours,minutes]=[parseInt(latestTimeString.slice(0,2)),parseInt(latestTimeString.slice(4,6))];
            latestDateTime.setHours(hours);
            latestDateTime.setMinutes(minutes);

            let appendingData:string;


            if(currentDateTime.getDate()===latestDateTime.getDate()){
                if(currentDateTime.getHours()===latestDateTime.getHours()){
                    //same time
                    appendingData=`,,${currentDateTime.toISOString()},${levelName},${message}\n`;

                    if(tags.length){
                        appendingData=appendingData.concat(`,,,tag,tag message\n`);
                        
                        for (const tag of tags) {
                            if(tag.tagMessage){
                                appendingData=appendingData.concat(`,,,${tag.tagName},${tag.tagMessage}\n`);
                            }else{
                                appendingData=appendingData.concat(`,,,${tag.tagName}\n`);
                            }
                        }
                    
                    }
        
                }else{
                    //different time
                    appendingData=`,${currentDateTime.getHours()}::${currentDateTime.getMinutes()}\u00A0:\n,,${currentDateTime.toISOString()},${levelName},${message}\n`;

                    if(tags.length){
                        appendingData=appendingData.concat(`,,,tag,tag message\n`)
                        
                        for (const tag of tags) {
                            if(tag.tagMessage){
                                appendingData=appendingData.concat(`,,,${tag.tagName},${tag.tagMessage}\n`);
                            }else{
                                appendingData=appendingData.concat(`,,,${tag.tagName}\n`);
                            }
                        }
                    }
                    
                }
            }else{
                // with in different date
                appendingData=`${currentDateTime.getFullYear()}-${currentDateTime.getMonth().toString().padStart(2,'0')}-${currentDateTime.getDate().toString().padStart(2,'0')}\u00A0:\n,${currentDateTime.getHours()}::${currentDateTime.getMinutes().toString().padStart(2,'0')}\u00A0:\n,,${currentDateTime.toISOString()},${levelName},${message}\n`;

                if(tags.length){
                    appendingData=appendingData.concat(`,,,tag,tag message\n`)
                
                    for (const tag of tags) {
                        if(tag.tagMessage){
                            appendingData=appendingData.concat(`,,,${tag.tagName},${tag.tagMessage}\n`);
                        }else{
                            appendingData=appendingData.concat(`,,,${tag.tagName}\n`);
                        }
                    }   
                }
                    
            };
            
            
            try {
                fs.appendFileSync(filePath, appendingData,{flush:true});
            } catch (error) {
                console.error(`Lid Logger error (id): cannot append file at : ${filePath} due to :\n ${error}`);
            }

        }else{
            const currentDateTime=new Date();
            let appendingData=[
                [`${currentDateTime.getFullYear()}-${currentDateTime.getMonth().toString().padStart(2,'0')}-${currentDateTime.getDate().toString().padStart(2,'0')}\u00A0:`],
                ['',`${currentDateTime.getHours()}::${currentDateTime.getMinutes().toString().padStart(2,'0')}\u00A0:`],
                ['','',currentDateTime.toISOString(),levelName,message]
            ];

            if(tags.length){
                appendingData.push(['','','','tag','tag message'])
                
                for (const tag of tags) {
                    if(tag.tagMessage){
                        appendingData.push(['','','',tag.tagName,tag.tagMessage]);
                    }else{
                        appendingData.push(['','','',tag.tagName]);
                    }
                }
            }

            const output=stringify(appendingData);
            try{
                fs.writeFileSync(filePath, output,{flush:true});
            }catch(error){
                console.error(`Lid Logger error (id): cannot write file at : ${filePath} due to :\n ${error}`);
            }


        }
    }

    writeConnection(currentDateTime:Date,lvlName:string,level:number,lvlColor:string,message:string,tags:tag[],args:LogArgs){
        if(!this.tcpConnections){return};

        if(!this.isIterable(typeof args.excludeAddresses)){
            //@ts-ignore
            args.excludeAddresses=[args.excludeAddresses]
        }

        if(!this.isIterable(typeof args.excludePorts)){
            //@ts-ignore
            args.excludePorts=[args.excludePorts]
        }
        
        const ExcludedAdderesses=new Set(args.excludeAddresses??[]);
        const ExcludedPort=new Set(args.excludePorts??[]);

        for (const tcp of Object.keys(this.tcpConnections)) {
            const connectionKey=tcp.split('::');
            
            if(ExcludedAdderesses.has(connectionKey[0]) || ExcludedPort.has(connectionKey[1])){continue}
            
            if(this.tcpConnections[tcp].IV){
                this.tcpConnections[tcp].sendData(JSON.stringify({
                    LogTime:currentDateTime.toISOString(),
                    lvlName,
                    level,
                    lvlColor,
                    message,
                    tags
                }));
            }else{
                console.error(`Lid connection error (id): Could not connect to connection ${tcp}`);
            }
        }            
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
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };

        return `#${f(0)}${f(8)}${f(4)}`;
    }

    private isIterable(obj: any): boolean {
        return obj != null && typeof obj[Symbol.iterator] === 'function';
    }

}

export {lidServer} from './tcpServer.js';
export {tcp} from './tcpClient.js';