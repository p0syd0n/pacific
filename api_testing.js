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

executeSQL("SELECT * FROM main.users;")
  .then(response => console.log(response))
  .catch(error => console.log('error', error));
