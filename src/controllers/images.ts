import { Request, Response } from 'express';
import { Pool } from 'mysql2/promise';
import { ImageModel } from '../models/images_models';
import dotenv from 'dotenv';
import { createS3Client, uploadToS3, getPreSignedURL, S3UploadRawData } from '../utils/s3ops';
dotenv.config();

export async function uploadImageHandler(req: Request, res: Response) {
    try {
        // Extract data from request body
        const { view_name, recording_ref, location_code, photo_resized } = req.body;
        console.log("First few characters of photo_resized:", photo_resized.slice(0, 30));

        // Validate required fields
        if (!view_name || !recording_ref || !location_code || !photo_resized) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        let bucketName = process.env.S3_BUCKET_NAME;
        let key = `content/${location_code}/${recording_ref}/${view_name}.jpg`;

        // Process base64 image and upload to S3
        let imageBuffer = dataUrlToBuffer(photo_resized);

        // Create S3 client
        const s3Client = await createS3Client();

        // Prepare S3 upload data
        const uploadData: S3UploadRawData = {
            bucket: bucketName,
            key: key,
            buffercontent: imageBuffer,
            contentType: 'image/jpeg'
        };

        // Upload to S3
        await uploadToS3(s3Client, uploadData);

        // Get presigned URL for the uploaded image
        const preSignedUrl = await getPreSignedURL(s3Client, bucketName!, key, 3600); // 1 hour expiry

        // Save to database using ImageModel
        const pool: Pool = req.app.get('dbpool');
        const imageModel = new ImageModel(pool);

        // Save image metadata to database
        await imageModel.create({
            location_code,
            recording_ref,
            view_name,
            uploaded_at: Date.now()
        });

        // Return img tag with presigned URL
        const imgTag = `<img src="${preSignedUrl}" alt="Uploaded ${view_name}" style="max-width: 100%; height: auto;">`;

        return res.send(imgTag);
    } catch (error) {
        console.error('Error uploading image:', error);
        return res.status(500).json({ error: 'Image upload failed' });
    }
}

export function dataUrlToBuffer(dataUrl: string) {
    let base64Image = dataUrl.split(';base64,').pop() as string;
    return Buffer.from(base64Image, 'base64');
}