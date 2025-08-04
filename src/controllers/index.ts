import { Request, Response } from 'express';

import { getAuthFromString } from '../utils/login';



export async function getIndexPage(req: Request, res: Response) {
    let locationCode = getAuthFromString(req.cookies.userauth).location_code;
    console.log(`locationCode: ${locationCode}`);
    console.log(`req.cookies.userauth: ${req.cookies.userauth}`);
    // let locationCode = "tvsscsmkp" // Post login activation, this will come from the login
    return res.render('pages/index', { locationCode: locationCode });
}
