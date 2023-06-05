// Copy private key function
function copyPrivateKey() {
  const private_key = document.getElementById('private_key');
  private_key.select();
  document.execCommand('copy');
  alert('Private key copied!');
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
document.getElementById('toggle_private_key').addEventListener('click', togglePrivateKeyVisibility);
document.getElementById('key_change_form').addEventListener('submit', function(event) {
  event.preventDefault(); // Prevent default form submission
  
  // Call your JavaScript function here for form action handling
  regenerateKeys();
});
