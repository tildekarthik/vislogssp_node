import { Pool } from 'mysql2/promise';

export interface Recording {
    recordings_pk?: number;
    location_code: string;
    recording_ref: string;
    status?: string;
    created_at?: number;
    frozen_at?: number;
}



export class RecordingModel {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    /**
     * Create a new recording in the database
     */
    async create(data: Recording): Promise<{ insertId: number }> {
        const query = `
            INSERT INTO recordings (location_code, recording_ref, status, created_at)
            VALUES (?, ?, ?, ?)
        `;

        const values = [
            data.location_code,
            data.recording_ref,
            data.status || 'partial',
            data.created_at || Date.now()
        ]; try {
            const [result] = await this.pool.execute(query, values);
            return { insertId: (result as any).insertId };
        } catch (error: any) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Recording already exists for this location and reference');
            }
            throw error;
        }
    }

    /**
     * Find a recording by its primary key
     */
    async findById(recordingsPk: number): Promise<Recording | null> {
        const query = 'SELECT * FROM recordings WHERE recordings_pk = ?';

        try {
            const [rows] = await this.pool.execute(query, [recordingsPk]);
            const recordings = rows as Recording[];
            return recordings.length > 0 ? recordings[0] : null;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Find a recording by location code and recording reference
     */
    async findByLocationAndRef(location_code: string, recording_ref: string): Promise<Recording | null> {
        const query = 'SELECT * FROM recordings WHERE location_code = ? AND recording_ref = ?';

        try {
            const [rows] = await this.pool.execute(query, [location_code, recording_ref]);
            const recordings = rows as Recording[];
            return recordings.length > 0 ? recordings[0] : null;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Update recording status
     */
    async updateStatus(recordingsPk: number, status: string): Promise<boolean> {
        const query = 'UPDATE recordings SET status = ? WHERE recordings_pk = ?';

        try {
            const [result] = await this.pool.execute(query, [status, recordingsPk]);
            return (result as any).affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Set frozen_at timestamp for a recording
     */
    async setFrozenTimestamp(recordingsPk: number): Promise<boolean> {
        const query = 'UPDATE recordings SET frozen_at = ? WHERE recordings_pk = ?';
        const frozenAt = Date.now();

        try {
            const [result] = await this.pool.execute(query, [frozenAt, recordingsPk]);
            return (result as any).affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get recordings by location and status from the last month based on created_at
     */
    async getRecordingsLastMonth(location_code: string, status: string): Promise<Recording[]> {
        const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago
        const query = 'SELECT * FROM recordings WHERE location_code = ? AND status = ? AND created_at >= ? ORDER BY created_at DESC';

        try {
            const [rows] = await this.pool.execute(query, [location_code, status, oneMonthAgo]);
            return rows as Recording[];
        } catch (error) {
            throw error;
        }
    }

    /**
     * Validate recording data
     */
    static validateRecording(data: any): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!data.location_code || typeof data.location_code !== 'string') {
            errors.push('Location code is required and must be a string');
        }

        if (!data.recording_ref || typeof data.recording_ref !== 'string') {
            errors.push('Recording reference is required and must be a string');
        }

        if (data.status && typeof data.status !== 'string') {
            errors.push('Status must be a string');
        }

        if (data.created_at && (!Number.isInteger(data.created_at) || data.created_at < 0)) {
            errors.push('Created at must be a positive integer (epoch time)');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}