import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { Pool } from 'mysql2/promise';
import { ImageModel } from '../models/images_models';
import { createS3Client, getPreSignedURL, uploadToS3, S3UploadRawData, getImageBufferS3, getJSONConfigFromS3 } from './s3ops';
import dotenv from 'dotenv';

dotenv.config();

export async function generateContainerReport(pool: Pool, locationCode: string, recordingRef: string): Promise<void> {
    try {
        const imageModel = new ImageModel(pool);
        const s3Client = await createS3Client();
        const bucketName = process.env.S3_BUCKET_NAME;

        // Get configurations from S3
        const imageMasterConfig = await getJSONConfigFromS3(s3Client, bucketName!, locationCode, 'image_master_config.json');
        const reportConfigs = await getJSONConfigFromS3(s3Client, bucketName!, locationCode, 'report_config.json');

        // Get all uploaded images for this recording
        const uploadedImages = await imageModel.findByRecording(locationCode, recordingRef);

        // Get view descriptions from config
        // TODO: Create a typed interface for imageMasterConfig.containerViews
        const viewDescriptions = new Map(
            imageMasterConfig.containerViews.map((view: any) => [view.view, view.viewDescription])
        );

        // Create PDF document
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        // Create PDF buffer
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));

        // Add header with more spacing
        doc.y = 100; // Start lower on the page
        doc.fontSize(20)
            .font('Helvetica')
            .text(reportConfigs.reportConfigs.header, { align: 'center' });

        doc.moveDown(1.5);

        // Add title with more spacing
        doc.fontSize(16)
            .font('Helvetica')
            .text(reportConfigs.reportConfigs.title, { align: 'center' });

        doc.moveDown(1.5);

        // Add subtitle with container ref and more spacing
        const subtitle = reportConfigs.reportConfigs.subtitle.replace('{{containerRef}}', recordingRef);
        doc.fontSize(14)
            .font('Helvetica')
            .text(subtitle, { align: 'center' });

        doc.moveDown(2);

        // Add cover notes with more spacing
        doc.fontSize(10)
            .font('Helvetica')
            .text(reportConfigs.reportConfigs.covernote1, { align: 'justify' });

        doc.moveDown(1);
        doc.text(reportConfigs.reportConfigs.covernote2, { align: 'justify' });

        // Add footer to title page
        addFooter(doc, reportConfigs);

        // Download all images in parallel for better performance
        const viewPairs: [string, string][] = [['A', 'B'], ['C', 'D'], ['E', 'F']];
        const allViews = viewPairs.flat(); // ['A', 'B', 'C', 'D', 'E', 'F']

        const imageBuffers = await Promise.all(
            allViews.map(async (view) => {
                const imageKey = `content/${locationCode}/${recordingRef}/${view}.jpg`;
                const buffer = await downloadImageWithRetry(s3Client, bucketName!, imageKey);
                return { view, buffer };
            })
        );

        // Create a map for quick lookup
        const imageBufferMap = new Map(imageBuffers.map(img => [img.view, img.buffer]));

        // Generate pages with pre-downloaded images
        for (let i = 0; i < viewPairs.length; i++) {
            const [view1, view2] = viewPairs[i];

            // Add new page for each pair
            doc.addPage();

            // Calculate image dimensions and positions (stacked vertically)
            const pageWidth = doc.page.width - 100; // Account for margins
            const imageWidth = Math.min(pageWidth, 400); // Max width 400px
            const imageHeight = 200; // Smaller height to fit 2 images per page
            const centerX = (doc.page.width - imageWidth) / 2;
            const firstImageY = 80; // Start from top
            const secondImageY = firstImageY + imageHeight + 60; // Space between images

            // Add first image (using pre-downloaded buffer)
            addImageToPageWithBuffer(doc, imageBufferMap.get(view1)!, view1,
                centerX, firstImageY, imageWidth, imageHeight, (viewDescriptions.get(view1) as string) || view1);

            // Add second image (using pre-downloaded buffer)
            addImageToPageWithBuffer(doc, imageBufferMap.get(view2)!, view2,
                centerX, secondImageY, imageWidth, imageHeight, (viewDescriptions.get(view2) as string) || view2);

            // Add footer to each page
            addFooter(doc, reportConfigs);
        }

        // Finalize PDF
        doc.end();

        // Wait for PDF to be generated
        await new Promise<void>((resolve) => {
            doc.on('end', resolve);
        });

        // Combine buffers
        const pdfBuffer = Buffer.concat(buffers);

        // Upload PDF to S3
        const pdfKey = `content/${locationCode}/${recordingRef}/${recordingRef}.pdf`;
        const uploadData: S3UploadRawData = {
            bucket: bucketName,
            key: pdfKey,
            buffercontent: pdfBuffer,
            contentType: 'application/pdf'
        };

        await uploadToS3(s3Client, uploadData);

    } catch (error) {
        console.error('Error generating PDF report:', error);
        throw error;
    }
}

// Helper function to download image with retry logic
async function downloadImageWithRetry(
    s3Client: any,
    bucketName: string,
    imageKey: string,
    maxRetries: number = 3
): Promise<Buffer> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Use direct S3 getObject for more reliable downloads
            const imageBuffer = await getImageBufferS3(s3Client, bucketName, imageKey);

            return imageBuffer;

        } catch (error) {
            if (attempt === maxRetries) {
                throw new Error(`Failed to download ${imageKey} after ${maxRetries} attempts: ${error}`);
            }

            // Exponential backoff: wait before retrying
            const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    throw new Error(`Failed to download ${imageKey} after all retries`);
}

async function addImageToPage(
    doc: any,
    s3Client: any,
    bucketName: string,
    locationCode: string,
    recordingRef: string,
    view: string,
    x: number,
    y: number,
    width: number,
    height: number,
    description: string
): Promise<void> {
    // Use direct S3 download instead of presigned URL to avoid network issues
    const imageKey = `content/${locationCode}/${recordingRef}/${view}.jpg`;

    // Download image buffer directly from S3 with retry logic
    const imageBuffer = await downloadImageWithRetry(s3Client, bucketName, imageKey);

    // Add image to PDF
    doc.image(imageBuffer, x, y, { width, height, fit: [width, height], align: 'center' });

    // Add image title below
    doc.fontSize(10)
        .font('Helvetica')
        .text(`View ${view}: ${description}`, x, y + height + 10, {
            width,
            align: 'center'
        });
}

function addImageToPageWithBuffer(
    doc: any,
    imageBuffer: Buffer,
    view: string,
    x: number,
    y: number,
    width: number,
    height: number,
    description: string
): void {
    // Add image to PDF using pre-downloaded buffer
    doc.image(imageBuffer, x, y, { width, height, fit: [width, height], align: 'center' });

    // Add image title below
    doc.fontSize(10)
        .font('Helvetica')
        .text(`View ${view}: ${description}`, x, y + height + 10, {
            width,
            align: 'center'
        });
}

function addFooter(doc: any, reportConfigs: any): void {
    // Save current position and font settings
    const currentY = doc.y;
    const currentFont = doc._font;
    const currentFontSize = doc._fontSize;

    // Add footer at bottom of page without creating new page
    const footerText = reportConfigs.reportConfigs.footer;
    const footerY = doc.page.height - 80; // Higher position to avoid page break

    doc.fontSize(8)
        .font('Helvetica')
        .text(footerText, 50, footerY, {
            align: 'center',
            width: doc.page.width - 100
        });

    // Restore previous position and font settings
    doc.y = currentY;
    doc.font('Helvetica'); // Use default font
    if (currentFontSize) {
        doc.fontSize(currentFontSize);
    }
}