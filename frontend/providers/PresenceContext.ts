import React from 'react';
import {WebSocketSubject} from 'rxjs/webSocket';

const PresenceContext = React.createContext<WebSocketSubject<unknown> | undefined>(undefined);

export default PresenceContext;