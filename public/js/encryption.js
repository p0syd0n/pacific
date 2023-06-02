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
  const encryptionKey = document.getElementById('key-select').value;
  const userAccessLevel = document.getElementById("user-access-level").value;
  const init_vector = document.getElementById("init_vector").value;
  // encrypt the data using the API endpoint
  async function fetchData() {
    const response = await fetch(`https://dumbledoor-panel.posydon.repl.co/encrypt_data?data=${inputData}&key=${encryptionKey}&clearance=${userAccessLevel}&passcode=${init_vector}`);
    const data = await response.text();
    copyToClipboard(data);
    return data;
  }

  // display the encrypted data on the page
  fetchData().then((encryptedData) => {
    const resultDiv = document.createElement('div');
    resultDiv.textContent = `Encrypted '${inputData}': ${encryptedData}`;
    document.getElementById('encryption-form').appendChild(resultDiv);
  });
  document.getElementById("init_vector").value = "";
  document.getElementById("data-input").value = "";
  // prevent form submission
  return false;
}

// add event listener to the form
document.getElementById('encryption-form').addEventListener('submit', async function(event) {
  // prevent the form from submitting and reloading the page
  event.preventDefault();

  // call the encrypt function
  await encrypt();
});
