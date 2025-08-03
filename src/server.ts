import express from 'express';
import path from 'path';
import { engine } from 'express-handlebars';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import app from './app';
import compression from 'compression';


dotenv.config();

const PORT = process.env.PORT || 3045;
const PUBLIC_PATH = path.join(__dirname, '../public');
const VIEWS_PATH = path.join(__dirname, '../views');
const server = express();
server.use(compression());
server.enable('trust proxy');
server.disable('x-powered-by');
// Set up static file serving from the "public" directory
server.use(express.static(PUBLIC_PATH));
server.use(express.json({ limit: '300mb' }));
server.use(express.urlencoded({ limit: '300mb', extended: true }));
server.use(cookieParser());
server.set('views', VIEWS_PATH);
// Use Handlebars as the view engine
server.engine('handlebars', engine());
server.set('view engine', 'handlebars');
server.set('view options', { layout: 'layouts/main' });


// Use the "app" exported from the "app.ts" file for route handling
server.use(app);

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
