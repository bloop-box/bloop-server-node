import {ThrottledUidResult, ValidUidResult, UnknownUidResult} from '../src';
import {Command, Response} from '../src/client';
import {testServer} from './server-tester';

describe('CheckUid', () => {
    it('should return failure byte on unknown uid', async () => {
        await testServer({
            checkUid: async () => Promise.resolve(new UnknownUidResult()),
        }, async stream => {
            stream.writeUint8(Command.checkUid);
            stream.writeAll(Buffer.from('0'.repeat(14), 'hex'));

            const response = await stream.readUint8();
            expect(response).toBe(Response.unknownUid);
        });
    });

    it('should return throttled byte on unknown uid', async () => {
        await testServer({
            checkUid: async () => Promise.resolve(new ThrottledUidResult()),
        }, async stream => {
            stream.writeUint8(Command.checkUid);
            stream.writeAll(Buffer.from('0'.repeat(14), 'hex'));

            const response = await stream.readUint8();
            expect(response).toBe(Response.throttledUid);
        });
    });

    it('should return list of achievements on valid uid', async () => {
        let result;

        await testServer({
            checkUid: async (clientId, uid) => {
                result = {clientId, uid};
                return Promise.resolve(new ValidUidResult([
                    Buffer.from('0'.repeat(40), 'hex'),
                    Buffer.from('1'.repeat(40), 'hex'),
                ]));
            },
        }, async stream => {
            stream.writeUint8(Command.checkUid);
            stream.writeAll(Buffer.from('0'.repeat(14), 'hex'));

            const response = await stream.readUint8();
            expect(response).toBe(Response.validUid);

            const numAchievements = await stream.readUint8();
            expect(numAchievements).toBe(2);

            const firstAchievement = await stream.readExact(20);
            const secondAchievement = await stream.readExact(20);

            expect(firstAchievement).toEqual(Buffer.from('0'.repeat(40), 'hex'));
            expect(secondAchievement).toEqual(Buffer.from('1'.repeat(40), 'hex'));
        });

        expect(result).toEqual({clientId: 'foo', uid: Buffer.from('0'.repeat(14), 'hex')});
    });
});
