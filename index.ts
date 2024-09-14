import {Level,Options,LevelArgs,tagArgs,tag,LogArgs} from './types.js';

import chalk from 'chalk';
import fs from 'fs';
import { tcp } from './tcpclient.js';
import {parse} from 'csv-parse';
import { stringify } from 'csv-stringify/sync';

export default class lid{
    private levels:Level[];
    LevelCount:number=0;
    private options:Options;
    private tcpConnections;
    private files:string|string[]='';

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
            this.tcpConnections=[];
            if(this.isIterable(options)){
                //@ts-ignore
                for (const tcpConnection of options.tcpConnections) {
                    const tcpObject=new tcp(tcpConnection.adderess,tcpConnection.port,tcpConnection.secretKey);
                    this.tcpConnections.push(tcpObject);
                    tcpObject.connect();
                }
            }else{
                //@ts-ignore
                const tcpObject=new tcp(options.tcpConnections.adderess,options.tcpConnections.port,options.tcpConnections.secretKey);
                this.tcpConnections.push(tcpObject);
                tcpObject.connect();
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

    log(level:number|string,message:string,tags:tagArgs[]|undefined=undefined,args:LogArgs,){
        if(!args){
            args={
                excludeConnections:[],
                excludeFiles:[],
                skipConnectionLog:false,
                skipFileLog:false,
                filesAppendMode:true
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

        if(this.options.writeOnconsole)
        {
            this.writeconsole(LoggingLevel.lvlName,LoggingLevel.lvlcolor,message,LoggingTags);
        }
        
        if(this.files.length && !args.skipFileLog)
        {
            this.writefiles(LoggingLevel.lvlName,message,LoggingTags,args);
        }
        
        if(this.tcpConnections?.length && !args.skipConnectionLog)
        {
            this.writeConnection(LoggingLevel.lvlName,LoggingLevel.lvlcolor,message,LoggingTags,args);
        }
    }

    writeconsole(lvlName:string,LvlColor:string,message:string,tags:tag[]=[]){
        console.log(
            `[${new Date().toISOString()}] :`,
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

    writefiles(lvlName:string,message:string,tags:tag[]=[],args:LogArgs){
        if(!this.files){
            return;
        }
        
        if(this.isIterable(this.files)){

            const ExcludedFiles=new Set(args.excludeFiles);

            for (const filePath of this.files) {
                if(ExcludedFiles.has(filePath)){continue};
                //add files exclusion list here
                if(filePath.slice(-3)==="txt"||filePath.slice(-3)==="log"){
                    this.WritefilesTxt(filePath,lvlName,message,tags,args.filesAppendMode);
                }else if(filePath.slice(-3)==="csv"){
                    this.WritefilesCSV(filePath,lvlName,message,tags,args.filesAppendMode);
                }
            }
        }else{
            if(this.files.slice(-3)==="txt"||this.files.slice(-3)==="log"){
                //@ts-ignore
                this.WritefilesTxt(this.files,lvlName,message,tags,args.filesAppendMode);
            }else if(this.files.slice(-3)==="csv"){
                //@ts-ignore
                this.WritefilesCSV(this.files,lvlName,message,tags,args.filesAppendMode);                
            }
        }
        
    }
    
    //TODO:add mode to cahce lated date and time postion at top row of file
    private WritefilesTxt(filePath:string,levelName:string,message:string,tags:tag[],filesAppendMode=true){
        if(filesAppendMode){
            try{
                if(!fs.existsSync(filePath)){
                   
                    this.WritefilesTxt(filePath,levelName,message,tags,false);
                    return;
                }

                const fileCurrentdata=fs.readFileSync(filePath,{encoding:'utf-8'});
                
                const fileContent=fileCurrentdata;

                if(fileContent.length===0){
                    this.WritefilesTxt(filePath,levelName,message,tags,false);
                    return;
                }

                const fileContentList=fileContent.split('\n');
                
                let fileContentListCursor=fileContentList.length;
                
                const latestDateRegex = /^\d{4}-\d{2}-\d{2}\u00A0:$/;
                const latestTimeRegex  =/^\t\d{2}::\d{2}\u00A0:$/
                let latestDateString:string;
                let latestTimeString:string;

                while(!latestDateRegex.test(fileContentList[fileContentListCursor])){   
                    fileContentListCursor--;
                    if(fileContentListCursor<0||fileContentListCursor>fileContentList.length){
                        console.error(`Lid Logger error (id): cannot parse file at : ${filePath}`);
                        return;
                    }
                }

                latestDateString=fileContentList[fileContentListCursor].slice(0,fileContentList[fileContentListCursor].length-2);

                while(!latestTimeRegex.test(fileContentList[fileContentListCursor])){
                    fileContentListCursor++;
                    if(fileContentListCursor<0||fileContentListCursor>fileContentList.length){
                        console.error(`Lid Logger error (id): cannot parse file at : ${filePath}`);
                        return;
                    }
                }
                

                latestTimeString=fileContentList[fileContentListCursor].slice(0,fileContentList[fileContentListCursor].length-2);

                const latestDateTime=new Date(latestDateString);
                const [hours,minutes]=latestTimeString.split('::').map(Number);
                latestDateTime.setHours(hours);
                latestDateTime.setMinutes(minutes);
                
                const currentDateTime=new Date();
                    
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

    private WritefilesCSV(filePath:string,levelName:string,message:string,tags:tag[],filesAppendMode=true){
        if(filesAppendMode){
            if(!fs.existsSync(filePath)){
                this.WritefilesCSV(filePath,levelName,message,tags,false);
                return;
            }

            const csvData=fs.readFileSync(filePath,{encoding:'utf-8'});

            if(csvData.length===0){
                this.WritefilesCSV(filePath,levelName,message,tags,false);
                return;
            }

            parse(csvData, {
                delimiter: ',',
                columns: false,
                relax_column_count: true
            }, (err, fileContentList:string[][]) => {

                if (err) {
                    console.error('Lid Logger error (id):Error parsing CSV data due to', err);
                    return;
                }
                
                let fileContentListCursor=fileContentList.length-1;
                
                const latestDateRegex = /^\d{4}-\d{2}-\d{2}\u00A0:$/;
                const latestTimeRegex  =/^\d{2}::\d{2}\u00A0:$/
                let latestDateString:string;
                let latestTimeString:string;

                while(!latestDateRegex.test(fileContentList[fileContentListCursor][0])){   
                    fileContentListCursor--;
                    if(fileContentListCursor<0||fileContentListCursor>fileContentList.length){
                        console.error(`Lid Logger error (id): cannot parse file at : ${filePath}`);
                        return;
                    }
                }

                latestDateString=fileContentList[fileContentListCursor][0].slice(0,10);

                while(!latestTimeRegex.test(fileContentList[fileContentListCursor][1])){
                    fileContentListCursor++;
                    if(fileContentListCursor<0||fileContentListCursor>fileContentList.length){
                        console.error(`Lid Logger error (id): cannot parse file at : ${filePath}`);
                        return;
                    }
                }
                
                latestTimeString=fileContentList[fileContentListCursor][1].slice(0,10);
                
                const latestDateTime=new Date(latestDateString);
        
                const [hours,minutes]=[parseInt(latestTimeString.slice(0,2)),parseInt(latestTimeString.slice(4,6))];
                latestDateTime.setHours(hours);
                latestDateTime.setMinutes(minutes);

                const currentDateTime=new Date();

                let appendingData:string[][];

                if(currentDateTime.getDate()===latestDateTime.getDate()){
                    if(currentDateTime.getHours()===latestDateTime.getHours()){
                        //same time
                        appendingData=[['','',currentDateTime.toISOString(),levelName,message]];

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
            
                    }else{
                        //different time
                        appendingData=[
                                            ['',`${currentDateTime.getHours()}::${currentDateTime.getMinutes()}\u00A0:`],
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
                        
                    }
                }else{
                    // with in different date
                    appendingData=[
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
                        
                };
                    
                const output=stringify(appendingData);
                
                try {
                    fs.appendFileSync(filePath, output,{flush:true});
                } catch (error) {
                    console.error(`Lid Logger error (id): cannot append file at : ${filePath} due to :\n ${error}`);
                }

            });

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

    writeConnection(lvlName:string,lvlColor:string,message:string,tags:tag[],args:LogArgs){
        if(!this.tcpConnections){return};
        
        const ExcludedConnections=new Set(args.excludeConnections);

        for (const tcpConnection of this.tcpConnections) {
            if(ExcludedConnections.has(tcpConnection.address)){continue};

            tcpConnection.sendData(JSON.stringify({
                levelName:lvlName,
                levelColor:lvlColor,
                message,
                tags
            }));
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