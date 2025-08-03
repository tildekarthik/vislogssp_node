import { Request, Response } from "express";
import multer from "multer";
import multerS3 from "multer-s3";
import 'dotenv/config';
import { S3Client } from "@aws-sdk/client-s3";

function createS3Upload() {

    const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || "";
    const s3 = new S3Client({
        region: "ap-south-1",
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        }
    });
    const storagePOD = multerS3({
        s3: s3,
        bucket: S3_BUCKET_NAME,
        acl: 'private', // or 'private' depending on your requirements
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req: Request, file, cb) => {

            // Get the inspection id from the form hidden field
            let inspectionId = req.body.inspectionId;
            // Swapping the file name with the inspection id to avoid overwriting
            let view = file.originalname.split('.')[0]; // Like A, B, C, D
            let newFileName = `${inspectionId}_${view}.${file.originalname.split('.')[1]}`;
            let fileKey = `inspect/uploads/${req.params.company}/${req.params.plant}/${req.params.partnumber}/${inspectionId}/${view}/${newFileName}`
            // console.log(`File key: ${fileKey}`);
            cb(null, fileKey);
        },
    })

    const upload = multer({
        storage: storagePOD,
    });

    return upload;
}

export const uploadS3 = createS3Upload();


const storage = multer.memoryStorage();
export const uploadMem = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit per file
        files: 5 // maximum 5 files
    }
});