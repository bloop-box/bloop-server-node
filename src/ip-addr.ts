export type IpAddr = {
    toString : () => string;
};

export class IpV4Addr implements IpAddr {
    private readonly bytes : Buffer;

    public constructor(bytes : Buffer) {
        if (bytes.length !== 4) {
            throw new Error('Bytes must be exactly 4 in length');
        }

        this.bytes = bytes;
    }

    public toString() : string {
        return [...this.bytes].join('.');
    }
}

export class IpV6Addr implements IpAddr {
    private readonly bytes : Buffer;

    public constructor(bytes : Buffer) {
        if (bytes.length !== 16) {
            throw new Error('Bytes must be exactly 16 in length');
        }

        this.bytes = bytes;
    }

    public toString() : string {
        return (
            this.bytes
                .toString('hex')
                .match(/.{4}/g) as string[]
        )
            .map(value => value.replace(/^0+/, ''))
            .join(':')
            .replace(/0000:/g, ':')
            .replace(/:{2,}/g, '::');
    }
}
