import crypto from 'crypto'; 
import { Socket } from 'node:net';

export class tcp{
    client:Socket;
    port:number;
    address:string;
    secretKey:string;
    IV:string='';
    opt:any=null;

    constructor(address:string,port:number,secretKey:string){
        this.client=new Socket();
        this.port = port;
        this.secretKey=secretKey;
        this.address = address; 
    }

    connect(Mics=(data?:string)=>{}) {   
        this.client.connect(this.port, this.address, () => 
        {
            this.client.write(JSON.stringify({
                status:'connected'
            }));
        });

        this.client.on('data', (data:Uint8Array) => 
        {
            const clientData=JSON.parse(data.toString());
            this.IV=clientData.IV;
            this.opt=clientData.opt;
            Mics(data.toString()??undefined);
        });

        this.client.on('close', () => 
        {
            this.client.write(JSON.stringify({status:'disconnecting'}));
        });

        this.client.on('error', (error) => {
            console.error(`lid connection error (id): trouble connecting to server at ${this.address}:${this.port} due to:\n ${error}`);
        });
        
        return this;
    }

    sendData(message:string) {
        if(!this.IV){
            console.error('lid connection error (id): lid server did not sent key for communication');
            return;
        }

        try {
            this.client.write(JSON.stringify(
                {
                status:'sending message',
                message:this.encrypt(message,this.IV)
                }
            ));
        } catch (error) {
            console.error(`lid connection error : trouble connecting to server at ${this.address}:${this.port} due to:\n ${error}`);
        }
        
        return this;
    }

    closeConnection(destroyConnection?:boolean) {
        this.client.write(JSON.stringify(
        {
            status:'closing connection'
        }
        ));
        
        this.IV=``;
        if(destroyConnection){
            this.client.destroy();
        }
    }

    get Options(){
        return this.opt;
    }

    private encrypt(data:string,IV:string): string {
        const iv=Buffer.from(IV,'hex');
        const hash = crypto.createHash('sha256').update(this.secretKey).digest('base64');
        const finalKey = hash.slice(0, 32);
        const cipher = crypto.createCipheriv('aes-256-cbc', finalKey, iv);
        const encryptedData = Buffer.concat([cipher.update(data, 'utf-8'), cipher.final()]);
        return encryptedData.toString('base64');
    }
}