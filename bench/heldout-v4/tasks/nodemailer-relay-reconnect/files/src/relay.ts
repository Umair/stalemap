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

  constructor(private readonly options: RelayOptions) {}

  /** Opens the connection. */
  async open(): Promise<void> {
    this.conn = await this.connect();
  }

  private connect(): Promise<SMTPConnection> {
    const conn = new SMTPConnection({ host: this.options.host, port: this.options.port, ignoreTLS: true, name: "digest-worker" });
    conn.on("error", (err) => console.warn("relay connection error:", err.message));
    // TODO: handle the relay dropping the connection.
    return new Promise((resolve, reject) => {
      conn.connect((err) => (err ? reject(err) : resolve(conn)));
    });
  }

  /** Sends one raw RFC 822 message and resolves with the relay's reply. */
  async send(envelope: Envelope, message: string): Promise<string> {
    const conn = this.conn;
    if (!conn) throw new Error("relay is not open");
    return new Promise((resolve, reject) => {
      conn.send(envelope, message, (err, info) => (err ? reject(err) : resolve(info?.response ?? "")));
    });
  }

  /** Closes the connection for good. */
  close(): void {
    this.conn?.quit();
    this.conn = null;
  }
}
