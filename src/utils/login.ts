import { Request, Response, NextFunction } from 'express';
import { call_back_url, auth_server, validate_url } from "../../configs/auth_configs.json";
import { jwtDecode } from 'jwt-decode';
import { getUserAuthorizationFromDB } from './dbops';
import { Authorization } from './dbops'; // Assuming Authorization is defined in dbops.ts

const AUTH_SERVER = auth_server;
const CALL_BACK_URL = call_back_url;
const VALIDATE_URL = validate_url;

type Claims = {
    sub: string;
    role: string;
    exp: number;
}



export async function protectRoutev2(req: Request, res: Response, next: NextFunction) {
    // let jwt_token = "";
    // try {
    //     jwt_token = req.cookies.jwt;
    //     // use axios to send the jwt_token to the auth server to verify the json should be {token:jwt_token} and this will send to the validate url
    //     console.log(`jwt_token in protectRoutev2: ${jwt_token}`)
    //     // console.log(`jwt Decoded : ${JSON.stringify(jwtDecode(jwt_token as string))}`);
    //     // const response_decoded = await axios.post(VALIDATE_URL, { token: jwt_token });
    //     // const decoded = response_decoded.data as Claims;
    //     const decoded = jwtDecode(jwt_token) as Claims;
    //     let userauthString = req.cookies.userauth;
    //     let userauth = getAuthFromString(userauthString);
    //     if (decoded && (decoded.sub !== "") && (userauth.username === decoded.sub) && isTokenValid(decoded)) {
    //         return next();
    //     }
    // }
    // catch (err) {
    //     console.log(`err token decoding: ${err}`);
    // }
    // res.redirect('/v2/login');
    return next();
}



export async function getLoginv2(req: Request, res: Response) {
    // TODO: later use req.hostname or req.originalUrl to get the redirect url
    res.redirect(AUTH_SERVER + "?redirect_url=" + CALL_BACK_URL);
}


export async function getLoginCallbackv2(req: Request, res: Response) {
    try {
        const jwt_token = req.query.token;
        // Set the jwt in the cookie and in header
        console.log(`jwt: ${jwt_token}`);
        if ((jwt_token) && (jwt_token !== "")) {
            res.cookie('jwt', jwt_token, { httpOnly: true, maxAge: 3600 * 24 * 7 * 1000, sameSite: 'none', secure: true, expires: new Date(Date.now() + 365 * 24 * 7 * 60 * 60 * 1000) });
            // const response_decoded = await axios.post(VALIDATE_URL, { token: jwt_token });
            // const decoded = response_decoded.data as Claims;
            const decoded = jwtDecode(jwt_token as string) as Claims;
            // if (decoded && (decoded.sub !== "")) {
            //     console.log(`decoded sub: ${decoded.sub}`);
            //     res.cookie('username', decoded.sub, { httpOnly: true, maxAge: 3600 * 24 * 7 * 1000, sameSite: 'none', secure: true, expires: new Date(Date.now() + 365 * 24 * 7 * 60 * 60 * 1000) });
            // }
            // Add the user authorization to the cookie
            let userauth = await getUserAuthorizationFromDB(req.app.get('dbpool'), decoded.sub);
            res.cookie('userauth', JSON.stringify(userauth), { httpOnly: true, maxAge: 3600 * 24 * 7 * 1000, sameSite: 'none', secure: true, expires: new Date(Date.now() + 365 * 24 * 7 * 60 * 60 * 1000) });
            return res.redirect('/');
        }
    } catch (err) {
        console.log(`err: ${err}`);
    }
    return res.redirect('/v2/login');
}

export async function getLogoutv1(req: Request, res: Response) {
    res.clearCookie('jwt');
    res.clearCookie('username'); // Initial days - to be deleted as we no longer set it
    res.clearCookie('userauth');
    return res.redirect('/');
}

export function getAuthFromString(authString: string): Authorization {
    try {
        return JSON.parse(authString) as Authorization;
    } catch (err) {
        console.log(`Error parsing auth string: ${err}`);
        return {
            username: "",
            company: "",
            plant: "",
        };
    }
}


// verify the jwt token
export function isTokenValid(decodedJwt: Claims): boolean {
    // Check if the token is expired
    if (decodedJwt.exp < Date.now() / 1000) {
        return false;
    }
    return true;
}