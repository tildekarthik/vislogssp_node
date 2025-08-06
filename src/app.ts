import express from 'express';
import { createPool } from './utils/dbops';
import { getLoginv2, getLoginCallbackv2, getLogoutv1, protectRoutev2 } from './utils/login';
import { getIndexPage } from './controllers/index';
import { createRetreiveRecordingHandler, freezeRecordingHandler } from './controllers/recordings';
import { uploadImageHandler } from './controllers/images';
import { getReportPage } from './controllers/report';

const app = express();
let common_pool = createPool();
app.set('dbpool', common_pool);
// let redisClient = createRedisClient();
// app.set('redisClient', redisClient);

// Pages
app.get('/', protectRoutev2, getIndexPage);

// Button handlers for the index page
// Handles submission and shows the upload page
app.get("/v1/recordings/start", createRetreiveRecordingHandler)
// Handles the individual image uploads in the upload page
app.post("/v1/images/upload", uploadImageHandler)
// Handles freezing a recording and sends back to upload page
app.post("/v1/recordings/freeze", freezeRecordingHandler)


// Report page
app.get('/v1/reports', protectRoutev2, getReportPage);

//Login routes
app.get('/v2/login', getLoginv2);
app.get('/v2/login_callback', getLoginCallbackv2);

app.get('/v1/logout', getLogoutv1);
export default app;
