import net from 'net';
import crypto from 'crypto';
import { ClientData } from 'types.js';

export class lidServer{
    port:number;
    address:string;
    server:net.Server;
    private serverIV='';
    private secretkey:string;
    options;

    Misc:(data:string)=>void=()=>{};
    serverCallback:()=>void=()=>{
        console.log('lid server is running...');
    }

    constructor(port:number, address:string,secretkey:string,Misc?:(data:string)=>void,serverCallback?:()=>void,option?:any) {
        this.port= port;
        this.address=address;
        this.server= net.createServer(this.handleconnection.bind(this))
        this.serverIV=crypto.randomBytes(16).toString('hex');
        this.secretkey=secretkey;
        this.Misc=Misc??this.Misc;
        this.serverCallback=serverCallback??this.serverCallback;
        this.options=option;
        this.server.listen(this.port,this.address,this.serverCallback);
    }

    handleMessage(socket:net.Socket,clientData:ClientData){
        if(clientData.status==='connected'){
                socket.write(JSON.stringify({
                    IV:this.serverIV,
                    opt:this.options
                }));
        }
        else if(clientData.status==='sending message'){
            try
            {
                this.Misc(JSON.parse(this.decrypt(clientData.message??'',this.serverIV)));
            }
            catch(e)
            {
                console.error(`Lid Error(id) : lid server crashed while parsing client message`);   
            }
        }
    }

    handleData(socket:net.Socket,data:string){
        
        const clientDataStream=data.toString().split('|\n|');

        clientDataStream.forEach((clientMessage)=>{
            if(!clientMessage.trim()){
                return;
            }

            const clientData=JSON.parse(clientMessage) as ClientData;
            this.handleMessage(socket,clientData);
        })
    }

    handleconnection(socket: net.Socket){
            socket.on('data',(data:string)=>{
                this.handleData(socket,data);
            });

            // socket.on('end',()=>{

            // })

            // socket.on('close',()=>{

            // })
    }

    readata(data:string){
        return this.decrypt(data,this.serverIV);
    }

    decrypt(Data:string,IV:string): string {
        const iv=Buffer.from(IV,'hex');
        const hash = crypto.createHash('sha256').update(this.secretkey).digest('base64');
        const finalKey = hash.slice(0, 32);
        const decipher = crypto.createDecipheriv('aes-256-cbc',finalKey, iv);
        const decryptedData = Buffer.concat([decipher.update(Buffer.from(Data,'base64')), decipher.final()]);
        return decryptedData.toString('utf-8');
    }
}