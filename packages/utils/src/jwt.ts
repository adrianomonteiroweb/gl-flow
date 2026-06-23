import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export function createJWT(user: any) {
  const tokenKey = process.env.TOKEN_KEY;
  if (!tokenKey) {
    throw new Error('TOKEN_KEY environment variable is not set');
  }

  const access_token = jwt.sign(
    {
      sub: user.id,
      email: user.email.toLowerCase(),
    },
    tokenKey,
    {
      expiresIn: 262800 * 60, // 6 months in seconds
      algorithm: 'HS256',
    }
  );

  const decoded: any = jwt.decode(access_token);
  const expires = new Date(decoded.exp * 1000);

  delete user?.passcode;
  delete user?.password;

  return { access_token, expires, user };
}

export function verifyJWT(access_token: string, token_key: string = process.env.TOKEN_KEY || '') {
  const decoded: any = jwt.verify(access_token, token_key);
  return decoded;
}

export function decodeJWT(access_token: string) {
  return jwt.decode(access_token);
}
