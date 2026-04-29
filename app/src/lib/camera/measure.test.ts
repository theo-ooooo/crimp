import { detectImageMime, measureFileBytes, readImageMeta } from './measure';

describe('measureFileBytes', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns blob.size and prepends file:// when missing', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      blob: async () => ({ size: 12345 }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const size = await measureFileBytes('/var/mobile/x.jpg');

    expect(size).toBe(12345);
    expect(fetchMock).toHaveBeenCalledWith('file:///var/mobile/x.jpg');
  });

  it('does not double-prepend file:// when already present', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      blob: async () => ({ size: 1 }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await measureFileBytes('file:///tmp/x.jpg');

    expect(fetchMock).toHaveBeenCalledWith('file:///tmp/x.jpg');
  });

  it('propagates fetch errors', async () => {
    global.fetch = (jest.fn().mockRejectedValue(new Error('boom'))) as unknown as typeof fetch;
    await expect(measureFileBytes('/x.jpg')).rejects.toThrow('boom');
  });
});

describe('detectImageMime', () => {
  it('JPEG via FFD8FF magic', () => {
    expect(detectImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe('image/jpeg');
  });

  it('PNG via 89504E47 magic', () => {
    expect(detectImageMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0]))).toBe('image/png');
  });

  it('HEIC via ftypheic atom', () => {
    // 4 bytes box size + 'ftyp' + 'heic'
    const buf = new Uint8Array([
      0, 0, 0, 0x18,
      0x66, 0x74, 0x79, 0x70, // 'ftyp'
      0x68, 0x65, 0x69, 0x63, // 'heic'
    ]);
    expect(detectImageMime(buf)).toBe('image/heic');
  });

  it('HEIC variants (heix/heim/heis/mif1/msf1) all detected', () => {
    for (const brand of ['heix', 'heim', 'heis', 'mif1', 'msf1']) {
      const buf = new Uint8Array(12);
      // 'ftyp' at offset 4
      buf[4] = 0x66; buf[5] = 0x74; buf[6] = 0x79; buf[7] = 0x70;
      // brand at offset 8
      for (let i = 0; i < 4; i++) buf[8 + i] = brand.charCodeAt(i);
      expect(detectImageMime(buf)).toBe('image/heic');
    }
  });

  it('WebP via RIFF...WEBP', () => {
    const buf = new Uint8Array(12);
    'RIFF'.split('').forEach((c, i) => (buf[i] = c.charCodeAt(0)));
    'WEBP'.split('').forEach((c, i) => (buf[8 + i] = c.charCodeAt(0)));
    expect(detectImageMime(buf)).toBe('image/webp');
  });

  it('returns null for unknown header', () => {
    expect(detectImageMime(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBeNull();
  });

  it('returns null for short buffer', () => {
    expect(detectImageMime(new Uint8Array([0xff]))).toBeNull();
  });
});

describe('readImageMeta', () => {
  const originalFetch = global.fetch;
  const originalFileReader = global.FileReader;
  afterEach(() => {
    global.fetch = originalFetch;
    global.FileReader = originalFileReader;
  });

  /**
   * RN 호환 우회 (PR #95 후속): fetch().blob() 으로 byteSize 확보 → FileReader.readAsArrayBuffer
   * 로 헤더 16바이트 읽기. 본 헬퍼가 두 단계를 모두 mock 한다.
   */
  function mockFetchAndFileReader(byteSize: number, headerBytes: Uint8Array) {
    // fetch().blob() — blob.size + slice() 만 사용됨.
    const blob = {
      size: byteSize,
      slice: () => ({ /* sliced blob — FileReader 가 내용 결정 */ }),
    } as unknown as Blob;
    global.fetch = (jest.fn().mockResolvedValue({ blob: async () => blob })) as unknown as typeof fetch;

    // FileReader — readAsArrayBuffer 가 우리 가짜 헤더 ArrayBuffer 를 onload 로 던지게.
    class MockFileReader {
      result: ArrayBuffer | null = null;
      onload: (() => void) | null = null;
      onerror: ((err: Error) => void) | null = null;
      readAsArrayBuffer() {
        Promise.resolve().then(() => {
          this.result = headerBytes.buffer.slice(
            headerBytes.byteOffset,
            headerBytes.byteOffset + headerBytes.byteLength,
          );
          if (this.onload) this.onload();
        });
      }
    }
    global.FileReader = MockFileReader as unknown as typeof FileReader;
  }

  it('returns size + detected mime via FileReader (HEIC iOS case)', async () => {
    // 시뮬: vision-camera v4 가 HEIC 바이트를 .jpg 확장자로 저장한 iOS 케이스 (PR #91 B1).
    const heicHeader = new Uint8Array(16);
    heicHeader[4] = 0x66; heicHeader[5] = 0x74; heicHeader[6] = 0x79; heicHeader[7] = 0x70;
    'heic'.split('').forEach((c, i) => (heicHeader[8 + i] = c.charCodeAt(0)));
    mockFetchAndFileReader(99999, heicHeader);

    const meta = await readImageMeta('/var/mobile/photo.jpg'); // 확장자가 .jpg 라도

    expect(meta.byteSize).toBe(99999);
    expect(meta.mime).toBe('image/heic'); // 헤더가 진실
  });

  it('returns null mime when header is unrecognized', async () => {
    mockFetchAndFileReader(100, new Uint8Array(16));

    const meta = await readImageMeta('file:///x.bin');

    expect(meta.byteSize).toBe(100);
    expect(meta.mime).toBeNull();
  });

  it('returns byteSize even when FileReader fails (RN fallback path)', async () => {
    // FileReader 가 onerror 던지는 환경 (RN 의 일부 호스트). byteSize 는 살아있고 mime 만 null.
    const blob = { size: 555, slice: () => ({}) } as unknown as Blob;
    global.fetch = (jest.fn().mockResolvedValue({ blob: async () => blob })) as unknown as typeof fetch;
    class FailingReader {
      result: ArrayBuffer | null = null;
      onload: (() => void) | null = null;
      onerror: ((err: Error) => void) | null = null;
      readAsArrayBuffer() {
        Promise.resolve().then(() => {
          if (this.onerror) this.onerror(new Error('not implemented on RN'));
        });
      }
    }
    global.FileReader = FailingReader as unknown as typeof FileReader;

    const meta = await readImageMeta('/x.jpg');

    expect(meta.byteSize).toBe(555);
    expect(meta.mime).toBeNull();
  });
});
