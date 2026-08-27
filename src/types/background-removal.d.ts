declare module "@imgly/background-removal" {
  export interface Config {
    model?: "isnet" | "isnet_fp16" | "isnet_quint8";
    output?: {
      format?: "image/png" | "image/jpeg" | "image/webp" | "image/x-rgba8" | "image/x-alpha8";
      quality?: number;
    };
    publicPath?: string;
    fetchArgs?: RequestInit;
    progress?: (key: string, current: number, total: number) => void;
    proxyToWorker?: boolean;
    debug?: boolean;
  }
  export function removeBackground(input: Blob | string | URL | ArrayBuffer | Uint8Array, config?: Config): Promise<Blob>;
  export function removeForeground(input: Blob | string | URL | ArrayBuffer | Uint8Array, config?: Config): Promise<Blob>;
}
