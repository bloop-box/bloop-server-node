import {closeOpenServer} from './server-tester';

afterAll(async () => {
    await closeOpenServer();
});
