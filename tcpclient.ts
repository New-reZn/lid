import crypto from 'crypto'; 
import { Socket } from 'node:net';

export class tcp{
    client:Socket;
    port:number;
    address:string;
    private secretKey:string;
    IV:string='';
    opt:any=null;

    constructor(address:string,port:number,secretKey:string){
        this.client=new Socket();
        this.port = port;
        this.secretKey=secretKey;
        this.address = address; 
    }

    async connect(Mics = (data?: string) => {}): Promise<this> {
        this.client.connect(this.port, this.address, () => {
            this.client.write(`|\n|${JSON.stringify({
                status: 'connected'
            })}|\n|`);
        });

        try {
            await new Promise<void>((resolve, reject) => {
                this.client.on('data', (data: Uint8Array) => {
                    try {
                        const clientData = JSON.parse(data.toString());
                        this.IV = clientData.IV;
                        this.opt = clientData.opt;
                        Mics(data.toString() ?? undefined);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });

                this.client.on('error', (error) => {
                    console.error(`lid connection error (id): trouble connecting to server at ${this.address}:${this.port} due to:\n ${error}`);
                    reject(error);
                });
            });

            return this;
        } catch (error) {
            throw new Error(`Failed to connect: ${error}`);
        }
    }

    sendData(message:string) {
        if(!this.IV){
            console.error('lid connection error (id): lid server did not sent key for communication');
            return this;
        }

        try {
            this.client.write(`|\n|${JSON.stringify(
                {
                status:'sending message',
                message:this.encrypt(message,this.IV)
                }
            )}|\n|`);
        } catch (error) {
            console.error(`lid connection error : trouble connecting to server at ${this.address}:${this.port} due to:\n ${error}`);
        }
        
        return this;
    }

    closeConnection(destroyConnection?:boolean) {
        this.client.write(`|\n|${JSON.stringify(
        {
            status:'closing connection'
        })}|\n|`);
        
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