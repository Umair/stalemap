import SMTPConnection from "nodemailer/lib/smtp-connection";

export interface RelayOptions {
  host: string;
  port: number;
  /** Called each time the relay drops the connection on us. */
  onDisconnect?: () => void;
}

export interface Envelope {
  from: string;
  to: string[];
}

/** One long-lived SMTP connection to the internal relay (plain SMTP on the private network). */
export class Relay {
  private conn: SMTPConnection | null = null;
  private pending: Promise<SMTPConnection> | null = null;
  private closed = false;

  constructor(private readonly options: RelayOptions) {}

  /** Opens the connection. */
  async open(): Promise<void> {
    this.closed = false;
    this.conn = await this.connect();
  }

  private connect(): Promise<SMTPConnection> {
    const conn = new SMTPConnection({ host: this.options.host, port: this.options.port, ignoreTLS: true, name: "digest-worker" });
    conn.on("error", (err) => console.warn("relay connection error:", err.message));
    // 'end' fires whenever the connection is gone, whoever closed it.
    conn.on("end", () => {
      if (this.conn !== conn) return;
      this.conn = null;
      if (this.closed) return;
      this.options.onDisconnect?.();
      this.pending = this.connect().then(
        (fresh) => {
          if (this.closed) fresh.quit();
          else this.conn = fresh;
          return fresh;
        },
        (err) => {
          console.warn("relay reconnect failed:", (err as Error).message);
          throw err;
        },
      );
      this.pending.catch(() => {}).finally(() => (this.pending = null));
    });
    return new Promise((resolve, reject) => {
      conn.connect((err) => (err ? reject(err) : resolve(conn)));
    });
  }

  private async current(): Promise<SMTPConnection> {
    if (this.closed) throw new Error("relay is not open");
    if (this.conn) return this.conn;
    if (this.pending) await this.pending.catch(() => {});
    if (!this.conn) this.conn = await this.connect();
    return this.conn;
  }

  /** Sends one raw RFC 822 message and resolves with the relay's reply. */
  async send(envelope: Envelope, message: string): Promise<string> {
    const conn = await this.current();
    return new Promise((resolve, reject) => {
      conn.send(envelope, message, (err, info) => (err ? reject(err) : resolve(info?.response ?? "")));
    });
  }

  /** Closes the connection for good. */
  close(): void {
    this.closed = true;
    const conn = this.conn;
    this.conn = null;
    conn?.quit();
  }
}
