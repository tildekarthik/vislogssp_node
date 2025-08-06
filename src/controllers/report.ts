import { Request, Response } from 'express';
import { Pool } from 'mysql2/promise';
import { RecordingModel } from '../models/recordings_models';
import { getAuthFromString } from '../utils/login';

export async function getReportPage(req: Request, res: Response) {
    try {
        // Get location code from user authorization (same as index page)
        const locationCode = getAuthFromString(req.cookies.userauth).location_code;

        if (!locationCode) {
            res.status(401).json({ error: 'Location code not found in authentication' });
            return;
        }

        const pool: Pool = req.app.get('dbpool');
        const recordingModel = new RecordingModel(pool);

        // Get last 1 month recordings based on started date (created_at)
        const partialRecordings = await recordingModel.getRecordingsLastMonth(locationCode, 'partial');
        const frozenRecordings = await recordingModel.getRecordingsLastMonth(locationCode, 'frozen');

        // Format data for the view
        const reportData = {
            locationCode,
            summary: {
                partialCount: partialRecordings.length,
                frozenCount: frozenRecordings.length
            },
            partialRecordings: partialRecordings.map((recording: any) => ({
                recordingRef: recording.recording_ref,
                createdAt: recording.created_at
                    ? new Date(recording.created_at + (5.5 * 60 * 60 * 1000)).toLocaleString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    })
                    : 'Unknown'
            })),
            frozenRecordings: frozenRecordings.map((recording: any) => ({
                recordingRef: recording.recording_ref,
                createdAt: recording.created_at
                    ? new Date(recording.created_at + (5.5 * 60 * 60 * 1000)).toLocaleString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    })
                    : 'Unknown',
                frozenAt: recording.frozen_at
                    ? new Date(recording.frozen_at + (5.5 * 60 * 60 * 1000)).toLocaleString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    })
                    : 'Unknown'
            }))
        };

        res.render('pages/reports', reportData);
    } catch (error) {
        console.error('Error loading report page:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}