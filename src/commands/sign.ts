import { Command } from 'commander'
import { AppError } from '../lib/errors.js'
import { runCommandAction } from '../lib/command.js'
import { saveConfig, type AgentWalletConfig } from '../lib/config.js'
import { resolveCommandChain, type PortoService } from '../porto/service.js'

type SignOptions = {
  address?: `0x${string}`
  calls: string
  chain?: string
}

function renderHuman({ payload }: { payload: Record<string, unknown> }) {
  const txHash = payload.txHash
  return [
    'Sign complete',
    `Status: ${String(payload.status ?? 'unknown')}`,
    `Transaction: ${typeof txHash === 'string' ? txHash : 'pending (not yet mined)'}`,
    `Bundle ID: ${String(payload.bundleId ?? 'n/a')}`,
  ].join('\n')
}

export function registerSignCommand(program: Command, deps: { config: AgentWalletConfig; porto: PortoService }) {
  const { config, porto } = deps

  const cmd = program
    .command('sign')
    .description('Sign and submit prepared calls using the local hardware-backed agent key')
    .requiredOption('--calls <json>', 'Calls JSON payload')
    .option('--chain <name|id>', 'Chain name or ID (required when multiple chains are configured)')
    .option('--address <address>', 'Account address override')

  cmd.action((options: SignOptions) =>
    runCommandAction(cmd, 'json', async (_mode) => {
      const chain = resolveCommandChain(config, options.chain)
      const result = await porto.send({
        address: options.address,
        calls: options.calls,
        chain,
      })
      saveConfig(config)
      return { command: 'sign', poweredBy: 'Porto', ...result }
    }, renderHuman),
  )
}
