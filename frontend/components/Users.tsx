import React, {useState, useEffect, ChangeEvent, ChangeEventHandler} from 'react';
import SocketMesssage from '../types/SocketMessage';

import SocketMessage from '../types/SocketMessage';

interface Props {
    ws: WebSocket | undefined;
    clientId: string | undefined;
}

export default function Users(props: Props) {

    const {ws, clientId} = props;

    const [myName, setMyName] = useState<string>('')

    useEffect(() => {
        //
    }, []);

    const handleIncomingMsg = (evt: MessageEvent) => {
        try {
            const msg = JSON.parse(evt.data)
            // if (msg?.clientId !== clientId) {
            //     setField(msg.fieldName, msg.newVal);
            // }
        } catch (error) {
            console.log(error);
        }
    }

    const handleChange = (evt: ChangeEvent<HTMLInputElement>): ChangeEventHandler<HTMLInputElement> | undefined => {
        const newVal = evt.target.value;

        const socketMsg: SocketMesssage = {
            clientId,
            newVal,
            fieldName: 'myName'
        }
        ws?.send(JSON.stringify(socketMsg));

        setMyName(newVal);

        return undefined;
    }

    return (
        <div>
            <h2>Present Users:</h2>
            <label>My Name:</label>
            <input type="text" value={myName} onChange={handleChange} />
            <br />
            <p>Hans</p>
        </div>
    )
}
