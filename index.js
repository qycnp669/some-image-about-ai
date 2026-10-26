import fs from 'node:fs'
import path from 'node:path'

export const name = 'sessionGuard'
export const inject = []

function log(...a) {
  try { console.log('[session-guard]', ...a) } catch {}
}

const home = process.env.DSH_HOME || process.env.HOME || '/root'
const ROOT = path.join(home, '.dsh', 'sessions')
const BAK = path.join(home, 'backup')

function bad(n) {
  return /\.bak(\.|-|$)/i.test(n) || /-bak/i.test(n) || /^\./.test(n) ||
         /^(backup|bak|old|tmp|temp)$/i.test(n)
}

function move(src) {
  fs.mkdirSync(BAK, { recursive: true })
  const dst = path.join(BAK, path.basename(src) + '-' + Date.now())
  try {
    fs.renameSync(src, dst)
  } catch (e) {
    fs.cpSync(src, dst, { recursive: true })
    fs.rmSync(src, { recursive: true, force: true })
  }
  return dst
}

function sweep(dir, depth) {
  if (depth > 2) return 0
  let list = []
  try { list = fs.readdirSync(dir, { withFileTypes: true }) } catch { return 0 }
  let n = 0
  for (const e of list) {
    if (!e.isDirectory()) continue
    const p = path.join(dir, e.name)
    if (bad(e.name)) {
      try { log('已移出:', p, '→', move(p)); n++ } catch (err) { log('移动失败:', p, err.message) }
    } else {
      n += sweep(p, depth + 1)
    }
  }
  return n
}

export function apply() {
  try {
    if (!fs.existsSync(ROOT)) { log('sessions 目录不存在:', ROOT); return }
    const n = sweep(ROOT, 0)
    log(`完成，共移出 ${n} 个目录`)
  } catch (e) {
    log('异常（已忽略）:', e.message)
  }
}
