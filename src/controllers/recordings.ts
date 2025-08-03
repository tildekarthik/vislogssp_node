import { Request, Response } from 'express';
import { Pool } from 'mysql2/promise';
import { RecordingModel, Recording } from '../models/recordings_models';
import { ImageModel } from '../models/images_models';
import { createS3Client, getPreSignedURL, getJSONConfigFromS3 } from '../utils/s3ops';
import { generateContainerReport } from '../utils/pdfgen';

async function addS3UrlsToContainerViews(pool: Pool, locationCode: string, recordingRef: string): Promise<any[]> {
    try {
        const imageModel = new ImageModel(pool);
        const s3Client = await createS3Client();
        const bucketName = process.env.S3_BUCKET_NAME;

        // Get image master config from S3
        const imageMasterConfig = await getJSONConfigFromS3(s3Client, bucketName!, locationCode, 'image_master_config.json');

        // Get all uploaded images for this recording
        const uploadedImages = await imageModel.findByRecording(locationCode, recordingRef);

        // Create a map of view -> s3url for quick lookup
        const imageUrlMap: { [key: string]: string } = {};

        for (const image of uploadedImages) {
            const key = `content/${image.location_code}/${image.recording_ref}/${image.view_name}.jpg`;
            try {
                const preSignedUrl = await getPreSignedURL(s3Client, bucketName!, key, 3600); // 1 hour expiry
                imageUrlMap[image.view_name] = preSignedUrl;
            } catch (error) {
                console.error(`Error generating presigned URL for view ${image.view_name}:`, error);
                // Continue with other images even if one fails
            }
        }

        // Update containerViews with s3urls
        const containerViewsWithUrls = imageMasterConfig.containerViews.map((view: any) => ({
            ...view,
            s3url: imageUrlMap[view.view] || null
        }));

        return containerViewsWithUrls;
    } catch (error) {
        console.error('Error adding S3 URLs to container views:', error);
        // Return empty array if config cannot be fetched
        return [];
    }
}

async function checkAllImagesPresent(pool: Pool, locationCode: string, recordingRef: string): Promise<boolean> {
    try {
        const imageModel = new ImageModel(pool);
        const s3Client = await createS3Client();
        const bucketName = process.env.S3_BUCKET_NAME;

        // Get image master config from S3
        const imageMasterConfig = await getJSONConfigFromS3(s3Client, bucketName!, locationCode, 'image_master_config.json');

        // Get all uploaded images for this recording
        const uploadedImages = await imageModel.findByRecording(locationCode, recordingRef);

        // Create a set of uploaded view names for quick lookup
        const uploadedViewNames = new Set(uploadedImages.map(img => img.view_name));

        // Get all required view names from config
        const requiredViews = imageMasterConfig.containerViews.map((view: any) => view.view);

        // Check if all required views have been uploaded
        const allPresent = requiredViews.every((viewName: any) => uploadedViewNames.has(viewName));

        // Show which views are missing if not all present (critical for debugging)
        if (!allPresent) {
            const missingViews = requiredViews.filter((viewName: any) => !uploadedViewNames.has(viewName));
            console.log(`Missing views for ${locationCode}/${recordingRef}:`, missingViews);
        }

        return allPresent;
    } catch (error) {
        console.error('Error checking if all images are present:', error);
        return false;
    }
}


export async function createRecordingHandler(req: Request, res: Response) {
    try {
        const locationCode = req.query.locationCode as string;
        const recordingRef = req.query.recordingRef as string;
        const pool: Pool = req.app.get('dbpool');
        const recordingModel = new RecordingModel(pool);
        // Record does not exist database, create a new one
        let dbrecording = await recordingModel.findByLocationAndRef(locationCode, recordingRef);
        if (!dbrecording) {
            const newRecording: Recording = {
                location_code: locationCode,
                recording_ref: recordingRef,
                status: 'partial',
                created_at: Date.now()
            };
            const result = await recordingModel.create(newRecording);
            dbrecording = { ...newRecording, recordings_pk: result.insertId };
        }

        // Get container views with S3 URLs for existing uploaded images
        const containerViews = await addS3UrlsToContainerViews(pool, locationCode, recordingRef);

        // Check if all required images are present
        const allImagesPresent = await checkAllImagesPresent(pool, locationCode, recordingRef);

        // Check if recording is in partial status
        const isPartial = dbrecording.status === 'partial';

        // Get PDF presigned URL if recording is frozen
        let s3pdfurl = null;
        if (dbrecording.status === 'frozen') {
            try {
                const s3Client = await createS3Client();
                const bucketName = process.env.S3_BUCKET_NAME;
                const pdfKey = `content/${locationCode}/${recordingRef}/${recordingRef}.pdf`;
                s3pdfurl = await getPreSignedURL(s3Client, bucketName!, pdfKey, 3600); // 1 hour expiry
            } catch (error) {
                console.error('Error generating PDF presigned URL:', error);
                // s3pdfurl remains null if PDF doesn't exist or error occurs
            }
        }

        res.render('pages/upload', { dbrecording, containerViews, allImagesPresent, isPartial, s3pdfurl });
    } catch (error) {
        console.error('Error creating or updating recording:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function freezeRecordingHandler(req: Request, res: Response) {
    try {
        const { locationCode, recordingRef } = req.body;

        if (!locationCode || !recordingRef) {
            return res.status(400).json({ error: 'Missing locationCode or recordingRef' });
        }

        const pool: Pool = req.app.get('dbpool');
        const recordingModel = new RecordingModel(pool);

        // First find the recording to get its ID
        const recording = await recordingModel.findByLocationAndRef(locationCode, recordingRef);

        if (!recording) {
            return res.status(404).json({ error: 'Recording not found' });
        }

        // Check if recording is already frozen
        if (recording.status === 'frozen') {
            // Recording is already frozen, just redirect back
            return res.redirect(`/v1/recordings/start?locationCode=${encodeURIComponent(locationCode)}&recordingRef=${encodeURIComponent(recordingRef)}`);
        }

        // Check if all required images are present
        const allImagesPresent = await checkAllImagesPresent(pool, locationCode, recordingRef);

        if (allImagesPresent) {
            // Update recording status to frozen and set frozen_at timestamp
            await recordingModel.updateStatus(recording.recordings_pk!, 'frozen');
            await recordingModel.setFrozenTimestamp(recording.recordings_pk!);

            // Generate PDF report
            try {
                console.log(`Generating PDF for ${locationCode}/${recordingRef}`); // Critical log
                await generateContainerReport(pool, locationCode, recordingRef);
            } catch (pdfError) {
                console.error('Error generating PDF report:', pdfError);
                // Continue with redirect even if PDF generation fails
            }
        }

        // Redirect back to the same page with query params
        return res.redirect(`/v1/recordings/start?locationCode=${encodeURIComponent(locationCode)}&recordingRef=${encodeURIComponent(recordingRef)}`);
    } catch (error) {
        console.error('Error freezing recording:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}


