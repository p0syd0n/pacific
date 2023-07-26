setInterval(() => {
  console.log('getting');
  fetch("/messages")
    .then(response => {
      console.log(response.body);
      // Check if the response was successful (status code 200-299)
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      // Parse the response body as JSON
      return response.json();
    })
    .then(data => {
      // Work with the JSON data
      console.log(data);
      const messagesTable = document.getElementById('messages-body');
      messagesTable.innerHTML = ''; // Clear previous rows

      data.forEach(message => {
        const row = document.createElement('tr');
        const toCell = document.createElement('td');
        toCell.textContent = message.to;
        const fromCell = document.createElement('td');
        fromCell.textContent = message.from;
        const messageCell = document.createElement('td');
        messageCell.textContent = message.message;

        row.appendChild(toCell);
        row.appendChild(fromCell);
        row.appendChild(messageCell);

        messagesTable.appendChild(row);

        // Show notifications if "to" field matches your username
        const username = 'Onyx';
        if (message.to === username) {
          showNotification(message.from, message.message);
        }
      });
    })
    .catch(error => {
      // Handle any errors that occurred during the fetch
      console.error('Fetch error:', error);
    });
}, 1000);

function showNotification(from, message) {
  const notificationTitle = `New message from ${from}`;
  const notificationOptions = {
    body: message,
    icon: '/path/to/notification_icon.png', // Replace with the actual path to the notification icon
  };

  // Check if the browser supports notifications
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(notificationTitle, notificationOptions);
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    // Ask for permission to show notifications
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(notificationTitle, notificationOptions);
      }
    });
  }
}
