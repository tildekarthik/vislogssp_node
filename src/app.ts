import express from 'express';
import { createPool } from './utils/dbops';
import { getLoginv2, getLoginCallbackv2, getLogoutv1, protectRoutev2 } from './utils/login';
import { getIndexPage } from './controllers/index';
import { createRecordingHandler as createRetreiveRecordingHandler, freezeRecordingHandler } from './controllers/recordings';
import { uploadImageHandler } from './controllers/images';
import { createRedisClient } from './utils/inferenceredis';

const app = express();
let common_pool = createPool();
app.set('dbpool', common_pool);
// let redisClient = createRedisClient();
// app.set('redisClient', redisClient);

// Pages
app.get('/', protectRoutev2, getIndexPage);

// HTML Fragments API
app.get("/v1/recordings/start", createRetreiveRecordingHandler)
app.post("/v1/images/upload", uploadImageHandler)
app.post("/v1/recordings/freeze", freezeRecordingHandler)




//Login routes
app.get('/v2/login', getLoginv2);
app.get('/v2/login_callback', getLoginCallbackv2);

app.get('/v1/logout', getLogoutv1);
export default app;
