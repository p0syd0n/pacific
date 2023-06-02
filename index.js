import express from 'express';
import session from 'express-session';
import fetch from 'node-fetch';
import io from 'socket.io-client';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';
import { config } from 'dotenv';
import request from 'request';
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const key = Buffer.from(process.env.ENCRYPT_KEY, 'hex');
const algorithm = 'aes-256-cbc';
const app = express();

app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.set('views', __dirname + '/views');

app.use(
  session({
    secret: process.env.SESSION_KEY || '9f3c25faf860b4057ea0845607dbd3d3488625070a43c974fd31ebec98393991',
    resave: true,
    saveUninitialized: true,
    cookie: {
      maxAge: 3600000, // 1 hour
    },
  })
);

// Encrypt data using the public key
function encryptRSA(data, publicKey) {
  return crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(data, 'utf-8')
  ).toString('base64');
}

// Decrypt data using the private key
function decryptRSA(encryptedData, privateKey) {
  return crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(encryptedData, 'base64')
  ).toString('utf-8');
}

async function generate_keys(bits=2048) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: bits,
  });
  const publicKeyStr = publicKey.export({ type: 'spki', format: 'pem' });
  const privateKeyStr = privateKey.export({ type: 'pkcs8', format: 'pem' });
  return { publicKey: publicKeyStr, privateKey: privateKeyStr };
}

async function get_data() {
  return new Promise((resolve, reject) => {
    let options = {
      method: 'GET',
      url: 'https://pacific-9562.restdb.io/rest/user-data',
      headers: {
        'cache-control': 'no-cache',
        'x-apikey': '61638a95f2bbe9a65b4b337baeff07152897e',
      },
    };

    request(options, function (error, response, body) {
      if (error) reject(error);
      resolve(body);
    });
  });
}

async function add_user(username, password, public_key, private_key) {
  let hashed = await hash(password)
  return new Promise((resolve, reject) => {
    var options = {
      method: 'POST',
      url: 'https://pacific-9562.restdb.io/rest/user-data',
      headers: {
        'cache-control': 'no-cache',
        'x-apikey': '61638a95f2bbe9a65b4b337baeff07152897e',
        'content-type': 'application/json',
      },
      body: { username, password: hashed, public_key, private_key },
      json: true,
    };

    request(options, function (error, response, body) {
      if (error) reject(error);
      resolve(body);
    });
  });
}


async function checkLogin(username, password) {
  const data = await get_data();
  const parsedData = JSON.parse(data);
  console.log(parsedData)
  for (let i = 0; i < parsedData.length; i++) {
    const user_dict = parsedData[i];
    if (user_dict.username === username) {
      console.log('usernames match');
      console.log(password);
      let hashed_pass = await hash(password);
      if (hashed_pass == user_dict.password) {
        console.log(password)
        console.log('correct')
        return {
          'username': username,
          'public_key': user_dict['public_key'],
          'private_key': user_dict['private_key']
        };
      }
    }
  }
  return null; // Return null if the login credentials are not found
}

async function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function encrypt(data, iv = Buffer.from(process.env.INIT_VECTOR, 'hex')) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(encryptedData, iv = Buffer.from(process.env.INIT_VECTOR, 'hex')) {
  const buffer = Buffer.from(encryptedData, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(buffer, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

app.get('/', (req, res) => {
  res.render('login');
});

app.get('/main', (req, res) => {
  if (req.session.username) {
    res.render('main', {'username': req.session.username});
  } else {
    res.redirect('/')
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  let verify = await checkLogin(username, password);
  if (verify != null) {
    req.session.username = verify['username'];
    req.session.publicKey = verify['public_key'];
    req.session.privateKey = verify['private_key'];
    res.redirect('/main');
  } else {
    res.sendStatus(401);
  }
});

app.post('/add_account', async (req, res) => {
  const { username, password } = req.body;
  let keys = await generate_keys();
  console.log(username, password);
  let hashed = await hash(password)
  add_user(username, hashed, keys.publicKey, encrypt(keys.privateKey));
  res.redirect('/'); // Redirect to the login page
});

app.get('/encrypt', (req, res) => {
  const data = req.query.data
  const publicKey = req.query.publicKey
  if (publicKey === `-----BEGIN PUBLIC KEY-----
  MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtkwwSc0B88G1RqNUAHWY
  /RkRUZO2Yz6Y4xJR1LFcH+xulnRepEUpfvwXePzrY2ymBOFeMGN89uRcgTgbZSrj
  siSYJ1s7SYL+N33RLDXyL1dBv1an2M5h9vv6uLX7EQz7RcwR9abuOvRNLeiGUbL2
  Ano+zhqLN3Gg0bNR0YkND7Lbj2RFPPI5Fs0/WypoJbAKtjqjNY0bkkMY7dy3I3uq
  YEWn66RPdkpCOpgjkWB8hjp2UeUBKBSg6foCivtrRmX/17eNzp5xU5+YRAqmk+7Q
  ZuNvm82mOobuNCCV+e5Cd54W3kbrZTRArGxbtXwG4HzXl+js5W9Im4GfgRNnhk7H
  AQIDAQAB
  -----END PUBLIC KEY-----`) {
    console.log('SAME KEY')
  }
  return encryptRSA(data, publicKey)
});

app.get('/create_account', (req, res) => {
  res.render('create_account');
});

app.listen(3000, () => {
  console.log('server started');
});


// let data = await get_data();
// console.log(data);
// let my_keys = await generate_keys();
// console.log(typeof my_keys.publicKey)
// console.log(my_keys.publicKey)
// console.log(my_keys.privateKey)
// let encrypted = encryptRSA('beans', my_keys.publicKey)
// console.log(encrypted);
// // console.log(decryptRSA(encrypted, my_keys.privateKey))
// let response = await add_user('posydon', 'admin', my_keys.publicKey, my_keys.privateKey);


/*public:
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtkwwSc0B88G1RqNUAHWY
/RkRUZO2Yz6Y4xJR1LFcH+xulnRepEUpfvwXePzrY2ymBOFeMGN89uRcgTgbZSrj
siSYJ1s7SYL+N33RLDXyL1dBv1an2M5h9vv6uLX7EQz7RcwR9abuOvRNLeiGUbL2
Ano+zhqLN3Gg0bNR0YkND7Lbj2RFPPI5Fs0/WypoJbAKtjqjNY0bkkMY7dy3I3uq
YEWn66RPdkpCOpgjkWB8hjp2UeUBKBSg6foCivtrRmX/17eNzp5xU5+YRAqmk+7Q
ZuNvm82mOobuNCCV+e5Cd54W3kbrZTRArGxbtXwG4HzXl+js5W9Im4GfgRNnhk7H
AQIDAQAB
-----END PUBLIC KEY-----
*/

/*private:
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC2TDBJzQHzwbVG
o1QAdZj9GRFRk7ZjPpjjElHUsVwf7G6WdF6kRSl+/Bd4/OtjbKYE4V4wY3z25FyB
OBtlKuOyJJgnWztJgv43fdEsNfIvV0G/VqfYzmH2+/q4tfsRDPtFzBH1pu469E0t
6IZRsvYCej7OGos3caDRs1HRiQ0PstuPZEU88jkWzT9bKmglsAq2OqM1jRuSQxjt
3Lcje6pgRafrpE92SkI6mCORYHyGOnZR5QEoFKDp+gKK+2tGZf/Xt43OnnFTn5hE
CqaT7tBm42+bzaY6hu40IJX57kJ3nhbeRutlNECsbFu1fAbgfNeX6Ozlb0ibgZ+B
E2eGTscBAgMBAAECggEADRSwOdl3sISns/EEFfDaSJ4H/bssURiEqrWNsOYFouZJ
pKrmwCGU2c9vxT8bymN5UbwUsMLwzHwELcMHhzXBxy6ESv2rRkn7oSJ6dBJOZap8
laTbkC11/t2jpuWrBXURojdjmgWPjmQplhfbbIkbiT+5mjsyHmk9RZLZFgCgMu4u
+EeDcUzcnhhwtlZQoOZKMCwu6zB4na+0ZRQ3M03RzwDUO4KqnCywH1R58Mof65yv
iBVLGdu2uGsOgT0v3xEcE8xiQwx+OLFhKQCXq7jyH3sTnWLJkE/wkvMuJl/YIcLf
/kSR9aUEMmkIlJYeEhVtNycwIH2NufcPwklvpPrB2QKBgQDgE1dr4aYy3BCs6SYY
gtK9tAiDdychvG0/VPOsmoBt4Y73pv6V3gzWOjHiAfxgONsD6nnOq8i+9DWHBCev
f27L91fGSr+7ViFQOmLzqPnCnkWAa7zoJzq14qOrguuhV2Upwhu71lChZ3QxLjWG
FEy3RB63VKIXVRb7VYxo365KKQKBgQDQRRbmsL2iKWUim8ThIu0/DB/Cii2dxck3
TZp3L1CMMdAa2+vsMIbXlwCx1kPu6mECzkLUFRQ8e5LoWFjnCNfTOHaV4OBgf9NA
xRj0MR1AOWMoJusbvlx0ljqZOi7rwRJdGdoFOlzC7FwKE7h8sLJ2BYAJSNM5J2YM
rZ9taLBhGQKBgQCcXGLQoTF8pBvuzPMMf53XSt31/xuLaxVA8GLpuxaLlq5RGnLk
2YJTq2BLud8GtiX+4YwGL9FxjrAbe0bGLEKAiiTx9g89BqlQdq2+IdfHevI83vF/
foB1k6VqdX0/pOCu9wirVq4FM0/dUcV/voKaECru+1vwtCvJTrUgKZZRoQKBgGm4
6KsqRNkwkjpDQGnYxP4gNW8XnZhdcos0RZkC16yTDMTVpqk66Pg/mwarcciyCZTX
B22JVcBuKmDvmBGPl5+NJgVnJf9WY/KZGtW6qNKVTxRuzSJEO8KjEBQASRk75QqF
uPq2aag5O2+SGzCQscbfe+M6qJ52tYLyD+AGKKLhAoGAWSIcSwUiyo5JRoqB5Jk8
k5mXtccr5lGlEk6PKCtHS+i7lfhJ690440hwyhhVHOQ0vOyZx8KzUXPKDfg7XRcY
572o/ttp1C0wxsP8E/AlIlcWvjK6Qf2AleTM5CB3ZLKkDY39O4W4RfusEtvjXO9r
IHr8eHs46Phgyx8cQzjhHls=
-----END PRIVATE KEY-----
*/