import { z } from 'incur'

// Using z.string() for JSON schema compatibility (required for --llms output).
// Proper address/hex validation is handled by downstream services.
export const Address = z.string().describe('Ethereum address (0x + 40 hex chars)')
export const Hex = z.string().describe('Hex-encoded value (0x prefix)')
