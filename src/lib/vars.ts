import { z } from 'incur'
import type { AgentWalletConfig } from './config.js'
import type { PortoService } from '../porto/service.js'
import type { SignerService } from '../signer/service.js'

export const varsSchema = z.object({
  config: z.custom<AgentWalletConfig>(),
  signer: z.custom<SignerService>(),
  porto: z.custom<PortoService>(),
})
