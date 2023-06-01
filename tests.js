import request from "request";

var options = { method: 'GET',
  url: 'https://pacific-9562.restdb.io/rest/user-data',
  headers: 
   { 'cache-control': 'no-cache',
     'x-apikey': '61638a95f2bbe9a65b4b337baeff07152897e' } };

request(options, function (error, response, body) {
  if (error) throw new Error(error);

  console.log(body);
});