export type SignHashMode = 'none' | 'sha256'

export type InitKeyOptions = {
  label?: string
  overwrite?: boolean
}

export interface SignerBackend {
  readonly name: string
  create(keyId: string, options: InitKeyOptions): Promise<{ publicKey: `0x${string}` }>
  getPublicKey(keyId: string): Promise<`0x${string}`>
  sign(keyId: string, payload: Uint8Array, hash: SignHashMode): Promise<Uint8Array>
  info(keyId: string): Promise<{ exists: boolean }>
}
