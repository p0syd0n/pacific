function copyToClipboard(text) {
  // create a temporary textarea element
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  
  // select and copy the text
  const selected = document.getSelection().rangeCount > 0 ? document.getSelection().getRangeAt(0) : false;
  textarea.select();
  document.execCommand('copy');
  
  // remove the temporary textarea element
  document.body.removeChild(textarea);
  
  // restore the original selection
  if (selected) {
    document.getSelection().removeAllRanges();
    document.getSelection().addRange(selected);
  }
}

function encrypt() {
  // get the input data and encryption key
  const inputData = document.getElementById('data-input').value;
  const publicKey = document.getElementById('public_key_input').value;
  if (publicKey === `-----BEGIN PUBLIC KEY-----
  MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtkwwSc0B88G1RqNUAHWY
  /RkRUZO2Yz6Y4xJR1LFcH+xulnRepEUpfvwXePzrY2ymBOFeMGN89uRcgTgbZSrj
  siSYJ1s7SYL+N33RLDXyL1dBv1an2M5h9vv6uLX7EQz7RcwR9abuOvRNLeiGUbL2
  Ano+zhqLN3Gg0bNR0YkND7Lbj2RFPPI5Fs0/WypoJbAKtjqjNY0bkkMY7dy3I3uq
  YEWn66RPdkpCOpgjkWB8hjp2UeUBKBSg6foCivtrRmX/17eNzp5xU5+YRAqmk+7Q
  ZuNvm82mOobuNCCV+e5Cd54W3kbrZTRArGxbtXwG4HzXl+js5W9Im4GfgRNnhk7H
  AQIDAQAB
  -----END PUBLIC KEY-----`) {
    console.log('SMAE KETS')
  }
  // encrypt the data using the API endpoint
  async function fetchData() {
    const response = await fetch(`/encrypt?data=${inputData}&publicKey=${publicKey}`);
    const data = await response.text();
    copyToClipboard(data);
    return data;
  }

  // display the encrypted data on the page
  fetchData().then((encryptedData) => {
    const resultDiv = document.createElement('div');
    resultDiv.textContent = `Encrypted '${inputData}': ${encryptedData}`;
    document.getElementById('encryption_form').appendChild(resultDiv);
  });
  document.getElementById("data-input").value = "";
  // prevent form submission
  return false;
}

// add event listener to the form
document.getElementById('encryption_form').addEventListener('submit', async function(event) {
  // prevent the form from submitting and reloading the page
  event.preventDefault();

  // call the encrypt function
  await encrypt();
});
