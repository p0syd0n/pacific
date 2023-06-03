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
import { generateKey } from 'crypto';
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
  return NodeRSA.encrypt(data, publicKey, 'base64');
}

// Decrypt data using the private key
function decryptRSA(encryptedData, privateKey) {
  return NodeRSA.decrypt(encryptedData, privateKey);
}

async function generate_keys(bits=2048) {
  const key = new NodeRSA({ bits });
  return { publicKey: key.exportKey('public'), privateKey: key.exportKey('private') }
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
let my_keys = await generate_keys();
// console.log(typeof my_keys.publicKey)
console.log(my_keys.publicKey)
console.log(my_keys.privateKey)
let encrypted = encryptRSA('beans', my_keys.publicKey)
console.log(encrypted);
// console.log(decryptRSA(encrypted, my_keys.privateKey))
let response = await add_user('posydon', 'admin', my_keys.publicKey, my_keys.privateKey);