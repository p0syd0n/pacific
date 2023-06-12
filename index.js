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
const rsa_server = 'https://rsaserver.posydon.repl.co'
const app = express();
import CyclicSessionStore from '@cyclic.sh/session-store';

const options = {
  table: {
    name: process.env.CYCLIC_DB,
  }
};

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

//request to rsa server to generate keys
async function generate_keys() {
  try {
    const response = await fetch(`${rsa_server}/generate_keys`);
    const data = await response.text();
    return JSON.parse(data); // The response data
  } catch (error) {
    console.error(error);
  }
}

// getting data from server
async function get_data() {
  return new Promise((resolve, reject) => {
    let options = {
      method: 'GET',
      url: 'https://pacific-9562.restdb.io/rest/user-data',
      headers: {
        'cache-control': 'no-cache',
        'x-apikey': process.env.API_KEY,
      },
    };
    request(options, function (error, response, body) {
      if (error) reject(error);
      resolve(body);
    });
  });
}

//updating the user info
async function update_user(id, public_key, private_key, username, password) {
  var options = { method: 'PUT',
  url: `https://pacific-9562.restdb.io/rest/user-data/${id}`,//continue here
  headers: 
   { 'cache-control': 'no-cache',
     'x-apikey': process.env.API_KEY,
     'content-type': 'application/json' },
  body: { _id: id, public_key: public_key, private_key: private_key, username: username, password: password },
  json: true };
  request(options, function (error, response, body) {
    if (error) throw new Error(error);
});
}

//adding users
async function add_user(username, password, public_key, private_key) {
  let hashed = await hash(password)
  return new Promise((resolve, reject) => {
    var options = {
      method: 'POST',
      url: 'https://pacific-9562.restdb.io/rest/user-data',
      headers: {
        'cache-control': 'no-cache',
        'x-apikey': process.env.API_KEY,
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

//checking login
async function checkLogin(username, password) {
  const data = await get_data();
  const parsedData = JSON.parse(data);
  for (let i = 0; i < parsedData.length; i++) {
    const user_dict = parsedData[i];
    if (user_dict.username === username) {
      let hashed_pass = await hash(password);
      if (hashed_pass == user_dict.password) {
        return {
          'username': username,
          'public_key': user_dict['public_key'],
          'private_key': user_dict['private_key'], 
          'password': user_dict['password'],
          'id': user_dict['_id']
        };
      }
    }
  }
  return null; // Return null if the login credentials are not found
}

async function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

//helper function for encrypting
async function encrypt_(data, iv = Buffer.from(process.env.INIT_VECTOR, 'hex')) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

//helper function for decrypting
async function decrypt_(encryptedData, iv = Buffer.from(process.env.INIT_VECTOR, 'hex')) {
  const buffer = Buffer.from(encryptedData, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(buffer, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

//rendering login
app.get('/', (req, res) => {
  res.render('login');
});

// updating keys
app.get('/set_keys', async (req, res) => {
  if (req.session.username) {
    //in the session
    req.session.publicKey = req.query.publicKey;
    req.session.privateKey = await encrypt_(req.query.privateKey);
    //in the database
    update_user(req.session.dbId, req.session.publicKey, req.session.privateKey, req.session.username, req.session.password)
  } else {
    res.sendStatus(401);
  }
});

app.get('/main', async (req, res) => {
  //checking if user is logged in
  if (req.session.username) {
    //getting list of users public keys, for the reference
    let data = await get_data();
    data = JSON.parse(data);
    let users_available = '';
    for (let i = 0; i < data.length; i++) {
      let current_user = data[i];
      users_available += `${current_user['username']}:${current_user['public_key']}\n`;
    }
    //rendering main page with necessary information
    res.render('main', {'username': req.session.username, 'private_key': await decrypt_(req.session.privateKey), 'public_key': req.session.publicKey, 'users_available': users_available});
  } else {
    res.redirect('/');
  }
});

//verifying login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  let verify = await checkLogin(username, password);
  if (verify != null) {
    //if not null, saving the credentials to the session
    req.session.username = verify['username'];
    req.session.publicKey = verify['public_key'];
    req.session.privateKey = verify['private_key'];
    req.session.password = verify['password']; //password is hashed in db, so will be hashed in session as well
    req.session.dbId = verify['id'];
    res.redirect('/main');
  } else {
    //if not correct, go back to login
    res.redirect('/');
  }
});

app.post('/add_account', async (req, res) => {
  //generating keys and adding a new account
  const { username, password } = req.body;
  let keys = await generate_keys();
  let encrypted_json_private_key = await encrypt_(JSON.stringify(keys.private_key));
  add_user(username, password, JSON.stringify(keys.public_key), encrypted_json_private_key);
  res.redirect('/'); // Redirect to the login page
});

//rendering account creation
app.get('/create_account', (req, res) => {
  res.render('create_account');
});

app.get('/logout', (req, res) => {
  //destroying session on logout
  req.session.destroy()
  res.redirect('/')
});

app.get('/account', (req, res) => {
  res.render('account_info', {'username': req.session.username, 'password_hash': req.session.password});
});
                                               
app.get('/update_login', async (req, res) => {
  let hashed = await hash(req.query.password)
  update_user(req.session.dbId, req.session.publicKey, req.session.privateKey, req.query.username, hashed)
  res.sendStatus(200);
});

app.listen(3000, () => {
  console.log('server started');
});