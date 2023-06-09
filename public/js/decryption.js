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

function decrypt() {
  // get the input data and encryption key
  const inputData = document.getElementById('data-input-decryption').value;
  let privateKey = document.getElementById('private_key_input').value;
  document.getElementById('data-input-decryption').setAttribute("autocomplete", "new-password");
  document.getElementById('private_key_input').setAttribute("autocomplete", "new-password");

  if (privateKey == "") {
    //if field is empty, use private key of user
    privateKey = document.getElementById('private_key').value
    console.log(privateKey)
  }

  // encrypt the data using the API endpoint
  async function fetchData() {
    console.log(privateKey)
    const response = await fetch(`https://rsaserver.posydon.repl.co/decrypt?ciphertext=${inputData}&private_key=${privateKey}`, {
      mode : 'cors'
    });
    const data = await response.text();
    console.log(data);
    copyToClipboard(data);
    return data;
  }
  const resultDiv = document.createElement('div');
  resultDiv.textContent = `Estimated time: ${inputData.length} seconds`;
  document.getElementById('decryption_form').appendChild(resultDiv);
  
  let timeLeft = inputData.length;
  let secondsInterval = setInterval(() => {
    timeLeft--;
    resultDiv.textContent = `Estimated time: ${timeLeft} seconds`;
  }, 1000);
  
  // display the encrypted data on the page
  fetchData().then((decryptedData) => {
    clearInterval(secondsInterval);
    resultDiv.textContent = `Decrypted '${inputData}': ${decryptedData}`;
  });
  
  document.getElementById("data-input-decryption").value = "";
  // prevent form submission
  return false;
}

// add event listener to the form
document.getElementById('decryption_form').addEventListener('submit', async function(event) {
  // prevent the form from submitting and reloading the page
  event.preventDefault();

  // call the decrypt function
  decrypt();
});
