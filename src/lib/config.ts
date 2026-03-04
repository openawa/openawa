import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export type PrecallPermission = {
  address: `0x${string}`
  chainId: number
  expiry: number
  id: `0x${string}`
  key: { publicKey: `0x${string}`; type: string }
  permissions: {
    calls: { to?: `0x${string}`; signature?: string }[]
    spend: { limit: string; period: string; token?: `0x${string}` | null }[]
  }
}

export type AgentWalletConfig = {
  version: 1
  signer: {
    keyId?: string
    backend: 'chipkey'
    label?: string
  }
  porto?: {
    address?: `0x${string}`
    chainIds: number[]
    dialogHost?: string
    precallPermissions: PrecallPermission[]
  }
}

const DEFAULT_CONFIG: AgentWalletConfig = {
  version: 1,
  signer: {
    backend: 'chipkey',
  },
  porto: {
    chainIds: [],
    precallPermissions: [],
  },
}

function getConfigRoot() {
  if (process.env.AGENT_WALLET_CONFIG_HOME) {
    return process.env.AGENT_WALLET_CONFIG_HOME
  }

  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support')
  }

  if (process.platform === 'win32') {
    return process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming')
  }

  return process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config')
}

export function getConfigDirectory() {
  return path.join(getConfigRoot(), 'openawa')
}

export function getConfigPath() {
  return path.join(getConfigDirectory(), 'config.json')
}

export function loadConfig(): AgentWalletConfig {
  const configPath = getConfigPath()

  if (!fs.existsSync(configPath)) {
    return structuredClone(DEFAULT_CONFIG)
  }

  const raw = fs.readFileSync(configPath, 'utf8')
  type RawPorto = {
    address?: `0x${string}`
    chainId?: number
    chainIds?: number[]
    dialogHost?: string
    testnet?: boolean
    precallPermissions?: PrecallPermission[]
  }
  const parsed = JSON.parse(raw) as Partial<AgentWalletConfig> & { porto?: RawPorto }
  const parsedPorto: RawPorto = parsed.porto ?? {}

  // Migrate legacy chainId/testnet → chainIds
  let chainIds: number[] = []
  if (Array.isArray(parsedPorto.chainIds)) {
    chainIds = parsedPorto.chainIds
  } else if (typeof parsedPorto.chainId === 'number') {
    chainIds = [parsedPorto.chainId]
  } else if (typeof parsedPorto.testnet === 'boolean') {
    // baseSepolia=84532, base=8453
    chainIds = [parsedPorto.testnet ? 84532 : 8453]
  }

  return {
    ...DEFAULT_CONFIG,
    ...parsed,
    signer: {
      ...DEFAULT_CONFIG.signer,
      ...parsed.signer,
    },
    porto: {
      chainIds,
      precallPermissions: parsedPorto.precallPermissions ?? [],
      ...(parsedPorto.address ? { address: parsedPorto.address } : {}),
      ...(parsedPorto.dialogHost ? { dialogHost: parsedPorto.dialogHost } : {}),
    },
  }
}

export function saveConfig(config: AgentWalletConfig) {
  const configPath = getConfigPath()
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
}
