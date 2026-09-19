import { Client } from "pg";

export class PgCache {
  private client: Client;
  private isInitialized = false;

  constructor(connectionString: string) {
    this.client = new Client({ connectionString });
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;
    await this.client.connect();
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS figma_api_cache (
        path TEXT PRIMARY KEY,
        response JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this.isInitialized = true;
  }

  async get<T>(path: string): Promise<T | null> {
    if (!this.isInitialized) await this.init();
    const res = await this.client.query(
      "SELECT response FROM figma_api_cache WHERE path = $1",
      [path]
    );
    if (res.rows.length > 0) {
      console.log(`[Cache Hit] ${path.split("?")[0]}`);
      return res.rows[0].response as T;
    }
    return null;
  }

  async set(path: string, response: any): Promise<void> {
    if (!this.isInitialized) await this.init();
    await this.client.query(
      `INSERT INTO figma_api_cache (path, response, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (path) DO UPDATE SET response = EXCLUDED.response, updated_at = CURRENT_TIMESTAMP`,
      [path, JSON.stringify(response)]
    );
    console.log(`[Cache Set] ${path.split("?")[0]}`);
  }

  async disconnect(): Promise<void> {
    if (this.isInitialized) {
      await this.client.end();
      this.isInitialized = false;
    }
  }
}
