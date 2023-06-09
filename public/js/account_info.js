async function save() {
  // JavaScript code to save the account information
  var username = document.getElementById("username").value;
  var password = document.getElementById("password").value;

  let response = await fetch(`/update_user?username=${username}&password=${password}`);
}

var passwordToggle = document.getElementById("password-toggle");
var passwordField = document.getElementById("password");

passwordToggle.addEventListener("click", function() {
  if (passwordField.type === "password") {
    passwordField.type = "text";
    passwordToggle.textContent = "Hide Password";
  } else {
    passwordField.type = "password";
    passwordToggle.textContent = "Show Password";
  }
});