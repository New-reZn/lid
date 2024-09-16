import net from 'net';
import crypto from 'crypto';

export class lidServer{
    port:number;
    address:string;
    server:net.Server;
    private serverIV='';
    private secretkey:string;
    testoption;
    Misc:(data:string)=>void

    constructor(port:number, address:string,secretkey:string,Misc:(data:string)=>void,testoption:any) {
        this.port= port;
        this.address=address;
        this.server= net.createServer(this.handleconnection.bind(this))
        this.serverIV=crypto.randomBytes(16).toString('hex');
        this.secretkey=secretkey;
        this.Misc=Misc;
        this.testoption=testoption;
    }

    handleconnection(socket: net.Socket){
            socket.on('data',(data:string)=>{
                const clientData=JSON.parse(data);
                if(clientData.status==='connected'){
                    socket.write(JSON.stringify({
                        IV:this.serverIV,
                        opt:this.testoption
                    }));
                }else if(clientData.status==='sending message'){
                    try{
                        this.Misc(this.decrypt(clientData.message,this.serverIV));
                    }catch(e){

                    }
                }
            });

            socket.on('end',()=>{

            })

            socket.on('close',()=>{

            })
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