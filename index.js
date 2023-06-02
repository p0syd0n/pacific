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

function get_data() {
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

function add_user(username, password, public_key, private_key) {
  return new Promise((resolve, reject) => {
    var options = {
      method: 'POST',
      url: 'https://pacific-9562.restdb.io/rest/user-data',
      headers: {
        'cache-control': 'no-cache',
        'x-apikey': '61638a95f2bbe9a65b4b337baeff07152897e',
        'content-type': 'application/json',
      },
      body: { username, password, public_key, private_key },
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
  for (let i = 0; i < parsedData.length; i++) {
    const user_dict = parsedData[i];
    if (user_dict.username === username) {
      if (hash(password) === user_dict.password) {
        console.log({
          'username': username,
          'public_key': decrypt(user_dict['public_key']),
          'private_key': decrypt(user_dict['private_key'])
        });
        return {
          'username': username,
          'public_key': decrypt(user_dict['public_key']),
          'private_key': decrypt(user_dict['private_key'])
        };
      }
    }
  }
  return null; // Return null if the login credentials are not found
}

function hash(data) {
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
  res.render('index');
});

app.get('/main', (req, res) => {
  if (req.session.username) {
    res.render('main', {'username': req.session.username});
  } else {
    res.redirect('/')
  }
});

app.get('/encrypt', (req, res) => {

});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  let verify = await  checkLogin(username, password);

  if (verify != null) {
    req.session.username = verify['username'];
    req.session.public_key = verify['public_key'];
    req.session.private_key = verify['private_key'];
    res.redirect('/main');
  } else {
    res.sendStatus(401);
  }
});

app.listen(3000, () => {
  console.log('server started');
});


// let data = await get_data();
// console.log(data);

//let response = await add_user('posydon', hash('admin'), encrypt('pub_key'), encrypt('priv_key'));
//console.log(await checkLogin('posydon', 'admin'));