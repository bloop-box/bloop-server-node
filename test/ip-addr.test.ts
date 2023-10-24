import {IpV4Addr, IpV6Addr} from '../src/index';

describe('IpAddr', () => {
    describe('IpV4Addr', () => {
        it('should reject buffer with incorrect length', () => {
            expect(() => {
                new IpV4Addr(Buffer.from([0, 0, 0, 0, 0]));
            }).toThrow('Bytes must be exactly 4 in length');
        });

        it('should format itself to string', () => {
            expect(
                new IpV4Addr(Buffer.from([192, 168, 0, 1])).toString()
            ).toEqual('192.168.0.1');
        });
    });

    describe('IpV6Addr', () => {
        it('should reject buffer with incorrect length', () => {
            expect(() => {
                new IpV6Addr(Buffer.from([0, 0, 0, 0, 0]));
            }).toThrow('Bytes must be exactly 16 in length');
        });

        it('should format itself to string', () => {
            expect(
                new IpV6Addr(Buffer.from([192, 168, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toString()
            ).toEqual('c0a8:1::');
        });
    });
});
