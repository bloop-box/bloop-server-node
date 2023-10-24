import {Command, PingResponse} from '../src/client';
import {testServer} from './server-tester';

describe('Ping', () => {
    it('should respond with pong', async () => {
        await testServer({}, async stream => {
            stream.writeUint8(Command.ping);

            const response = await stream.readUint8();
            expect(response).toBe(PingResponse.pong);
        });
    });
});
