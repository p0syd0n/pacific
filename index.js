import express from 'express';
import session from 'express-session';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';
import { config } from 'dotenv';
import request from 'request';
config();

//some constants
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const algorithm = 'aes-256-cbc';
const rsa_server = 'https://rsaserver.posydon.repl.co'

//enviromental variables
const key = Buffer.from(process.env.ENCRYPT_KEY, 'hex');
const api_key = process.env.API_KEY
const sql_api_key = process.env.SQL_API_KEY
const default_iv = Buffer.from(process.env.INIT_VECTOR, 'hex')
const session_key = process.env.SESSION_KEY
const app = express();
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.set('views', __dirname + '/views');

app.use(
  session({
    secret: session_key || '9f3c25faf860b4057ea0845607dbd3d3488625070a43c974fd31ebec98393991',
    resave: true,
    saveUninitialized: true,
    cookie: {
      maxAge: 3600000, // 1 hour
    },
  })
);


async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    var options = {
      'method': 'POST',
      'url': 'https://pacific-posydon.harperdbcloud.com',
      'headers': {
        'Content-Type': 'application/json',
        'Authorization': sql_api_key
      },
      body: JSON.stringify({
        "operation": "sql",
        "sql": sql
    })
    };
    request(options, function (error, response) { 
      if (error) throw new Error(error);
      //console.log("executed with response:\n ", response.body);
      resolve(response.body);
    });
  });
}

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
  let output = await executeSQL("SELECT * FROM pacific.users");
  return output;
}

//updating the user info
async function update_user(id, public_key, private_key, username, password) {
  let output = await executeSQL(`UPDATE pacific.users SET public_key = \"${public_key}\", private_key = \"${private_key}\", username = \"${username}\", password = \"${password}\" WHERE record_id = \"${id}\"; `)
  return output;
}

//adding users
async function add_user(username, password, public_key, private_key) {
  let hashed = await hash(password);
  let output = await executeSQL(`INSERT INTO pacific.users (username, password, public_key, private_key) VALUES (\"${username}\", \"${hashed}\", \"${public_key}\", \"${private_key}\");`);
  return output;
}

//checking login
async function checkLogin(username, password) {
  const data = await get_data();
  const parsedData = JSON.parse(data);
  for (let i = 0; i < parsedData.length; i++) {
    const user_dict = parsedData[i];
    console.log(user_dict.username, username);
    if (user_dict.username === username) {
      let hashed_pass = await hash(password);
      if (hashed_pass == user_dict.password) {
        return {
          'username': username,
          'public_key': user_dict['public_key'],
          'private_key': user_dict['private_key'], 
          'password': user_dict['password'],
          'id': user_dict['record_id']
        };
      }
    }
  }
  return null; // Return null if the login credentials are not found
}

//password hashing function
async function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

//helper function for encrypting
async function encrypt_(data, iv = default_iv) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

//helper function for decrypting
async function decrypt_(encryptedData, iv = default_iv) {
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
  console.log("recieved login");
  const { username, password } = req.body;
  let verify = await checkLogin(username, password);
  console.log("verify: ", verify);
  if (verify != null) {
    //if not null, saving the credentials to the session
    req.session.username = verify['username'];
    req.session.publicKey = verify['public_key'];
    req.session.privateKey = verify['private_key'];
    req.session.password = verify['password']; //password is hashed in db, so will be hashed in session as well
    req.session.dbId = verify['id'];
    console.log('done');
    res.redirect('/main');
    console.log('redirected');
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

//account info
app.get('/account', (req, res) => {
  if (req.session.username) {
    res.render('account_info', {'username': req.session.username, 'password_hash': req.session.password});
  } else {
    res.redirect('/')
  }
});

//changing account info
app.get('/update_login', async (req, res) => {
  if (req.session.username) {
    let hashed = await hash(req.query.password)
    console.log(req.query.password);
    update_user(req.session.dbId, req.session.publicKey, req.session.privateKey, req.query.username, hashed)
    req.session.destroy();
    res.redirect("/");
  } else {
    res.sendStatus(401);
  }
});

app.listen(3000, async () => {
  console.log('server started');
});