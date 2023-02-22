import type {Socket} from 'node:net';
import {StreamClosedError} from './Stream';
import type Stream from './Stream';

class BufferedStream<T extends Socket> implements Stream {
    private bufferedLength = 0;
    private queue : Buffer[] = [];
    private readResolver : [number, (buffer : Buffer) => void, (reason : unknown) => void] | null = null;
    private closed = false;

    public constructor(private readonly socket : T) {
        socket.on('data', (data : Buffer) => {
            this.bufferedLength += data.length;
            this.queue.push(data);

            if (this.readResolver && this.readResolver[0] <= this.bufferedLength) {
                const [length, resolver] = this.readResolver;
                this.readResolver = null;
                resolver(this.readFromQueue(length));
            }
        });

        /* istanbul ignore next */
        socket.on('error', () => {
            if (this.readResolver) {
                this.readResolver[2](new StreamClosedError('Socket encountered an error'));
            }

            this.closed = true;
        });

        socket.on('close', () => {
            if (this.readResolver) {
                this.readResolver[2](new StreamClosedError('Socket was closed'));
            }

            this.closed = true;
        });
    }

    public async readUint8() : Promise<number> {
        const buffer = await this.readExact(1);
        return buffer.readUInt8();
    }

    public async readUInt32LE() : Promise<number> {
        const buffer = await this.readExact(4);
        return buffer.readUInt32LE();
    }

    public async readExact(length : number) : Promise<Buffer> {
        /* istanbul ignore next */
        if (this.closed) {
            throw new StreamClosedError('Socket was closed');
        }

        /* istanbul ignore next */
        if (this.readResolver) {
            throw new Error('Only one read can be performed at a time');
        }

        if (this.bufferedLength < length) {
            return new Promise((resolve, reject) => {
                this.readResolver = [length, resolve, reject];
            });
        }

        return this.readFromQueue(length);
    }

    private readFromQueue(length : number) : Buffer {
        /* istanbul ignore next */
        if (length > this.bufferedLength) {
            throw new Error('More data requested than what is queued');
        }

        let result : Buffer;
        this.bufferedLength -= length;

        if (length === this.queue[0].length) {
            return this.queue.shift() as Buffer;
        }

        if (length < this.queue[0].length) {
            result = this.queue[0].slice(0, length);
            this.queue[0] = this.queue[0].slice(length);
            return result;
        }

        result = Buffer.allocUnsafe(length);
        let offset = 0;
        let bufferLength;

        while (length > 0) {
            bufferLength = this.queue[0].length;

            if (length >= bufferLength) {
                this.queue[0].copy(result, offset);
                offset += bufferLength;
                this.queue.shift();
            } else {
                this.queue[0].copy(result, offset, 0, length);
                this.queue[0] = this.queue[0].slice(length);
            }

            length -= bufferLength;
        }

        return result;
    }

    public writeUint8(value : number) : void {
        const content = Buffer.allocUnsafe(1);
        content.writeUInt8(value, 0);
        this.writeAll(content);
    }

    public writeUInt32LE(value : number) : void {
        const content = Buffer.allocUnsafe(4);
        content.writeUInt32LE(value, 0);
        this.writeAll(content);
    }

    public writeAll(buffer : Buffer) : void {
        if (this.closed) {
            throw new StreamClosedError('Socket was closed');
        }

        this.socket.write(buffer);
    }

    public close() : void {
        this.socket.end();
        this.closed = true;
    }

    public isClosed() : boolean {
        return this.closed;
    }

    public setTimeout(timeout : number, callback : () => void) : void {
        this.socket.setTimeout(timeout, callback);
    }
}

export default BufferedStream;
