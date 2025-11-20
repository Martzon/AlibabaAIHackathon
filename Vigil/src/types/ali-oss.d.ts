declare module 'ali-oss' {
  interface OSSOptions {
    region: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    secure?: boolean;
    cname?: boolean;
    endpoint?: string;
  }

  interface PutObjectResult {
    name: string;
    url?: string;
    res?: {
      requestUrls?: string[];
    };
  }

  class OSS {
    constructor(options: OSSOptions);
    put(name: string, file: File | Blob | Buffer | string, options?: { headers?: Record<string, string> }): Promise<PutObjectResult>;
    signatureUrl(name: string, options?: { expires?: number; method?: string; response?: Record<string, string>; process?: string }): string;
  }

  export = OSS;
}
