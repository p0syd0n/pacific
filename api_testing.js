var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
myHeaders.append("Authorization", "Basic cG9zeWRvbjozM0tvcm92eSE=");

var raw = JSON.stringify({
    "operation": "sql",
    "sql": "SELECT * FROM main.users"
});

var requestOptions = {
  method: 'POST',
  headers: myHeaders,
  body: raw,
  redirect: 'follow'
};

fetch("https://users-pacific.harperdbcloud.com", requestOptions)
  .then(response => response.text())
  .then(result => console.log(result))
  .catch(error => console.log('error', error));