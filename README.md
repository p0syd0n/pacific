# pacific
Project for Congressional App Challenge 2023

Pacific is a free rsa encryption service. The website is made with node js, and the front end is ejs/html. The encryption is achieved using a written from scratch rsa algorithm (python).

## The algorithm
The algorithm used is rsa, I use a script written in python. It is currently hosted on replit [here](https://replit.com/@posydon/rsaserver). It is not the fastest, but I will move it to a better hosting site if this becomes relevant.

## Accounts
The accounts are managed through RestDb. The account page displays a hash of the password as a placeholder in the password slot, and other info can be changed from there.

## Keys
If you generated keys through [this](https://replit.com/@posydon/rsaserver) you can replace the public and private keys safely, but otherwise do not, it will break when you try to do any operations. Remember that you can always regenerate your keys.
