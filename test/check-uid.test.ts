import {ThrottledUidResult, ValidUidResult, UnknownUidResult} from '../src';
import {CheckUidResponse, Command} from '../src/client';
import {testServer} from './server-tester';

describe('CheckUid', () => {
    it('should return failure byte on unknown uid', async () => {
        await testServer({
            checkUid: async () => Promise.resolve(new UnknownUidResult()),
        }, async stream => {
            stream.writeUint8(Command.checkUid);
            stream.writeAll(Buffer.from('0'.repeat(14), 'hex'));

            const response = await stream.readUint8();
            expect(response).toBe(CheckUidResponse.unknownUid);
        });
    });

    it('should return throttled byte on unknown uid', async () => {
        await testServer({
            checkUid: async () => Promise.resolve(new ThrottledUidResult()),
        }, async stream => {
            stream.writeUint8(Command.checkUid);
            stream.writeAll(Buffer.from('0'.repeat(14), 'hex'));

            const response = await stream.readUint8();
            expect(response).toBe(CheckUidResponse.throttledUid);
        });
    });

    it('should return list of achievements on valid uid', async () => {
        let result;

        await testServer({
            checkUid: async (clientId, uid) => {
                result = {clientId, uid};
                return Promise.resolve(new ValidUidResult([
                    Buffer.from('0'.repeat(32), 'hex'),
                    Buffer.from('1'.repeat(32), 'hex'),
                ]));
            },
        }, async stream => {
            stream.writeUint8(Command.checkUid);
            stream.writeAll(Buffer.from('0'.repeat(14), 'hex'));

            const response = await stream.readUint8();
            expect(response).toBe(CheckUidResponse.validUid);

            const numAchievements = await stream.readUint8();
            expect(numAchievements).toBe(2);

            const firstAchievement = await stream.readExact(16);
            const secondAchievement = await stream.readExact(16);

            expect(firstAchievement).toEqual(Buffer.from('0'.repeat(32), 'hex'));
            expect(secondAchievement).toEqual(Buffer.from('1'.repeat(32), 'hex'));
        });

        expect(result).toEqual({clientId: 'foo', uid: Buffer.from('0'.repeat(14), 'hex')});
    });
});
