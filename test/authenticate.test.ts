import type {TLSSocket} from 'tls';
import type BufferedStream from '../src/BufferedStream';
import {AuthResponse} from '../src/client';
import {testServer} from './server-tester';

describe('Authenticate', () => {
    it('should return failure byte on invalid auth', async () => {
        await testServer({
            authenticate: () => false,
        }, async stream => {
            stream.writeUint8(3);
            stream.writeAll(Buffer.from('foo', 'utf-8'));
            stream.writeUint8(3);
            stream.writeAll(Buffer.from('bar', 'utf-8'));
            stream.writeUint8(4);
            stream.writeAll(Buffer.from([192, 168, 0, 1]));

            const response = await stream.readUint8();
            expect(response).toBe(AuthResponse.invalidAuth);
        }, false);
    });

    it('should return success byte on valid auth', async () => {
        let result;

        await testServer({
            authenticate: (clientId, secret) => {
                result = {clientId, secret};
                return true;
            },
        }, async stream => {
            stream.writeUint8(3);
            stream.writeAll(Buffer.from('foo', 'utf-8'));
            stream.writeUint8(3);
            stream.writeAll(Buffer.from('bar', 'utf-8'));
            stream.writeUint8(4);
            stream.writeAll(Buffer.from([192, 168, 0, 1]));

            const response = await stream.readUint8();
            expect(response).toBe(AuthResponse.validAuth);
        }, false);

        expect(result).toEqual({clientId: 'foo', secret: 'bar'});
    });

    it('should parse IPv6', async () => {
        let result;

        await testServer({
            authenticate: (clientId, secret) => {
                result = {clientId, secret};
                return true;
            },
        }, async stream => {
            stream.writeUint8(3);
            stream.writeAll(Buffer.from('foo', 'utf-8'));
            stream.writeUint8(3);
            stream.writeAll(Buffer.from('bar', 'utf-8'));
            stream.writeUint8(6);
            stream.writeAll(Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));

            const response = await stream.readUint8();
            expect(response).toBe(AuthResponse.validAuth);
        }, false);

        expect(result).toEqual({clientId: 'foo', secret: 'bar'});
    });

    it('should fail on invalid IP version', async () => {
        await testServer({
            authenticate: () => false,
        }, async stream => {
            stream.writeUint8(3);
            stream.writeAll(Buffer.from('foo', 'utf-8'));
            stream.writeUint8(3);
            stream.writeAll(Buffer.from('bar', 'utf-8'));
            stream.writeUint8(3);

            const response = await stream.readUint8();
            expect(response).toBe(AuthResponse.invalidAuth);
        }, false);
    });

    it('should buffer packets', async () => {
        let result;

        await testServer({
            authenticate: (clientId, secret) => {
                result = {clientId, secret};
                return true;
            },
        }, async stream => {
            stream.writeUint8(100);
            (stream as BufferedStream<TLSSocket>)['socket'].setNoDelay();
            stream.writeAll(Buffer.from('0'.repeat(50), 'ascii'));
            await new Promise(resolve => setTimeout(resolve, 1));
            stream.writeAll(Buffer.from('0'.repeat(50), 'ascii'));
            await new Promise(resolve => setTimeout(resolve, 1));
            stream.writeUint8(100);
            await new Promise(resolve => setTimeout(resolve, 1));
            stream.writeAll(Buffer.from('1'.repeat(50), 'ascii'));
            await new Promise(resolve => setTimeout(resolve, 1));
            stream.writeAll(Buffer.from('1'.repeat(50), 'ascii'));
            await new Promise(resolve => setTimeout(resolve, 1));
            stream.writeUint8(4);
            await new Promise(resolve => setTimeout(resolve, 1));
            stream.writeAll(Buffer.from([192, 168]));
            await new Promise(resolve => setTimeout(resolve, 1));
            stream.writeAll(Buffer.from([0, 1, 0, 0]));

            const response = await stream.readUint8();
            expect(response).toBe(AuthResponse.validAuth);
        }, false);

        expect(result).toEqual({clientId: '0'.repeat(100), secret: '1'.repeat(100)});
    });
});
