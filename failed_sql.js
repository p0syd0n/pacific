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


async function generate_keys() {
  try {
    const response = await fetch(`${rsa_server}/generate_keys`);
    const data = await response.text();
    return JSON.parse(data); // The response data
  } catch (error) {
    console.error(error);
  }
}

async function get_data() {
  try {
    const response = await executeSQL("SELECT * FROM main.users;");
    return JSON.parse(response);
  } catch (error) {
    console.log('error', error);
    throw error;
  }
}


async function update_user(username, password, public_key, private_key) {
  try {
    const response = await executeSQL(`UPDATE main.users SET password = '${password}', private_key =  '${private_key}', public_key ='${public_key}' WHERE username = '${username}'`);
    console.log(JSON.parse(response));
    return JSON.parse(response);
  } catch (error) {
    console.log('error', error);
    throw error;
  }
}

async function add_user(username, password, public_key, private_key) {
  let hashed = await hash(password)
  //let hashed = password;
  try {
    const response = await executeSQL(`INSERT INTO main.users (username, password, public_key, private_key) VALUE ('${username}', '${hashed}', '${public_key}', '${private_key}')`);
    return JSON.parse(response);
  } catch (error) {
    console.log('error', error);
    throw error;
  }
}

async function executeSQL(sql) {
  try {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", "Basic cG9zeWRvbjozM0tvcm92eSE=");

    var raw = JSON.stringify({
      "operation": "sql",
      "sql": sql
    });

    var requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow'
    };

    const response = await fetch("https://users-pacific.harperdbcloud.com", requestOptions);
    const result = await response.text();
    return result;
  } catch (error) {
    console.log('error', error);
    throw error;
  }
}

async function checkLogin(username, password) {
  let parsedData = await get_data();
  for (let i = 0; i < parsedData.length; i++) {
    const user_dict = parsedData[i];
    if (user_dict.username === username) {
      let hashed_pass = await hash(password);
      //let hashed_pass = password
      if (hashed_pass == user_dict.password) {
        return {
          'username': username,
          'public_key': user_dict.publicKey,
          'private_key': user_dict.privateKey, 
          'password': user_dict.password,
          'id': user_dict['7']
        };
      }
    }
  }
  return null; // Return null if the login credentials are not found
}

async function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function encrypt_(data, iv = Buffer.from(process.env.INIT_VECTOR, 'hex')) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

async function decrypt_(encryptedData, iv = Buffer.from(process.env.INIT_VECTOR, 'hex')) {
  const buffer = Buffer.from(encryptedData, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(buffer, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

app.get('/', (req, res) => {
  res.render('login');
});

app.get('/set_keys', async (req, res) => {
  if (req.session.username) {
    console.log('setting')
    req.session.publicKey = req.query.publicKey;
    req.session.privateKey = await encrypt_(req.query.privateKey);
    update_user(req.session.dbId, req.session.publicKey, req.session.privateKey, req.session.username, req.session.password)
  } else {
    res.sendStatus(401);
  }
});

app.get('/main', async (req, res) => {
  if (req.session.username) {
    //let decrypted_private_key = await decrypt_(req.session.privateKey)
    let decrypted_private_key = req.session.privateKey
    res.render('main', {'username': req.session.username, 'private_key': decrypted_private_key, 'public_key': req.session.publicKey});
  } else {
    res.redirect('/');
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  let verify = await checkLogin(username, password);
  if (verify != null) {
    req.session.username = verify['username'];
    req.session.publicKey = verify['public_key'];
    req.session.privateKey = verify['private_key'];
    req.session.password = verify['password'];
    req.session.dbId = verify['id'];
    res.redirect('/main');
  } else {
    res.redirect('/');
  }
});

app.post('/add_account', async (req, res) => {
  const { username, password } = req.body;
  let keys = await generate_keys();
  let encrypted_json_private_key = await encrypt_(JSON.stringify(keys.private_key));
  add_user(username, password, JSON.stringify(keys.public_key), encrypted_json_private_key);
  res.redirect('/'); // Redirect to the login page
});

app.get('/create_account', (req, res) => {
  res.render('create_account');
});

app.get('/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/')
});

app.listen(3000, async () => {
  let p = await get_data()
  console.log(p)
  console.log('server started');
});