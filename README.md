# pacific
Project for Congressional App Challenge 2023

Pacific is a free rsa encryption service. The website is made with node js, and the front end is ejs/html. The encryption is achieved using a written from scratch rsa algorithm (python).

## The algorithm
The algorithm used is rsa, I use a script written in python. It is currently hosted on replit [here](https://replit.com/@posydon/rsaserver). It is not the fastest, but I will move it to a better hosting site if this becomes relevant.

## Accounts
The accounts are managed through RestDb. The account page displays a hash of the password as a placeholder in the password slot, and other info can be changed from there.

## Keys
If you generated keys through [this](https://replit.com/@posydon/rsaserver) you can replace the public and private keys safely, but otherwise do not, it will break when you try to do any operations. Remember that you can always regenerate your keys.

## for noobs

### Assymetric encryption
Imagine Bob wants to send a secret message to Alice. He wants Alice to read the message, and does not want the people passing the message to read it. He can use assymetric encryption. The first step is generating two keys- the first key is called the public key, and the second is called the private key. If the message is encrypted using the public key, it can be decrypted only with the private key that matches the public key. The private key is not to be shared with anyone. The two keys are mathematically linked, so you can't just use random numbers. Alice and bob can generate keypairs. They share public keys. Bob uses Alice's public key to encrypt the message, and hands [the message] to someone, who will hand it to Alice. The middleman will not be able to read the message, but Alice will be able to decrypt the message using her private key, and read it.

### Pacific's implementation
When you visit the [site](https://pacific.cyclic.app), you will be greeted with a login page. If it is your first time, you can create an account. A keypair (a public and private key) will be generated for you. After you log in, you will land on the main encryption page. There will be a box that displays other users usernames and public keys, so that you can encrypt data meant for them. The next box allows you to enter data to be encrypted. The input lower is for a public key- the format is `[x, y]`. The same can be done with the decryption tab - enter the data to be decrypted, enter your private key (if you leave it empty, it will use yours).

