import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const FINISHKIT_DIR = join(homedir(), '.finishkit')
const CREDENTIALS_FILE = join(FINISHKIT_DIR, 'credentials')
const PENDING_SESSION_FILE = join(FINISHKIT_DIR, '.pending-session')

function ensureDir(): void {
  if (!existsSync(FINISHKIT_DIR)) {
    mkdirSync(FINISHKIT_DIR, { recursive: true })
  }
}

// --- Credentials ---

export interface Credentials {
  apiKey: string
  createdAt: string
  source: string
}

export function readCredentials(): Credentials | null {
  try {
    if (!existsSync(CREDENTIALS_FILE)) {
      process.stderr.write(`FinishKit: credentials file not found at ${CREDENTIALS_FILE}\n`)
      return null
    }
    const raw = readFileSync(CREDENTIALS_FILE, 'utf-8').trim()
    if (!raw) {
      process.stderr.write(`FinishKit: credentials file is empty at ${CREDENTIALS_FILE}\n`)
      return null
    }
    const parsed = JSON.parse(raw)
    if (typeof parsed.apiKey !== 'string' || !parsed.apiKey.trim()) {
      process.stderr.write(`FinishKit: credentials file missing apiKey field\n`)
      return null
    }
    process.stderr.write(`FinishKit: loaded API key from ${CREDENTIALS_FILE}\n`)
    return parsed as Credentials
  } catch (err) {
    process.stderr.write(`FinishKit: failed to read credentials at ${CREDENTIALS_FILE}: ${err instanceof Error ? err.message : String(err)}\n`)
    return null
  }
}

export function writeCredentials(apiKey: string, source: string): void {
  ensureDir()
  const data: Credentials = {
    apiKey,
    createdAt: new Date().toISOString(),
    source,
  }
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

export function deleteCredentials(): void {
  try {
    if (existsSync(CREDENTIALS_FILE)) unlinkSync(CREDENTIALS_FILE)
  } catch {
    // Ignore errors on cleanup
  }
}

// --- Pending Session ---

export interface PendingSession {
  code: string
  activateUrl: string
  createdAt: string
}

export function readPendingSession(): PendingSession | null {
  try {
    if (!existsSync(PENDING_SESSION_FILE)) return null
    const raw = readFileSync(PENDING_SESSION_FILE, 'utf-8').trim()
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed.code !== 'string' || !parsed.code.trim()) return null
    return parsed as PendingSession
  } catch {
    return null
  }
}

export function writePendingSession(code: string, activateUrl: string): void {
  ensureDir()
  const data: PendingSession = {
    code,
    activateUrl,
    createdAt: new Date().toISOString(),
  }
  writeFileSync(PENDING_SESSION_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

export function deletePendingSession(): void {
  try {
    if (existsSync(PENDING_SESSION_FILE)) unlinkSync(PENDING_SESSION_FILE)
  } catch {
    // Ignore errors on cleanup
  }
}

export function getCredentialsPath(): string {
  return CREDENTIALS_FILE
}
