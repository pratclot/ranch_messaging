# ranch_messaging

Does three things:

- connects to a server that converts com-port messages to websocket events
- utilizes FCM to notify Android clients of alarm events parsed from above messages
- logs everything to local files using *winston*
