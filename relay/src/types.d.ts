declare module 'protomux' {
  import { Duplex } from 'stream';

  interface MessageHandler {
    encoding: {
      encode: (msg: Uint8Array) => Uint8Array;
      decode: (buf: Buffer) => Uint8Array;
    };
    onmessage: (data: Uint8Array) => void;
  }

  interface Channel {
    open(): Promise<void>;
    close(): void;
    send(message: Uint8Array): void;
    addMessage(handler: MessageHandler): { send: (msg: Uint8Array) => void };
    cork(): void;
    uncork(): void;
  }

  interface ProtomuxOptions {
    onopen?: () => void;
    onclose?: () => void;
    onerror?: (err: Error) => void;
  }

  class Protomux {
    constructor(stream: Duplex, opts?: ProtomuxOptions);
    static from(stream: Duplex, opts?: ProtomuxOptions): Protomux;
    createChannel(opts: {
      protocol: string;
      onopen?: () => void;
      onclose?: () => void;
    }): Channel;
    destroy(): void;
  }

  export = Protomux;
}

declare module 'hyperswarm' {
  import { EventEmitter } from 'events';
  import { Duplex } from 'stream';

  interface SwarmOptions {
    bootstrap?: string[];
    keyPair?: { publicKey: Buffer; secretKey: Buffer };
  }

  interface PeerInfo {
    publicKey: Buffer;
  }

  class Hyperswarm extends EventEmitter {
    constructor(opts?: SwarmOptions);
    join(topic: Buffer, opts?: { server?: boolean; client?: boolean }): {
      flushed(): Promise<void>;
    };
    leave(topic: Buffer): Promise<void>;
    destroy(): Promise<void>;
    on(event: 'connection', listener: (socket: Duplex, info: PeerInfo) => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
  }

  export = Hyperswarm;
}

declare module 'b4a' {
  export function from(data: string | Buffer | Uint8Array, encoding?: string): Buffer;
  export function toString(data: Buffer, encoding?: string): string;
  export function alloc(size: number, fill?: number): Buffer;
  export function concat(buffers: Buffer[]): Buffer;
  export function equals(a: Buffer, b: Buffer): boolean;
}
