import { createPool, getAlertContacts } from '../../utils/dbops';
import { Pool } from 'mysql2/promise';

describe('getAlertContacts', () => {
    let pool: Pool;

    beforeAll(() => {
        pool = createPool();
    });

    afterAll(async () => {
        await pool.end();
    });

    it('should return correct mobiles and emails for given company and plant', async () => {
        const company = "prabha";
        const plant = "unit9";
        const expectedMobiles = "+919841570969,+919841570969";
        const expectedEmails = "karthik@aicuedatalab.com,karthik@aicuedatalab.com";

        const [mobiles, emails] = await getAlertContacts(pool, company, plant);

        expect(mobiles).toBe(expectedMobiles);
        expect(emails).toBe(expectedEmails);
    });
});
