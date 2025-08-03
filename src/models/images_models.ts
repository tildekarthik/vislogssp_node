import { Pool } from 'mysql2/promise';

export interface Image {
    images_pk?: number;
    location_code: string;
    recording_ref: string;
    view_name: string;
    uploaded_at?: number;
}

export class ImageModel {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    /**
     * Create a new image record in the database
     */
    async create(data: Image): Promise<{ insertId: number }> {
        const query = `
            INSERT INTO images (location_code, recording_ref, view_name, uploaded_at)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE uploaded_at = VALUES(uploaded_at)
        `;

        const values = [
            data.location_code,
            data.recording_ref,
            data.view_name,
            data.uploaded_at || Date.now()
        ];

        try {
            const [result] = await this.pool.execute(query, values);
            return { insertId: (result as any).insertId };
        } catch (error: any) {
            throw error;
        }
    }

    /**
     * Find images by recording
     */
    async findByRecording(location_code: string, recording_ref: string): Promise<Image[]> {
        const query = 'SELECT * FROM images WHERE location_code = ? AND recording_ref = ? ORDER BY uploaded_at DESC';

        try {
            const [rows] = await this.pool.execute(query, [location_code, recording_ref]);
            return rows as Image[];
        } catch (error) {
            throw error;
        }
    }

    /**
     * Find image by recording and view
     */
    async findByRecordingAndView(location_code: string, recording_ref: string, view_name: string): Promise<Image | null> {
        const query = 'SELECT * FROM images WHERE location_code = ? AND recording_ref = ? AND view_name = ?';

        try {
            const [rows] = await this.pool.execute(query, [location_code, recording_ref, view_name]);
            const images = rows as Image[];
            return images.length > 0 ? images[0] : null;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Validate image data
     */
    static validateImage(data: any): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!data.location_code || typeof data.location_code !== 'string') {
            errors.push('Location code is required and must be a string');
        }

        if (!data.recording_ref || typeof data.recording_ref !== 'string') {
            errors.push('Recording reference is required and must be a string');
        }

        if (!data.view_name || typeof data.view_name !== 'string') {
            errors.push('View name is required and must be a string');
        }

        if (data.uploaded_at && (!Number.isInteger(data.uploaded_at) || data.uploaded_at < 0)) {
            errors.push('Uploaded at must be a positive integer (epoch time)');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
