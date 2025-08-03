import { createClient } from 'redis';
import type { RedisClientOptions, RedisClientType } from 'redis';
import dotenv from 'dotenv';
import { InferenceResults } from '../models/inference_models';
import { ViewContext } from '../models/contexts';
import { ViewImageBuffers, ViewInferenceResults } from '../models/inspectionresults_models';
import { InspectionContext } from '../models/contexts';
import { updateOrCreateViewData } from '../utils/dbops';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

export function createRedisClient(): any {
    // Redis connection
    const REDIS_SERVER = process.env.REDIS_SERVER || "localhost";
    const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "";
    const redisClient = createClient({
        url: `redis://default:${REDIS_PASSWORD}@${REDIS_SERVER}:6379`,
    });
    redisClient.on('error', (err) => {
        console.error('Redis error:', err);
    });
    redisClient.connect().catch(console.error);
    return redisClient;
}

// Function to send image buffer for inference
export async function retreiveRedisInferenceImage(redisClient: any, imageBuffer: Buffer, viewContext: ViewContext, partInferAction: string): Promise<InferenceResults> {
    console.time('retreiveRedisInferenceImage');
    const messageId = uuidv4();
    const modelName = `${viewContext.partnumber}-${viewContext.viewId}`;
    // Earlier conf 0.5, iou 0.45
    const request = {
        message_id: messageId,
        data: {
            image_base64: imageBuffer.toString('base64'),
            model_name: modelName,
            imgsz: 1920,
            conf: 0.25,
            iou: 0.7,
            inferaction: partInferAction,
        },
    };

    await redisClient.lPush('yolo_inference_requests', JSON.stringify(request));
    // console.log('Pushed to Redis:', request);

    // Wait for the response for a timeout of 10 seconds
    const timeout = 10000;
    const start = Date.now();
    while (true) {
        const response = await redisClient.getDel(messageId);
        if (response) {
            const inferenceResults: InferenceResults = JSON.parse(response);
            // console.log('Received from Redis:', inferenceResults);
            console.timeEnd('retreiveRedisInferenceImage');
            return inferenceResults;
        }
        if (Date.now() - start > timeout) {
            console.error('Timeout waiting for Redis response');
            // Throw error if no response is received
            console.timeEnd('retreiveRedisInferenceImage');
            throw new Error('Timeout waiting for Redis response');
        }
        // Sleep for 100ms before checking again
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}
