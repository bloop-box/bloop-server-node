import type {TLSSocket} from 'tls';
import type BufferedStream from '../src/BufferedStream';
import {Response} from '../src/client';
import {testServer} from './server-tester';

describe('Authenticate', () => {
    it('should return failure byte on malformed auth string', async () => {
        await testServer({
            authenticate: () => false,
        }, async stream => {
            stream.writeUint8(6);
            stream.writeAll(Buffer.from('foobar', 'ascii'));

            const response = await stream.readUint8();
            expect(response).toBe(Response.invalidAuth);
        }, false);
    });

    it('should return failure byte on invalid auth', async () => {
        await testServer({
            authenticate: () => false,
        }, async stream => {
            stream.writeUint8(7);
            stream.writeAll(Buffer.from('foo:bar', 'ascii'));

            const response = await stream.readUint8();
            expect(response).toBe(Response.invalidAuth);
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
            stream.writeUint8(7);
            stream.writeAll(Buffer.from('foo:bar', 'ascii'));

            const response = await stream.readUint8();
            expect(response).toBe(Response.validAuth);
        }, false);

        expect(result).toEqual({clientId: 'foo', secret: 'bar'});
    });

    it('should buffer packets', async () => {
        let result;

        await testServer({
            authenticate: (clientId, secret) => {
                result = {clientId, secret};
                return true;
            },
        }, async stream => {
            stream.writeUint8(201);
            (stream as BufferedStream<TLSSocket>)['socket'].setNoDelay();
            stream.writeAll(Buffer.from('0'.repeat(50), 'ascii'));
            await new Promise(resolve => setTimeout(resolve, 1));
            stream.writeAll(Buffer.from('0'.repeat(50), 'ascii'));
            await new Promise(resolve => setTimeout(resolve, 1));
            stream.writeAll(Buffer.from(':'));
            await new Promise(resolve => setTimeout(resolve, 1));
            stream.writeAll(Buffer.from('1'.repeat(50), 'ascii'));
            await new Promise(resolve => setTimeout(resolve, 1));
            stream.writeAll(Buffer.from('1'.repeat(55), 'ascii'));

            const response = await stream.readUint8();
            expect(response).toBe(Response.validAuth);
        }, false);

        expect(result).toEqual({clientId: '0'.repeat(100), secret: '1'.repeat(100)});
    });
});
