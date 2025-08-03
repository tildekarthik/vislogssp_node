import fs from 'fs';
import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';
import { InferenceResults } from '../models/inference_models';
import { create } from 'axios';
import { ViewImageBuffers } from '../models/inspectionresults_models';

export async function drawBoundingBoxes(imageUrlOrBuffer: string | Buffer,
    targetInferenceData: InferenceResults,
    keys: string[],
    color: string = "#FF4040"): Promise<string> {
    const image = await loadImage(imageUrlOrBuffer);
    const canvas = createCanvas(targetInferenceData.image_shape[1], targetInferenceData.image_shape[0]);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(image, 0, 0, targetInferenceData.image_shape[1], targetInferenceData.image_shape[0]);
    targetInferenceData.detections.forEach(detection => {
        if (keys.includes(detection.class_name)) {
            const [x1, y1, x2, y2] = detection.xyxyn.map((coord, index) =>
                Math.floor(index % 2 === 0 ? coord * targetInferenceData.image_shape[1] : coord * targetInferenceData.image_shape[0])
            );
            ctx.lineWidth = 4;
            ctx.strokeStyle = color;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            // Calculate the center of the bounding box
            const centerX = (x1 + x2) / 2;
            const centerY = (y1 + y2) / 2;

            // Set font and alignment for the text
            ctx.font = '20px Arial';
            ctx.fillStyle = '#FFEA00';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Draw the class name in the center of the bounding box
            ctx.fillText(detection.class_name, centerX, centerY);

        }
    });
    ctx.save();
    const dataUrl = canvas.toDataURL();
    return dataUrl;
}
export function loadBase64ImagesToViews(base64Images: string[], viewNames: string[]) {
    let viewFiles: ViewImageBuffers = {};
    for (let i = 0; i < viewNames.length; i++) {
        viewFiles[viewNames[i]] = dataUrlToBuffer(base64Images[i]);
    }
    return viewFiles;
}

export function dataUrlToBuffer(dataUrl: string) {
    let base64Image = dataUrl.split(';base64,').pop() as string;
    return Buffer.from(base64Image, 'base64');
}

