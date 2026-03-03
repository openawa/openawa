import { Command } from 'commander'
import { Chains } from 'porto'
import type { AgentWalletConfig } from '../lib/config.js'
import { AppError, toAppError } from '../lib/errors.js'
import { runCommandAction } from '../lib/command.js'
import { getChainByIdOrName, type PortoService } from '../porto/service.js'
import type { SignerService } from '../signer/service.js'

type StatusOptions = {
  address?: `0x${string}`
  chain?: string
}

function renderHuman({ payload }: { payload: Record<string, unknown> }) {
  const account = payload.account as { address?: string | null } | undefined
  const signer = payload.signer as { backend?: string; exists?: boolean } | undefined
  const precallPermissions = Array.isArray(payload.precallPermissions) ? (payload.precallPermissions as Array<{ id: string; chainId: number; expiry: string }>) : []
  const chains = payload.chains as Record<string, { chainName: string; permissions: { active: number; total: number; latestExpiry: string | null }; balance: { formatted: string; symbol: string } | null; warnings: Array<{ code: string; message: string }> }> | undefined
  const warnings = Array.isArray(payload.warnings) ? (payload.warnings as Array<Record<string, unknown>>) : []

  const lines = [
    'Status',
    `Account: ${account?.address ?? 'not configured'}`,
    `Signer: ${signer?.backend ?? 'unknown'} (${signer?.exists ? 'ready' : 'missing'})`,
  ]

  if (chains && Object.keys(chains).length > 0) {
    lines.push('Chains:')
    for (const [chainIdStr, chainData] of Object.entries(chains)) {
      lines.push(`  ${chainData.chainName} (${chainIdStr})`)
      const perm = chainData.permissions
      const expiryNote = perm.latestExpiry ? ` · expires ${perm.latestExpiry}` : ''
      lines.push(`    Permissions: ${perm.active} active / ${perm.total} total${expiryNote}`)
      if (chainData.balance) {
        lines.push(`    Balance: ${chainData.balance.formatted} ${chainData.balance.symbol}`)
      }
      for (const w of chainData.warnings) {
        lines.push(`    Warning: ${w.code}: ${w.message}`)
      }
    }
  }

  if (precallPermissions.length > 0) {
    lines.push(`Precall permissions: ${precallPermissions.length} pending`)
    for (const pp of precallPermissions) {
      lines.push(`  - ${pp.id} expires ${pp.expiry}`)
    }
  }

  if (warnings.length > 0) {
    lines.push('Warnings:')
    for (const warning of warnings) {
      lines.push(`- ${String(warning.code ?? 'UNKNOWN')}: ${String(warning.message ?? '')}`)
    }
  }

  return lines.join('\n')
}

export function registerStatusCommand(
  program: Command,
  deps: { config: AgentWalletConfig; porto: PortoService; signer: SignerService },
) {
  const { config, porto, signer } = deps

  const cmd = program
    .command('status')
    .description('Inspect account, signer health, permissions, and balances')
    .option('--address <address>', 'Account address override')
    .option('--chain <name|id>', 'Filter to a specific chain')

  cmd.action((options: StatusOptions) =>
    runCommandAction(cmd, 'human', async (_mode) => {
      const address = options.address ?? config.porto?.address
      const warnings: Array<{ code: string; message: string }> = []

      const signerInfo = await signer.info()

      // Determine which chain IDs to show
      let chainIdsToShow: number[] = config.porto?.chainIds ?? []
      if (options.chain) {
        const filtered = getChainByIdOrName(options.chain)
        if (!filtered) {
          throw new AppError('INVALID_CHAIN', `Unknown chain: "${options.chain}". Use a chain name (e.g. base-sepolia) or numeric chain ID.`)
        }
        chainIdsToShow = [filtered.id]
      }

      // Gather per-chain data
      const chainsData: Record<string, {
        chainName: string
        permissions: { active: number; total: number; latestExpiry: string | null }
        balance: { formatted: string; symbol: string } | null
        warnings: Array<{ code: string; message: string }>
      }> = {}

      for (const chainId of chainIdsToShow) {
        const chain = Chains.all.find((c) => c.id === chainId)
        const chainName = chain?.name ?? `Chain ${String(chainId)}`
        const chainWarnings: Array<{ code: string; message: string }> = []

        let permSummary = { active: 0, total: 0, latestExpiry: null as string | null }
        if (address) {
          try {
            permSummary = await porto.permissionSummary({ address, chainId })
          } catch (error) {
            const appError = toAppError(error)
            chainWarnings.push({ code: appError.code, message: appError.message })
          }
        }

        let balanceData: { formatted: string; symbol: string } | null = null
        if (address) {
          try {
            const b = await porto.balance({ address, chainId })
            balanceData = { formatted: b.formatted, symbol: b.symbol }
          } catch (error) {
            const appError = toAppError(error)
            chainWarnings.push({ code: appError.code, message: appError.message })
          }
        }

        chainsData[String(chainId)] = {
          chainName,
          permissions: permSummary,
          balance: balanceData,
          warnings: chainWarnings,
        }
      }

      const nowSeconds = Math.floor(Date.now() / 1000)
      const precallPermissions = (config.porto?.precallPermissions ?? [])
        .filter((pp) => pp.expiry > nowSeconds)
        .map((pp) => ({ id: pp.id, chainId: pp.chainId, expiry: new Date(pp.expiry * 1000).toISOString() }))

      // Compute overall activation state from all chains
      const totalActive = Object.values(chainsData).reduce((sum, c) => sum + c.permissions.active, 0)
      const activationState =
        totalActive > 0 ? 'active_onchain' :
        precallPermissions.length > 0 ? 'precall_pending' :
        'unconfigured'

      return {
        command: 'status',
        poweredBy: 'Porto',
        account: {
          address: address ?? null,
        },
        signer: signerInfo,
        activation: { state: activationState },
        chains: chainsData,
        precallPermissions,
        warnings,
      }
    }, renderHuman),
  )
}
