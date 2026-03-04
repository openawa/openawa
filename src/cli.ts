import { Cli } from 'incur'
import { configureCommand } from './commands/configure.js'
import { signCommand } from './commands/sign.js'
import { statusCommand } from './commands/status.js'
import { loadConfig } from './lib/config.js'
import { toAppError } from './lib/errors.js'
import { varsSchema } from './lib/vars.js'
import { closeWalletSession, PortoService } from './porto/service.js'
import { SignerService } from './signer/service.js'

const cli = Cli.create('openawa', {
  version: '0.1.0',
  description: 'Security-first agent wallet CLI (powered by Porto)',
  vars: varsSchema,
})
  .use(async (c, next) => {
    const config = loadConfig()
    const signer = new SignerService(config)
    const porto = new PortoService(config, signer)
    c.set('config', config)
    c.set('signer', signer)
    c.set('porto', porto)
    try {
      await next()
    } catch (error) {
      const appError = toAppError(error)
      const message = appError.details
        ? `${appError.message}\n\nDetails: ${JSON.stringify(appError.details, null, 2)}`
        : appError.message
      return c.error({ code: appError.code, message })
    } finally {
      closeWalletSession()
    }
  })
  .command(configureCommand)
  .command(signCommand)
  .command(statusCommand)

export default cli

// incur never calls exit(0) on success; Porto's HTTP keep-alive connections
// would otherwise keep the process alive indefinitely after the command runs.
void cli.serve().then(() => process.exit(0))
