import { GoogleAuth } from 'google-auth-library';

// 1. Konkretne interfejsy zamiast Record<string, unknown>
export interface DriveFile {
  id: string;
  name: string;
  mimeType?: string;
  parents?: string[];
  modifiedTime?: string;
  size?: string;
}

type DriveListResponse = { 
  files?: DriveFile[]; 
  nextPageToken?: string 
};

type DriveCreateResponse = { 
  id: string; 
  name: string 
};

type DriveFilesListArgs = { 
  q?: string; 
  fields?: string;
  pageSize?: number;
};

type DriveFilesGetArgs = { 
  fileId: string; 
  alt?: 'media' 
};

type DriveFilesDeleteArgs = { 
  fileId: string 
};

type DriveFilesCreateArgs = {
  requestBody: { 
    name: string; 
    parents?: string[] 
  };
  media: { 
    mimeType?: string; 
    body: Buffer 
  };
  fields?: string;
};

type DriveFilesGetOptions = { 
  responseType?: 'text' | 'arraybuffer' 
};

class DriveClient {
  private auth = new GoogleAuth({ 
    scopes: ['https://www.googleapis.com/auth/drive'] 
  });
  private headersPromise: Promise<Record<string, string>> | null = null;

  // 2. Bezpieczniejsze pobieranie nagłówków z poprawnym rzutowaniem dla TS
  private async getHeaders(): Promise<Record<string, string>> {
    if (!this.headersPromise) {
      this.headersPromise = (async () => {
        const client = await this.auth.getClient();
        const headers = await client.getRequestHeaders();
        // Przejście przez unknown naprawia błąd: 
        // "Index signature for type 'string' is missing in type 'Headers'"
        return (headers as unknown) as Record<string, string>;
      })();
    }
    return this.headersPromise;
  }

  public files = {
    list: async (args: DriveFilesListArgs) => {
      const headers = await this.getHeaders();
      const url = new URL('https://www.googleapis.com/drive/v3/files');
      
      if (args.q) url.searchParams.set('q', args.q);
      url.searchParams.set('fields', args.fields || 'files(id, name, mimeType)');
      if (args.pageSize) url.searchParams.set('pageSize', args.pageSize.toString());

      const res = await fetch(url.toString(), { method: 'GET', headers });
      if (!res.ok) {
        throw new Error(`Drive list failed: ${res.status} ${await res.text()}`);
      }
      
      const data = (await res.json()) as DriveListResponse;
      return { data };
    },

    get: async (args: DriveFilesGetArgs, options?: DriveFilesGetOptions) => {
      const headers = await this.getHeaders();
      const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(args.fileId)}`);
      if (args.alt) url.searchParams.set('alt', args.alt);

      const res = await fetch(url.toString(), { method: 'GET', headers });
      if (!res.ok) {
        throw new Error(`Drive get failed: ${res.status} ${await res.text()}`);
      }

      const responseType = options?.responseType ?? 'arraybuffer';
      if (responseType === 'text') {
        return { data: await res.text() };
      }

      const arrayBuffer = await res.arrayBuffer();
      return { data: Buffer.from(arrayBuffer) };
    },

    delete: async (args: DriveFilesDeleteArgs) => {
      const headers = await this.getHeaders();
      const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(args.fileId)}`;
      
      const res = await fetch(url, {
        method: 'DELETE',
        headers,
      });
      
      if (!res.ok) {
        throw new Error(`Drive delete failed: ${res.status} ${await res.text()}`);
      }
      return { data: {} };
    },

    create: async (args: DriveFilesCreateArgs) => {
      const headers = await this.getHeaders();
      const boundary = `gastrooSeed_${Date.now().toString(16)}`;

      const metadata = {
        name: args.requestBody.name,
        parents: args.requestBody.parents ?? [],
      };

      const mimeType = args.media.mimeType || 'application/octet-stream';
      
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
        args.media.body,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);

      const url = new URL('https://www.googleapis.com/upload/drive/v3/files');
      url.searchParams.set('uploadType', 'multipart');
      url.searchParams.set('fields', args.fields || 'id,name');

      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      });

      if (!res.ok) {
        throw new Error(`Drive create failed: ${res.status} ${await res.text()}`);
      }

      const data = (await res.json()) as DriveCreateResponse;
      return { data };
    },
  };
}

let cached: DriveClient | null = null;

export function getDrive() {
  if (!cached) cached = new DriveClient();
  return cached;
}