/**
 * Relay protocol definitions
 */

import b4a from 'b4a';

// Protocol version
export const PROTOCOL_VERSION = 1;

// Protocol name for Protomux
export const PROTOCOL_NAME = 'cloakcraft-relay';

// Message types
export enum MessageType {
  // Client -> Relay
  SUBMIT_TX = 0x01,
  GET_STATUS = 0x02,
  PING = 0x03,

  // Relay -> Client
  TX_RESULT = 0x81,
  STATUS_RESPONSE = 0x82,
  PONG = 0x83,
  ERROR = 0xff,
}

// Message structures
export interface SubmitTxMessage {
  type: MessageType.SUBMIT_TX;
  requestId: Uint8Array;
  transaction: Uint8Array;
  priority?: 'low' | 'normal' | 'high';
}

export interface TxResultMessage {
  type: MessageType.TX_RESULT;
  requestId: Uint8Array;
  success: boolean;
  signature?: string;
  error?: string;
  slot?: number;
}

export interface StatusMessage {
  type: MessageType.GET_STATUS;
  requestId: Uint8Array;
}

export interface StatusResponseMessage {
  type: MessageType.STATUS_RESPONSE;
  requestId: Uint8Array;
  relayId: string;
  version: number;
  queueSize: number;
  latestSlot: number;
  uptime: number;
}

export interface PingMessage {
  type: MessageType.PING;
  timestamp: number;
}

export interface PongMessage {
  type: MessageType.PONG;
  timestamp: number;
  relayTimestamp: number;
}

export interface ErrorMessage {
  type: MessageType.ERROR;
  requestId?: Uint8Array;
  code: number;
  message: string;
}

export type RelayMessage =
  | SubmitTxMessage
  | TxResultMessage
  | StatusMessage
  | StatusResponseMessage
  | PingMessage
  | PongMessage
  | ErrorMessage;

/**
 * Encode a message to bytes
 */
export function encodeMessage(msg: RelayMessage): Uint8Array {
  // Simple encoding: [version][type][length][payload]
  const json = JSON.stringify(msg, (_, value) =>
    value instanceof Uint8Array ? Array.from(value) : value
  );
  const payload = new TextEncoder().encode(json);

  const buffer = new Uint8Array(4 + payload.length);
  buffer[0] = PROTOCOL_VERSION;
  buffer[1] = msg.type;
  buffer[2] = (payload.length >> 8) & 0xff;
  buffer[3] = payload.length & 0xff;
  buffer.set(payload, 4);

  return buffer;
}

/**
 * Decode a message from bytes
 */
export function decodeMessage(data: Uint8Array): RelayMessage {
  if (data.length < 4) {
    throw new Error('Message too short');
  }

  const version = data[0];
  if (version !== PROTOCOL_VERSION) {
    throw new Error(`Unsupported protocol version: ${version}`);
  }

  const type = data[1] as MessageType;
  const length = (data[2] << 8) | data[3];

  if (data.length < 4 + length) {
    throw new Error('Incomplete message');
  }

  const payloadBytes = data.slice(4, 4 + length);
  const json = new TextDecoder().decode(payloadBytes);
  const parsed = JSON.parse(json, (key, value) => {
    if (Array.isArray(value) && value.every((n) => typeof n === 'number')) {
      return new Uint8Array(value);
    }
    return value;
  });

  parsed.type = type;
  return parsed as RelayMessage;
}

/**
 * Generate a random request ID
 */
export function generateRequestId(): Uint8Array {
  const id = new Uint8Array(16);
  if (typeof crypto !== 'undefined') {
    crypto.getRandomValues(id);
  } else {
    // Node.js
    require('crypto').randomFillSync(id);
  }
  return id;
}
