export class StreamClosedError extends Error {}

type Stream = {
    readUint8 : () => Promise<number>;
    readUInt32LE : () => Promise<number>;
    readExact : (length : number) => Promise<Buffer>;
    writeUint8 : (value : number) => void;
    writeUInt32LE : (value : number) => void;
    writeAll : (buffer : Buffer) => void;
    close : () => void;
    isClosed : () => boolean;
    setTimeout : (timeout : number, callback : () => void) => void;
};

export default Stream;
