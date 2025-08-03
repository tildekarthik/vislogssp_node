import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import dotenv from 'dotenv';
import { InferenceResults } from '../models/inference_models';

import { ViewContext } from '../models/contexts';
import mysql from 'mysql2/promise';
import { ViewImageBuffers, ViewInferenceResults } from '../models/inspectionresults_models';
import { InspectionContext } from '../models/contexts';
import { updateOrCreateViewData } from '../utils/dbops';

dotenv.config();

// Path to your .proto file
const PROTO_PATH = path.resolve(__dirname, './yoloinf.proto');

// Load the .proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const grpcPackage = grpc.loadPackageDefinition(packageDefinition);
const yoloinfserviceProto = grpcPackage.yoloinfservice as any;

// Create the client
const server_grpc = process.env.GRPC_SERVER_URL || "localhost:50047";
const client = new yoloinfserviceProto(server_grpc, grpc.credentials.createInsecure());

// Function to send image buffer for inference
export async function retreiveGRPCInferenceImage(imageBuffer: Buffer, viewContext: ViewContext): Promise<InferenceResults> {

    let modelName = `${viewContext.partnumber}-${viewContext.viewId}`;
    const request = {
        image: imageBuffer,
        model_name: modelName,
        imgsz: 1920,
        conf: 0.5,
        iou: 0.45,
    };
    let results: InferenceResults = { detections: [], image_shape: [] };
    return new Promise((resolve, reject) => {
        client.Inference(request, (error: grpc.ServiceError | null, response: any) => {
            if (error) {
                console.error('Error during inference:', error);
                reject(error);
            } else {
                // Remember that the GRPC definition of response is detections: string. Hence we need to parse
                // the JSON string to get the detection
                let detection = JSON.parse(response.detections) as InferenceResults;
                resolve(detection);
            }
        });
    });
}

