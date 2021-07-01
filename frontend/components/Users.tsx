import React, {useState, useEffect, useContext, ChangeEvent, ChangeEventHandler} from 'react';
import PresenceContext from '../providers/PresenceContext';
import SocketMessage from '../types/SocketMessage';

interface Props {
    clientId: string | undefined;
}

export default function Users(props: Props) {

    const {clientId} = props;

    const [myName, setMyName] = useState<string>('')

    const presence = useContext(PresenceContext);

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

        const socketMsg: SocketMessage = {
            clientId,
            newVal,
            fieldName: 'myName'
        }
        presence?.next(socketMsg);

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
