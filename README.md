# Description

Playground to scaffold out presence architecture

## Backend

### How to run

1) cd into `backend` folder
2) build app image `docker build -t wsapp .`
3) `docker-compose up`
4) open a browser console and type this

    ```js
    let ws = new WebSocket("ws://localhost:8080");
    ws.onmessage = message => console.log(`Received: ${message.data}`);
    ws.send("Hello! I'm client")
    ```

5) open multiple console windows to simulate multiple clients

## Frontend
