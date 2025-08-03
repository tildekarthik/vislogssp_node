import { Request, Response } from 'express';

import { getAuthFromString } from '../utils/login';



export async function getIndexPage(req: Request, res: Response) {
    // let company = getAuthFromString(req.cookies.userauth).company;
    let locationCode = "tvsscsmkp" // Post login activation, this will come from the login
    return res.render('pages/index', { locationCode: locationCode });
}
