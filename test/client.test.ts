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
});
