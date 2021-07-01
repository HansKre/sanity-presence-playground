import React, {useState, useEffect, ChangeEventHandler, ChangeEvent} from 'react';
import {useRouter} from 'next/router';
import {nanoid} from 'nanoid';

import Users from '../../components/Users';

const SERVER_URL = 'ws://localhost:8080';

export default function Document() {

  const router = useRouter();
  const {docId} = router.query;

  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [ws, setWs] = useState<WebSocket>();
  const [clientId, setClientId] = useState<string>();

  useEffect(() => {
    if (docId) {
      // init client id
      setClientId(nanoid());
      // create websocket
      const _ws = new WebSocket(`${SERVER_URL}/?docid=${docId}`);
      // subscribe to incoming messages
      _ws.onmessage = handleIncomingMsg;
      setWs(_ws);
      console.log('New ws connection established');
      return () => {
        // cleanup
        _ws.close();
        setWs(undefined);
      }
    }
  }, [docId]);

  const handleIncomingMsg = (evt: MessageEvent) => {
    try {
      const msg = JSON.parse(evt.data)
      if (msg?.clientId !== clientId) {
        setField(msg.fieldName, msg.newVal);
      }
    } catch (error) {
      console.log({error, data: evt.data});
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

  return (
    <div>
      <div>
        <h1>{`Document: ${docId || '0'}`}</h1>
        <label>First name:</label>
        <input type="text" value={firstName} onChange={(evt) => handleChange(evt, 'firstName')} />
        <br />
        <label>Last name:</label>
        <input type="text" value={lastName} onChange={(evt) => handleChange(evt, 'lastName')} />
      </div>
      <Users ws={ws} clientId={clientId} />
    </div>
  )
}
