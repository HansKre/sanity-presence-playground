import React, {useState, useEffect, ChangeEventHandler, ChangeEvent} from 'react';
import {nanoid} from 'nanoid';

export default function Home() {

  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [ws, setWs] = useState<WebSocket>();
  const [clientId, setClientId] = useState<string>();

  useEffect(() => {
    // init client id
    setClientId(nanoid());

    // create websocket
    const _ws = new WebSocket("ws://localhost:8080");
    // _ws.onmessage = msg => console.log(msg);
    _ws.onmessage = handleIncomingMsg;
    setWs(_ws);
    console.log('New ws connection established');
    return () => {
      _ws.close();
      setWs(undefined);
    }
  }, []);

  // TODO interface for msg
  // TODO: handle multiple fields
  // TODO: handle multiple users
  // TODO: handle multiple docs == channels

  const handleIncomingMsg = (evt: MessageEvent) => {
    console.log(evt);
    console.log(evt.data);
    try {
      const msg = JSON.parse(evt.data)
      console.log(msg);
      if (msg?.clientId !== clientId) {
        setField(msg.fieldName, msg.newVal);
      }
    } catch (error) {
      console.log(error);
    }
  }

  const handleChange = (evt: ChangeEvent<HTMLInputElement>, fieldName: string): ChangeEventHandler<HTMLInputElement> | undefined => {
    const newVal = evt.target.value;

    const socketMsg = {
      clientId,
      newVal,
      fieldName
    }
    ws?.send(JSON.stringify(socketMsg));

    setField(fieldName, newVal);

    return undefined;
  }

  return (
    <div>
      <h1>Hello World</h1>
      <label>First name:</label>
      <input type="text" value={firstName} onChange={(evt) => handleChange(evt, 'firstName')} />
      <br />
      <label>Last name:</label>
      <input type="text" value={lastName} onChange={(evt) => handleChange(evt, 'lastName')} />
    </div>
  )

  function setField(fieldName: string, newVal: string) {
    switch (fieldName) {
      case 'firstName':
        setFirstName(newVal);
        break;
      case 'lastName':
        setLastName(newVal);
        break;
      default:
        break;
    }
  }
}
