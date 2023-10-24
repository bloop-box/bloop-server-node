import {AudioFoundResult, AudioNotFoundResult} from '../src';
import {Command, GetAudioResponse} from '../src/client';
import {testServer} from './server-tester';

describe('GetAudio', () => {
    it('should return failure byte on unknown audio', async () => {
        await testServer({
            getAudio: async () => Promise.resolve(new AudioNotFoundResult()),
        }, async stream => {
            stream.writeUint8(Command.getAudio);
            stream.writeAll(Buffer.from('0'.repeat(40), 'hex'));

            const response = await stream.readUint8();
            expect(response).toBe(GetAudioResponse.audioNotFound);
        });
    });

    it('should return data on known audio', async () => {
        let result;

        await testServer({
            getAudio: async (id : Buffer) => {
                result = {id};
                return Promise.resolve(new AudioFoundResult(Buffer.from('foobar', 'ascii')));
            },
        }, async stream => {
            stream.writeUint8(Command.getAudio);
            stream.writeAll(Buffer.from('0'.repeat(40), 'hex'));

            const response = await stream.readUint8();
            expect(response).toBe(GetAudioResponse.audioFound);

            const length = await stream.readUInt32LE();
            expect(length).toBe(6);

            const data = await stream.readExact(6);
            expect(data).toEqual(Buffer.from('foobar', 'ascii'));
        });

        expect(result).toEqual({id: Buffer.from('0'.repeat(40), 'hex')});
    });
});
