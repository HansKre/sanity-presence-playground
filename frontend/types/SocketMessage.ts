export default interface SocketMessage {
    clientId: string | undefined;
    newVal: string;
    fieldName: string
}