import React, {useState, useEffect, ChangeEventHandler, ChangeEvent} from 'react';
import {useRouter} from 'next/router';
import {nanoid} from 'nanoid';
import {webSocket, WebSocketSubject} from "rxjs/webSocket";

import Users from '../../components/Users';
import PresenceContext from '../../providers/PresenceContext';
import SocketMessage from '../../types/SocketMessage';

const SERVER_URL = 'ws://localhost:8080';

export default function Document() {

  const router = useRouter();
  const {docId} = router.query;

  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [clientId, setClientId] = useState<string>();
  const [presence, setPresence] = useState<WebSocketSubject<unknown>>();

  useEffect(() => {
    if (docId) {
      // init client id
      setClientId(nanoid());
      // create websocket as observeable subject
      const subject = webSocket(`${SERVER_URL}/?docid=${docId}`);
      // configure subscription
      subject.subscribe({
        next: (jsonMsg) => handleIncomingMsg(jsonMsg as SocketMessage),
        error: (err) => console.log(err),
        complete: () => console.log('connection is closed')
      });
      setPresence(subject);
      return () => {
        // unset the state-reference
        setPresence(undefined);
        // Closes the connection
        subject.complete();
      }
    }
  }, [docId]);

  const handleIncomingMsg = (data: SocketMessage) => {
    if (data?.clientId !== clientId) {
      setField(data.fieldName, data.newVal);
    }
  }

  const handleChange = (evt: ChangeEvent<HTMLInputElement>, fieldName: string): ChangeEventHandler<HTMLInputElement> | undefined => {
    const newVal = evt.target.value;

    const socketMsg = {
      clientId,
      newVal,
      fieldName
    }

    presence?.next(socketMsg);

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
      <PresenceContext.Provider value={presence}>
        <Users clientId={clientId} />
      </PresenceContext.Provider>
    </div>
  )
}
