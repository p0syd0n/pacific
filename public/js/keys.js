// Copy private key function
function copyPrivateKey() {
  const privateKey = document.getElementById('private_key').value;
  copyToClipboard(privateKey)
}

function copyPublicKey() {
  const publicKey = document.getElementById('public_key').value;
  copyToClipboard(publicKey);
}

function save_keys() {
  if (confirm("Are you sure? You should only manually set keys if you are aware of what you are doing.")) {
    alert('saving ')
    fetch(`/set_keys?privateKey=${document.getElementById("private_key").value}&publicKey=${document.getElementById("public_key").value}`);
  }
}

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

// Show/hide private key function
function togglePrivateKeyVisibility() {
  const private_key = document.getElementById('private_key');
  const toggleButton = document.getElementById('toggle_private_key');

  if (private_key.type === 'password') {
    private_key.type = 'text';
    toggleButton.textContent = 'Hide';
  } else {
    private_key.type = 'password';
    toggleButton.textContent = 'Show';
  }
}

async function regenerateKeys() {
  alert('regenerating')
  let current = document.getElementById("private_key").value

  const response = await fetch('https://rsaserver.posydon.repl.co/generate_keys', {
    mode : 'cors'
  });
  const dataString = await response.text();
  const data = JSON.parse(dataString);
  console.log(data)
  document.getElementById("private_key").value = "[" + data.private_key.join(", ") + "]";
  document.getElementById("public_key").value = "[" + data.public_key.join(", ") + "]";
  fetch(`/set_keys?privateKey=${document.getElementById("private_key").value}&publicKey=${document.getElementById("public_key").value}`);
  return data;
}
// Event listeners
document.getElementById('copy_private_key').addEventListener('click', copyPrivateKey);
document.getElementById('copy_public_key').addEventListener('click', copyPublicKey);
document.getElementById('save_btn').addEventListener('click', save_keys);
document.getElementById('toggle_private_key').addEventListener('click', togglePrivateKeyVisibility);

document.getElementById('key_change_form').addEventListener('submit', function(event) {
  event.preventDefault(); // Prevent default form submission

  // Call your JavaScript function here for form action handling
  regenerateKeys();
});

