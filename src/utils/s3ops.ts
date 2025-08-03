import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

dotenv.config();

export type S3UploadRawData = {
    bucket?: string;
    key: string;
    buffercontent: Buffer;
    contentType: string;
};

export async function createS3Client() {
    const client = new S3Client({
        region: "ap-south-1", // Change to your region
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        }
    });
    return client;
};

export async function getPreSignedURL(s3Client: any, bucketName: string, key: string, expiresIn: number = 3600) {
    const preSignedParams = {
        Bucket: bucketName,
        Key: key,
    };
    const command = new GetObjectCommand(preSignedParams);
    return getSignedUrl(s3Client, command, { expiresIn: expiresIn });
}


export async function uploadToS3(s3Client: any, uploadData: S3UploadRawData) {
    const params = {
        Bucket: uploadData.bucket,
        Key: uploadData.key,
        Body: uploadData.buffercontent,
        ContentType: uploadData.contentType,
    };
    let cmd = new PutObjectCommand(params);
    return s3Client.send(cmd);
}


export async function getImageBufferS3(s3Client: S3Client, bucketName: string, key: string) {
    const params = {
        Bucket: bucketName,
        Key: key,
    };
    let cmd = new GetObjectCommand(params);
    let response = await s3Client.send(cmd);
    let byteArray = await response.Body?.transformToByteArray() as Uint8Array;
    return Buffer.from(byteArray);
}

export async function getJSONConfigFromS3(s3Client: S3Client, bucketName: string, locationCode: string, fileName: string): Promise<any> {
    const configKey = `configs/${locationCode}/${fileName}`;

    try {
        const params = {
            Bucket: bucketName,
            Key: configKey,
        };

        const cmd = new GetObjectCommand(params);
        const response = await s3Client.send(cmd);
        const configText = await response.Body?.transformToString('utf-8');

        if (!configText) {
            throw new Error(`Empty config file: ${configKey}`);
        }

        return JSON.parse(configText);
    } catch (error) {
        console.error(`Error fetching config ${configKey} from S3:`, error);
        throw new Error(`Failed to fetch config ${fileName} for location ${locationCode}: ${error}`);
    }
}
