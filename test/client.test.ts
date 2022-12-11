import {StreamClosedError} from '../src/Stream';
import {testServer} from './server-tester';

describe('Client', () => {
    it('should close connection on unknown command', async () => {
        await expect(async () => {
            await testServer({}, async stream => {
                stream.writeUint8(255);
                await stream.readUint8();
            });
        }).rejects.toBeInstanceOf(StreamClosedError);
    });

    it('should time out when exceeding auth timeout', async () => {
        let timeout;

        await expect(async () => {
            await testServer({}, async stream => {
                stream.writeUint8(255);
                stream.writeUint8(0);

                await new Promise(resolve => {
                    timeout = setTimeout(resolve, 75);
                });

                stream.writeUint8(1);
            }, false, 50);
        }).rejects.toBeInstanceOf(StreamClosedError);

        clearTimeout(timeout);
    });

    it('should time out when exceeding idle timeout', async () => {
        let timeout;

        await expect(async () => {
            await testServer({}, async stream => {
                await new Promise(resolve => {
                    timeout = setTimeout(resolve, 75);
                });

                stream.writeUint8(1);
            }, true, undefined, 50);
        }).rejects.toBeInstanceOf(StreamClosedError);

        clearTimeout(timeout);
    });
});
