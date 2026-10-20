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

/** One long-lived SMTP connection to the internal relay; reconnects on the next send after a drop. */
export class Relay {
  private conn: SMTPConnection | null = null;
  private closing = false;

  constructor(private readonly options: RelayOptions) {}

  async open(): Promise<void> {
    this.closing = false;
    this.conn = await this.connect();
  }

  private connect(): Promise<SMTPConnection> {
    const conn = new SMTPConnection({ host: this.options.host, port: this.options.port, ignoreTLS: true, name: "digest-worker" });
    let ended = false;
    conn.on("error", (err) => console.warn("relay connection error:", err.message));
    conn.once("end", () => {
      if (ended) return;
      ended = true;
      const wasCurrent = this.conn === conn;
      if (wasCurrent) this.conn = null;
      if (wasCurrent && !this.closing) this.options.onDisconnect?.();
    });
    return new Promise((resolve, reject) => {
      conn.connect((err) => (err ? reject(err) : resolve(conn)));
    });
  }

  async send(envelope: Envelope, message: string): Promise<string> {
    if (this.closing) throw new Error("relay is not open");
    if (!this.conn) this.conn = await this.connect();
    const conn = this.conn;
    return new Promise((resolve, reject) => {
      conn.send(envelope, message, (err, info) => (err ? reject(err) : resolve(info?.response ?? "")));
    });
  }

  close(): void {
    this.closing = true;
    const conn = this.conn;
    this.conn = null;
    conn?.quit();
  }
}
