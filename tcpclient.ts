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

    connect() {
        
        this.client.connect(this.port, this.address, () => {
            this.client.write(JSON.stringify({
                status:'connected'
            }));
        });

        this.client.on('data', (data:string) => {
            const clientData=JSON.parse(data);
            this.IV=clientData.IV;
            this.opt=clientData.opt;
        });

        this.client.on('close', () => {
            this.client.write(JSON.stringify({status:'disconnecting'}));
        });

        this.client.on('error', (err) => {
        });
    }

    sendData(message:string,IV:string) {
        this.client.write(JSON.stringify({
            status:'sending message',
            message:this.encrypt(message,IV)
        }));
    }

    closeConnection() {
        this.client.write(JSON.stringify({
            status:'closing connection'
        }))
        
        this.client.destroy();
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