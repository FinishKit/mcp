import { deleteCredentials, deletePendingSession, readCredentials, getCredentialsPath } from './credentials.js'

const useColor = !process.env.NO_COLOR && process.stdout.isTTY
const c = {
  green: (s: string) => (useColor ? `\x1b[32m${s}\x1b[0m` : s),
  dim: (s: string) => (useColor ? `\x1b[2m${s}\x1b[0m` : s),
  bold: (s: string) => (useColor ? `\x1b[1m${s}\x1b[0m` : s),
}

function main(): void {
  console.log('')
  console.log(c.bold('  FinishKit Logout'))
  console.log('')

  const existing = readCredentials()

  if (!existing) {
    console.log(c.dim('  No credentials found. You are not logged in.'))
    console.log('')
    return
  }

  deleteCredentials()
  deletePendingSession()

  console.log(`  ${c.green('\u2713')} Credentials removed from ${c.dim(getCredentialsPath())}`)
  console.log(c.dim('  You are now logged out.'))
  console.log('')
}

main()
