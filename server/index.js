import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'
import pg from 'pg'
import { calculatePropMetrics, analyzeBehavior } from './services/propAnalytics.js'

const { Pool } = pg

const PORT = Number(process.env.AUTH_PORT || 4000)
const JWT_SECRET = process.env.JWT_SECRET || 'replace-this-secret-in-env'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const IS_PRODUCTION = String(process.env.NODE_ENV || '').toLowerCase() === 'production'
const SECURITY_HSTS_ENABLED = String(process.env.SECURITY_HSTS_ENABLED || (IS_PRODUCTION ? 'true' : 'false')).toLowerCase() === 'true'
const CORS_EXTRA_ORIGINS = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/api/auth/google/callback`
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const MT5_PYTHON_BIN =
  process.env.MT5_PYTHON_BIN || (process.platform === 'win32' ? 'py' : 'python3')
const MT5_FETCH_TIMEOUT_MS = Number(process.env.MT5_FETCH_TIMEOUT_MS || 90000)
const MT5_CRED_SECRET = process.env.MT5_CRED_SECRET || JWT_SECRET
const MT5_AUTO_SYNC_ENABLED = String(process.env.MT5_AUTO_SYNC_ENABLED || 'true').toLowerCase() !== 'false'
const MT5_AUTO_SYNC_INTERVAL_MS = Math.max(5000, Number(process.env.MT5_AUTO_SYNC_INTERVAL_MS || 15000))
const MT5_AUTO_SYNC_STALE_MS = Math.max(3000, Number(process.env.MT5_AUTO_SYNC_STALE_MS || 12000))
const MT5_AUTO_SYNC_DAYS = Math.max(1, Math.min(365, Number(process.env.MT5_AUTO_SYNC_DAYS || 30)))
const MT5_AUTO_SYNC_MAX_USERS = Math.max(1, Math.min(1000, Number(process.env.MT5_AUTO_SYNC_MAX_USERS || 200)))
const MT5_AUTO_SYNC_CONCURRENCY = Math.max(
  1,
  Math.min(5, Number(process.env.MT5_AUTO_SYNC_CONCURRENCY || 1))
)

const OTP_TTL_MS = 5 * 60 * 1000
const otpStore = new Map()
const PSYCH_TEST_CHOICES = ['A', 'B', 'C']
const TRADE_CONNECTORS = ['binance', 'okx', 'exness']
const DEFAULT_TRADE_PRODUCTS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'LTCUSDT',
  'TRXUSDT',
  'DOTUSDT',
  'AVAXUSDT',
  'MATICUSDT',
  'LINKUSDT',
  'ATOMUSDT',
  'SUIUSDT',
  '1000PEPEUSDT',
  'XAUUSD',
  'EURUSD',
  'GBPUSD',
  'USDJPY'
]
const MONTHLY_REPORT_AUTO_INTERVAL_MS = Number(
  process.env.MONTHLY_REPORT_AUTO_INTERVAL_MS || 6 * 60 * 60 * 1000
)
const MONTHLY_REPORT_AUTO_MAX_USERS = Number(process.env.MONTHLY_REPORT_AUTO_MAX_USERS || 500)
const DEFAULT_PSYCH_TEST_QUESTIONS = [
  {
    question: 'Hom nay ban co ke hoach giao dich ro rang chua?',
    optionA: 'Co, rat cu the',
    optionB: 'Co nhung chua chi tiet',
    optionC: 'Chua co'
  },
  {
    question: 'Khi thay gia chay manh, ban cam thay:',
    optionA: 'Binh tinh, cho setup',
    optionB: 'Hoi muon vao lenh nhanh',
    optionC: 'So bo lo (FOMO)'
  },
  {
    question: 'Ban co dat muc stop loss truoc khi vao lenh khong?',
    optionA: 'Luon luon',
    optionB: 'Thinh thoang',
    optionC: 'Khong'
  },
  {
    question: 'Sau mot lenh thua, ban se:',
    optionA: 'Dung lai phan tich',
    optionB: 'Giam khoi luong va tiep tuc',
    optionC: 'Muon go lo ngay'
  },
  {
    question: 'Khi chua co tin hieu ro rang, ban:',
    optionA: 'Khong giao dich',
    optionB: 'Xem xet them',
    optionC: 'Vao lenh thu'
  },
  {
    question: 'Ban cam thay the nao ve tai khoan hien tai?',
    optionA: 'Thoai mai, kiem soat tot',
    optionB: 'Hoi ap luc',
    optionC: 'Rat lo lang / cang thang'
  },
  {
    question: 'Ban co tuan thu he thong giao dich khong?',
    optionA: 'Luon tuan thu',
    optionB: 'Doi khi pha vo',
    optionC: 'Thuong xuyen pha vo'
  },
  {
    question: 'Khi thi truong di nguoc lenh:',
    optionA: 'Binh tinh theo ke hoach',
    optionB: 'Can nhac dong som',
    optionC: 'Hoang loan'
  },
  {
    question: 'Ban da chuan bi tam ly truoc khi trade chua?',
    optionA: 'Roi (ngu du, tinh than on)',
    optionB: 'Tam on',
    optionC: 'Met / mat tap trung'
  },
  {
    question: 'Ly do ban muon trade hom nay la:',
    optionA: 'Theo ke hoach',
    optionB: 'Muon kiem them loi nhuan',
    optionC: 'Muon go lo / cam xuc'
  }
]

const adminGmails = new Set(
  String(process.env.ADMIN_GMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
)

if (process.env.ADMIN_EMAIL) {
  adminGmails.add(String(process.env.ADMIN_EMAIL).trim().toLowerCase())
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.PGHOST || undefined,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
  user: process.env.PGUSER || undefined,
  password: process.env.PGPASSWORD || undefined,
  database: process.env.PGDATABASE || undefined
})

const mailerEnabled = Boolean(
  process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM
)

const transporter = mailerEnabled
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  : null

const app = express()
app.disable('x-powered-by')
app.use((req, res, next) => {
  const method = String(req.method || '').toUpperCase()
  const hasBody = ['POST', 'PUT', 'PATCH'].includes(method) && Number(req.headers['content-length'] || 0) > 0
  const contentType = String(req.headers['content-type'] || '').toLowerCase()
  if (hasBody && req.path.startsWith('/api/') && !contentType.includes('application/json')) {
    return res.status(415).json({ message: 'Unsupported content type. Use application/json.' })
  }
  return next()
})
app.use(express.json({ limit: '1mb' }))
app.use((req, res, next) => {
  res.setHeader('X-Request-Id', req.headers['x-request-id'] || crypto.randomUUID())
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '0')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "form-action 'self'",
      "img-src 'self' data: blob:",
      "connect-src 'self' " + [FRONTEND_URL, ...CORS_EXTRA_ORIGINS].join(' '),
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'"
    ].join('; ')
  )
  if (SECURITY_HSTS_ENABLED) {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }
  next()
})

app.use((error, _req, res, next) => {
  if (!error) return next()
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ message: 'Invalid JSON payload.' })
  }
  return next(error)
})

function createRateLimiter({ windowMs, max, keyResolver }) {
  const store = new Map()
  return (req, res, next) => {
    const now = Date.now()
    const key = String((keyResolver ? keyResolver(req) : req.ip) || req.ip || 'unknown')
    const hit = store.get(key)
    if (!hit || now - hit.start > windowMs) {
      store.set(key, { start: now, count: 1 })
      return next()
    }
    hit.count += 1
    if (hit.count > max) {
      return res.status(429).json({ message: 'Too many requests. Please try again later.' })
    }
    return next()
  }
}

const authRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 90,
  keyResolver: (req) => req.ip
})

const writeRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 80,
  keyResolver: (req) => req.auth?.sub || req.ip
})

const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 18,
  keyResolver: (req) => req.auth?.sub || req.ip
})

app.use('/api/auth', authRateLimiter)
app.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(req.method || '').toUpperCase())) return next()
  return writeRateLimiter(req, res, next)
})

const corsAllowedOrigins = [
  FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...CORS_EXTRA_ORIGINS
]
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true)
      if (corsAllowedOrigins.includes(origin)) return callback(null, true)
      return callback(new Error('CORS origin denied'))
    },
    credentials: true
  })
)

if (IS_PRODUCTION && JWT_SECRET === 'replace-this-secret-in-env') {
  console.warn('[security] JWT_SECRET is using the development fallback. Set a strong secret before production.')
}

let monthlyReportTimer = null
let mt5AutoSyncTimer = null
let mt5AutoSyncRunning = false
const mt5AutoSyncInFlight = new Set()

const mt5AgentConnections = new Map()

let wss = null

function normalizedEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function normalizedPhone(phone) {
  return String(phone || '').trim()
}

function isAdminGmail(email) {
  const normalized = normalizedEmail(email)
  return adminGmails.has(normalized)
}

function resolveRole(email, currentRole = 'user') {
  return isAdminGmail(email) ? 'admin' : currentRole
}

function psychScoreOfChoice(choice) {
  if (choice === 'A') return 2
  if (choice === 'B') return 1
  return 0
}

function psychResultLabel(score) {
  if (score >= 16) return 'Trang thai on dinh'
  if (score >= 11) return 'Thieu ky luat'
  if (score >= 6) return 'FOMO / cam xuc'
  return 'So hai / mat kiem soat'
}

function computeRR(entry, tp, sl) {
  const reward = Math.abs(tp - entry)
  const risk = Math.abs(entry - sl)
  if (reward <= 0 || risk <= 0) return { rr: 0, warning: false }
  const rr = reward / risk
  return { rr, warning: risk > reward }
}

const TRADE_REASON_OPTIONS = ['high_win_setup', 'half_setup_early_entry', 'early_entry_high_risk']
const TRADE_MOOD_OPTIONS = ['vui', 'buon', 'binh_thuong']
const RANK_LADDER = [
  { key: 'bronze', minPoints: 0, labelVi: 'Dong', labelEn: 'Bronze' },
  { key: 'silver', minPoints: 800, labelVi: 'Bac', labelEn: 'Silver' },
  { key: 'gold', minPoints: 1600, labelVi: 'Vang', labelEn: 'Gold' },
  { key: 'platinum', minPoints: 2600, labelVi: 'Bach Kim', labelEn: 'Platinum' },
  { key: 'diamond', minPoints: 3800, labelVi: 'Kim Cuong', labelEn: 'Diamond' },
  { key: 'legendary', minPoints: 5200, labelVi: 'Huyen Thoai', labelEn: 'Legendary' }
]
const PRO_PLAN_CODE = 'pro'
const FREE_PLAN_CODE = 'free'
const PRO_PLAN_PRICE_VND = 149000
const PRO_UPGRADE_QR_IMAGE_URL = String(process.env.PRO_UPGRADE_QR_IMAGE_URL || '/images/pro-upgrade-qr.svg')
const PRO_UPGRADE_QR_OWNER = String(process.env.PRO_UPGRADE_QR_OWNER || 'DINH VAN TAM')
const PRO_UPGRADE_QR_PHONE = String(process.env.PRO_UPGRADE_QR_PHONE || '0905833042')
const PRO_UPGRADE_QR_BANK = String(process.env.PRO_UPGRADE_QR_BANK || 'VietQR / NAPAS247')
const PRO_UPGRADE_AUTO_VERIFY_ENABLED = String(process.env.PRO_UPGRADE_AUTO_VERIFY_ENABLED || 'true').toLowerCase() !== 'false'
const PRO_UPGRADE_AUTO_MIN_CONFIDENCE = Math.max(
  60,
  Math.min(100, Number(process.env.PRO_UPGRADE_AUTO_MIN_CONFIDENCE || 78))
)
const PAYOS_CLIENT_ID = String(process.env.PAYOS_CLIENT_ID || '').trim()
const PAYOS_API_KEY = String(process.env.PAYOS_API_KEY || '').trim()
const PAYOS_CHECKSUM_KEY = String(process.env.PAYOS_CHECKSUM_KEY || '').trim()
const PAYOS_PARTNER_CODE = String(process.env.PAYOS_PARTNER_CODE || '').trim()
const PAYOS_API_BASE_URL = String(process.env.PAYOS_API_BASE_URL || 'https://api-merchant.payos.vn').replace(/\/+$/, '')
const PAYOS_ENABLED = Boolean(PAYOS_CLIENT_ID && PAYOS_API_KEY && PAYOS_CHECKSUM_KEY)
const PLAN_CATALOG = Object.freeze([
  {
    code: PRO_PLAN_CODE,
    name: 'LuminaFox Premium',
    priceVnd: PRO_PLAN_PRICE_VND,
    durationDays: 0,
    features: [
      'AI Prop Guardian va realtime risk dashboard',
      'Trading journal, analytics, reports va MT5/Exness sync',
      'Taskcare, safe lot calculator va capital preservation',
      'Mentor/community/admin-ready ecosystem'
    ]
  }
])
const FREE_PLAN_DEFINITION = Object.freeze({
  code: FREE_PLAN_CODE,
  name: 'Payment required',
  priceVnd: 0,
  durationDays: 0,
  features: []
})

function normalizeWalletAddress(value) {
  return String(value || '')
    .trim()
    .slice(0, 160)
}

function normalizeProofImageDataUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (!raw.startsWith('data:image/')) return ''
  if (raw.length > 950000) return ''
  return raw
}

function normalizePayerName(value) {
  return String(value || '')
    .trim()
    .slice(0, 120)
}

function normalizePayerPhone(value) {
  const phone = String(value || '')
    .trim()
    .slice(0, 32)
  if (!phone) return ''
  return /^[0-9+()\-\s]{6,32}$/.test(phone) ? phone : ''
}

function normalizeTransferContent(value) {
  return String(value || '')
    .trim()
    .slice(0, 255)
}

function buildUpgradeQrRef({ userId, orderId = 0 } = {}) {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const uid = String(userId || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-4)
    .toUpperCase()
    .padStart(4, '0')
  const ord = String(orderId || 0).replace(/[^0-9]/g, '').slice(-4).padStart(4, '0')
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase()
  return `LFXPRO${y}${m}${d}${uid}${ord}${rand}`.slice(0, 32)
}

function computePaymentProofDigest(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function evaluateUpgradeAutoApproval({
  order,
  proofImageUrl,
  payerName,
  payerPhone,
  transferContent,
  duplicateProofUsed
}) {
  const reasons = []
  let confidence = 0
  const normalizedTransfer = String(transferContent || '').toUpperCase()
  const qrRef = String(order?.qr_ref || '').toUpperCase()
  const hasRef = Boolean(qrRef && normalizedTransfer && normalizedTransfer.includes(qrRef))

  if (proofImageUrl) {
    confidence += 35
    reasons.push('proof_image')
  }
  if (String(proofImageUrl || '').length >= 28000) {
    confidence += 15
    reasons.push('proof_size_ok')
  } else {
    reasons.push('proof_size_low')
  }
  if (String(payerName || '').length >= 4) {
    confidence += 10
    reasons.push('payer_name_ok')
  }
  const payerDigits = String(payerPhone || '').replace(/\D/g, '')
  if (payerDigits.length >= 9) {
    confidence += 10
    reasons.push('payer_phone_ok')
  }
  if (hasRef) {
    confidence += 20
    reasons.push('transfer_ref_match')
  } else {
    reasons.push('transfer_ref_missing')
  }
  if (Number(order?.amount_vnd || 0) === PRO_PLAN_PRICE_VND) {
    confidence += 10
    reasons.push('amount_match')
  }
  if (duplicateProofUsed) {
    confidence = Math.max(0, confidence - 60)
    reasons.push('duplicate_proof_detected')
  }

  const autoApproved =
    PRO_UPGRADE_AUTO_VERIFY_ENABLED &&
    !duplicateProofUsed &&
    hasRef &&
    confidence >= PRO_UPGRADE_AUTO_MIN_CONFIDENCE

  return {
    autoApproved,
    confidence: Math.max(0, Math.min(100, confidence)),
    reasons
  }
}

function normalizePayosValue(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function createPayosSignature(data) {
  const payload = Object.keys(data || {})
    .sort()
    .filter((key) => data[key] !== undefined && data[key] !== null)
    .map((key) => `${key}=${normalizePayosValue(data[key])}`)
    .join('&')
  return crypto.createHmac('sha256', PAYOS_CHECKSUM_KEY).update(payload).digest('hex')
}

function verifyPayosSignature(data, signature) {
  if (!PAYOS_CHECKSUM_KEY || !signature) return false
  const expected = createPayosSignature(data || {})
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)))
  } catch {
    return false
  }
}

function buildFrontendUrl(pathname = '/') {
  const base = FRONTEND_URL.replace(/\/+$/, '')
  const pathPart = String(pathname || '/').startsWith('/') ? String(pathname || '/') : `/${pathname}`
  return `${base}${pathPart}`
}

async function createPayosPaymentLink({ order, qrRef, plan }) {
  if (!PAYOS_ENABLED) return null
  const orderCode = Number(order.id)
  const description = `LFXPRO${order.id}`.slice(0, 25)
  const returnUrl = buildFrontendUrl(`/pricing?payos=success&orderId=${order.id}`)
  const cancelUrl = buildFrontendUrl(`/pricing?payos=cancel&orderId=${order.id}`)
  const signaturePayload = {
    amount: Number(plan.priceVnd || PRO_PLAN_PRICE_VND),
    cancelUrl,
    description,
    orderCode,
    returnUrl
  }
  const body = {
    ...signaturePayload,
    buyerName: PRO_UPGRADE_QR_OWNER,
    buyerPhone: PRO_UPGRADE_QR_PHONE,
    items: [
      {
        name: plan.name,
        quantity: 1,
        price: Number(plan.priceVnd || PRO_PLAN_PRICE_VND)
      }
    ],
    signature: createPayosSignature(signaturePayload)
  }
  const headers = {
    'Content-Type': 'application/json',
    'x-client-id': PAYOS_CLIENT_ID,
    'x-api-key': PAYOS_API_KEY
  }
  if (PAYOS_PARTNER_CODE) headers['x-partner-code'] = PAYOS_PARTNER_CODE

  const response = await fetch(`${PAYOS_API_BASE_URL}/v2/payment-requests`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || String(payload?.code || '00') !== '00') {
    const message = payload?.desc || payload?.message || `PayOS request failed (${response.status})`
    throw new Error(message)
  }
  const data = payload.data || {}
  return {
    providerOrderCode: String(data.orderCode || orderCode),
    paymentLinkId: String(data.paymentLinkId || ''),
    checkoutUrl: String(data.checkoutUrl || ''),
    qrCode: String(data.qrCode || ''),
    raw: payload,
    qrRef,
    description
  }
}

function normalizeRankTier(value, fallback = 'bronze') {
  const key = String(value || '')
    .trim()
    .toLowerCase()
  return RANK_LADDER.some((tier) => tier.key === key) ? key : fallback
}

function rankTierByPoints(pointsRaw) {
  const points = Math.max(0, Math.round(Number(pointsRaw || 0)))
  let current = RANK_LADDER[0]
  let next = null
  for (let i = 0; i < RANK_LADDER.length; i++) {
    const tier = RANK_LADDER[i]
    if (points >= tier.minPoints) {
      current = tier
      next = RANK_LADDER[i + 1] || null
    }
  }
  const progressPct = next
    ? Math.max(0, Math.min(100, ((points - current.minPoints) / (next.minPoints - current.minPoints)) * 100))
    : 100
  const pointsToNext = next ? Math.max(0, next.minPoints - points) : 0
  return {
    key: current.key,
    labelVi: current.labelVi,
    labelEn: current.labelEn,
    nextKey: next?.key || null,
    nextLabelVi: next?.labelVi || null,
    nextLabelEn: next?.labelEn || null,
    progressPct: Number(progressPct.toFixed(2)),
    pointsToNext
  }
}

function buildChecklistRankPointDelta({
  totalScore = 0,
  emotionScore = 0,
  planScore = 0,
  rrRatio = 0,
  riskPercent = 0,
  canTrade = false,
  violateDailyLoss = false,
  readyAccept = false
}) {
  const scoreBase = Math.round(clampMetric(totalScore, 0, 100) * 0.16)
  const emotionBonus = Math.round(clampMetric(emotionScore, 0, 100) * 0.04)
  const planBonus = Math.round(clampMetric(planScore, 0, 100) * 0.04)
  const rrBonus = rrRatio >= 2 ? 12 : rrRatio >= 1.5 ? 7 : rrRatio >= 1 ? 3 : -4
  const riskPenalty = riskPercent > 2 ? -8 : riskPercent > 1.5 ? -4 : 0
  const tradeBonus = canTrade ? 8 : -6
  const violationPenalty = violateDailyLoss ? -14 : 0
  const readinessPenalty = readyAccept ? 0 : -5
  const points = Math.max(
    -24,
    Math.min(36, scoreBase + emotionBonus + planBonus + rrBonus + riskPenalty + tradeBonus + violationPenalty + readinessPenalty)
  )
  return {
    points,
    reason: `checklist=${totalScore}|emotion=${emotionScore}|plan=${planScore}|rr=${Number(rrRatio || 0).toFixed(2)}|risk=${Number(riskPercent || 0).toFixed(2)}|canTrade=${canTrade ? 1 : 0}`
  }
}

async function appendRankPointEvent({
  userId,
  points,
  source = 'system',
  reason = '',
  meta = {},
  createdBy = 'system'
}) {
  const delta = Math.round(Number(points || 0))
  if (!userId || !Number.isFinite(delta) || delta === 0) return null
  const userUpdateRes = await pool.query(
    `UPDATE users
     SET rank_points = COALESCE(rank_points, 0) + $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING id, rank_points`,
    [delta, userId]
  )
  const updatedUser = userUpdateRes.rows[0]
  if (!updatedUser) return null
  const tier = rankTierByPoints(updatedUser.rank_points).key
  await pool.query(`UPDATE users SET rank_tier = $1, updated_at = NOW() WHERE id = $2`, [tier, userId])
  const eventRes = await pool.query(
    `INSERT INTO user_rank_point_events (user_id, points, source, reason, meta_json, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())
     RETURNING id, user_id, points, source, reason, created_at`,
    [
      userId,
      delta,
      String(source || 'system').slice(0, 80),
      String(reason || '').slice(0, 255),
      JSON.stringify(meta || {}),
      String(createdBy || 'system').slice(0, 120)
    ]
  )
  return eventRes.rows[0] || null
}

function buildRankPointsFromMetrics({ analysis, checklistSummary, storedPoints = 0 }) {
  const behaviorScore = clampMetric(toFiniteNumber(analysis?.behaviorScore, 0), 0, 100)
  const disciplineRate = clampMetric(toFiniteNumber(analysis?.disciplineRate, 0), 0, 100)
  const winRate = clampMetric(toFiniteNumber(analysis?.winRate, 0), 0, 100)
  const profitFactor = clampMetric(toFiniteNumber(analysis?.profitFactor, 0), 0, 4)
  const rr = clampMetric(toFiniteNumber(analysis?.rr, 0), 0, 4)
  const checklistCount = Math.max(0, Number(checklistSummary?.checklistCount || 0))
  const canTradeRate = clampMetric(toFiniteNumber(checklistSummary?.canTradeRate, 0), 0, 100)
  const blockedCount = Math.max(0, Number(checklistSummary?.blockedCount || 0))
  const avgBehaviorScore = clampMetric(toFiniteNumber(checklistSummary?.avgBehaviorScore, behaviorScore), 0, 100)

  const dynamicPoints = Math.round(
    behaviorScore * 6 +
      disciplineRate * 3 +
      Math.min(winRate, 85) * 2.4 +
      profitFactor * 72 +
      rr * 82 +
      canTradeRate * 2 +
      avgBehaviorScore * 2.2 +
      Math.min(checklistCount, 90) * 4 -
      Math.min(blockedCount, 30) * 12
  )

  const basePoints = Math.max(0, dynamicPoints)
  const bonusPoints = Math.max(0, Math.round(Number(storedPoints || 0)))
  const totalPoints = basePoints + bonusPoints
  const tier = rankTierByPoints(totalPoints)
  return {
    basePoints,
    bonusPoints,
    totalPoints,
    tier
  }
}

function normalizeSymbol(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

function normalizeJournalText(value, max = 120) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, max)
}

function normalizeJournalSide(value) {
  const side = String(value || '').trim().toUpperCase()
  return ['LONG', 'SHORT'].includes(side) ? side : ''
}

function normalizeJournalStatus(value, exitPrice) {
  const status = String(value || '').trim().toLowerCase()
  if (['open', 'closed'].includes(status)) return status
  return Number(exitPrice || 0) > 0 ? 'closed' : 'open'
}

function normalizeJournalTags(value) {
  const list = Array.isArray(value)
    ? value
    : String(value || '')
        .split(',')
        .map((item) => item.trim())
  const out = []
  const seen = new Set()
  for (const raw of list) {
    const tag = normalizeJournalText(raw, 40)
    const key = tag.toLowerCase()
    if (!tag || seen.has(key)) continue
    seen.add(key)
    out.push(tag)
    if (out.length >= 12) break
  }
  return out
}

function computeJournalTradeMetrics({
  side,
  entryPrice,
  exitPrice,
  stopLoss,
  takeProfit,
  volume,
  fees
}) {
  const entry = Number(entryPrice || 0)
  const exit = Number(exitPrice || 0)
  const sl = Number(stopLoss || 0)
  const tp = Number(takeProfit || 0)
  const qty = Number(volume || 0)
  const cost = Math.max(0, Number(fees || 0))
  const hasExit = entry > 0 && exit > 0 && qty > 0
  const direction = side === 'SHORT' ? -1 : 1
  const pnl = hasExit ? Number((((exit - entry) * qty * direction) - cost).toFixed(2)) : 0
  const plannedRiskPerUnit = sl > 0 ? Math.abs(entry - sl) : 0
  const plannedRiskValue = plannedRiskPerUnit > 0 && qty > 0 ? plannedRiskPerUnit * qty : 0
  const rr = hasExit && plannedRiskValue > 0 ? Number((pnl / plannedRiskValue).toFixed(4)) : 0
  const plannedRewardPerUnit = tp > 0 ? Math.abs(tp - entry) : 0
  const plannedRr = plannedRiskPerUnit > 0 && plannedRewardPerUnit > 0 ? Number((plannedRewardPerUnit / plannedRiskPerUnit).toFixed(4)) : 0
  return { pnl, rr, plannedRr }
}

function mapJournalAccount(row) {
  if (!row) return null
  return {
    id: Number(row.id),
    name: row.name,
    broker: row.broker,
    market: row.market,
    currency: row.currency,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapJournalTrade(row) {
  if (!row) return null
  return {
    id: Number(row.id),
    accountId: Number(row.account_id),
    accountName: row.account_name || '',
    symbol: row.symbol,
    assetClass: row.asset_class,
    side: row.side,
    status: row.status,
    entryTime: row.entry_time,
    exitTime: row.exit_time,
    entryPrice: Number(row.entry_price || 0),
    exitPrice: Number(row.exit_price || 0),
    stopLoss: Number(row.stop_loss || 0),
    takeProfit: Number(row.take_profit || 0),
    volume: Number(row.volume || 0),
    fees: Number(row.fees || 0),
    session: row.session,
    strategyTag: row.strategy_tag,
    emotionTag: row.emotion_tag,
    setupTag: row.setup_tag,
    customTags: Array.isArray(row.custom_tags) ? row.custom_tags : [],
    notes: row.notes,
    source: row.source,
    importRef: row.import_ref,
    mae: Number(row.mae || 0),
    mfe: Number(row.mfe || 0),
    pnl: Number(row.pnl || 0),
    rr: Number(row.rr || 0),
    plannedRr: Number(row.planned_rr || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function maskSecret(value) {
  const str = String(value || '')
  if (!str) return ''
  if (str.length <= 6) return '*'.repeat(str.length)
  return `${str.slice(0, 3)}${'*'.repeat(str.length - 6)}${str.slice(-3)}`
}

function mt5CredKey() {
  return crypto.createHash('sha256').update(String(MT5_CRED_SECRET)).digest()
}

function encryptMt5Password(plain) {
  const source = String(plain || '')
  if (!source) return ''
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', mt5CredKey(), iv)
  const encrypted = Buffer.concat([cipher.update(source, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `enc:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
}

function decryptMt5Password(stored) {
  const source = String(stored || '')
  if (!source) return ''
  if (!source.startsWith('enc:')) return source
  const parts = source.split(':')
  if (parts.length !== 4) throw new Error('Invalid encrypted MT5 password format')
  const iv = Buffer.from(parts[1], 'base64')
  const tag = Buffer.from(parts[2], 'base64')
  const encrypted = Buffer.from(parts[3], 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', mt5CredKey(), iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

function parseNumericLoose(value) {
  if (value === null || value === undefined) return 0
  let raw = String(value).trim()
  if (!raw) return 0
  raw = raw.replace(/\s+/g, '').replace(/,/g, '.')
  raw = raw.replace(/[^0-9.+-]/g, '')
  const num = Number(raw)
  return Number.isFinite(num) ? num : 0
}

function parseCsvLine(line, delimiter) {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === delimiter && !inQuotes) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out.map((x) => String(x || '').trim())
}

function detectDelimiter(lines) {
  const sample = (lines || []).slice(0, 6).join('\n')
  const candidates = [',', ';', '\t', '|']
  let best = ','
  let bestCount = -1
  for (const d of candidates) {
    const count = sample.split(d).length - 1
    if (count > bestCount) {
      bestCount = count
      best = d
    }
  }
  return best
}

function normalizeHeaderToken(token) {
  return String(token || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function findHeaderIndex(headers, aliases) {
  const normalized = headers.map(normalizeHeaderToken)
  for (let i = 0; i < normalized.length; i++) {
    if (aliases.includes(normalized[i])) return i
  }
  return -1
}

function parseStatementContent(content) {
  const raw = String(content || '').replace(/^\uFEFF/, '')
  const lines = raw
    .split(/\r?\n/g)
    .map((x) => x.trim())
    .filter(Boolean)
  if (lines.length < 2) {
    throw new Error('File statement quá ngắn. Vui lòng dùng CSV/TXT export từ Exness/MT5.')
  }
  const delimiter = detectDelimiter(lines)
  const table = lines.map((line) => parseCsvLine(line, delimiter))
  const header = table[0]
  const rows = table.slice(1)

  const idxTicket = findHeaderIndex(header, ['ticket', 'deal', 'dealticket'])
  const idxSymbol = findHeaderIndex(header, ['symbol', 'instrument', 'product'])
  const idxType = findHeaderIndex(header, ['type', 'side', 'action'])
  const idxVolume = findHeaderIndex(header, ['volume', 'lot', 'lots', 'size'])
  const idxPrice = findHeaderIndex(header, ['price', 'openprice', 'entryprice'])
  const idxProfit = findHeaderIndex(header, ['profit', 'pnl', 'pl', 'netprofit'])
  const idxTime = findHeaderIndex(header, ['time', 'opentime', 'closetime', 'date', 'datetime'])
  const idxComment = findHeaderIndex(header, ['comment', 'note'])

  if (idxProfit < 0) {
    throw new Error('Không tìm thấy cột Profit/PnL trong statement.')
  }

  const deals = []
  for (const cols of rows) {
    const profit = parseNumericLoose(cols[idxProfit])
    const symbol = idxSymbol >= 0 ? String(cols[idxSymbol] || '').trim() : ''
    const volume = idxVolume >= 0 ? parseNumericLoose(cols[idxVolume]) : 0
    const ticket = idxTicket >= 0 ? String(cols[idxTicket] || '').trim() : ''
    const type = idxType >= 0 ? String(cols[idxType] || '').trim() : ''
    const time = idxTime >= 0 ? String(cols[idxTime] || '').trim() : ''
    const comment = idxComment >= 0 ? String(cols[idxComment] || '').trim() : ''
    const price = idxPrice >= 0 ? parseNumericLoose(cols[idxPrice]) : 0
    if (!symbol && !ticket && !profit) continue
    deals.push({
      ticket,
      symbol,
      type,
      volume,
      price,
      profit,
      time,
      comment
    })
  }
  if (!deals.length) throw new Error('Không parse được deals từ statement.')
  return { delimiter, header, deals }
}

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function clampMetric(value, min = 0, max = 100) {
  const n = toFiniteNumber(value, min)
  return Math.max(min, Math.min(max, n))
}

function mt5TimeToIso(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string') {
    const raw = value.trim()
    if (!raw) return null
    const asNum = Number(raw)
    if (Number.isFinite(asNum)) {
      const ms = asNum > 1e12 ? asNum : asNum * 1000
      return new Date(ms).toISOString()
    }
    const normalized = raw.replace(/\./g, '-').replace(' ', 'T')
    const dt = new Date(normalized)
    if (!Number.isNaN(dt.getTime())) return dt.toISOString()
    return raw
  }
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  const ms = n > 1e12 ? n : n * 1000
  return new Date(ms).toISOString()
}

function dayKeyFromTime(value) {
  const iso = mt5TimeToIso(value)
  if (!iso) return 'unknown'
  return String(iso).slice(0, 10) || 'unknown'
}

function normalizeTradeSide(typeValue) {
  const t = Number(typeValue)
  if (t === 0) return 'LONG'
  if (t === 1) return 'SHORT'
  return String(typeValue ?? '--')
}

function normalizeCloseReason(reasonValue) {
  const code = Number(reasonValue)
  if (code === 4) return 'SL'
  if (code === 5) return 'TP'
  if (code === 6) return 'STOP_OUT'
  if (code === 1 || code === 2 || code === 0) return 'MANUAL'
  return 'OTHER'
}

function normalizePositivePrice(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

function buildTradeBook(rawSnapshot) {
  const snapshot = Array.isArray(rawSnapshot)
    ? { historyDeals: rawSnapshot, historyOrders: [], openPositions: [] }
    : rawSnapshot && typeof rawSnapshot === 'object'
      ? rawSnapshot
      : { historyDeals: [], historyOrders: [], openPositions: [] }

  const deals = Array.isArray(snapshot.historyDeals) ? snapshot.historyDeals : []
  const orders = Array.isArray(snapshot.historyOrders) ? snapshot.historyOrders : []
  const openPositions = Array.isArray(snapshot.openPositions) ? snapshot.openPositions : []

  const orderByPosition = new Map()
  const orderHistoryByPosition = new Map()
  for (const order of orders) {
    const positionId = order?.position_id ?? order?.positionId ?? null
    if (positionId === null || positionId === undefined || positionId === '') continue
    const key = String(positionId)
    const doneAt = toFiniteNumber(order?.time_done || order?.time_setup || 0, 0)
    const rawSl = order?.sl
    const rawTp = order?.tp
    if (!orderHistoryByPosition.has(key)) orderHistoryByPosition.set(key, [])
    orderHistoryByPosition.get(key).push({
      doneAt,
      hasSlField: rawSl !== null && rawSl !== undefined && rawSl !== '',
      hasTpField: rawTp !== null && rawTp !== undefined && rawTp !== '',
      sl: normalizePositivePrice(rawSl),
      tp: normalizePositivePrice(rawTp)
    })
    const prev = orderByPosition.get(key)
    const prevAt = prev ? toFiniteNumber(prev?.time_done || prev?.time_setup || 0, 0) : -1
    if (doneAt >= prevAt) {
      const sl = normalizePositivePrice(order?.sl)
      const tp = normalizePositivePrice(order?.tp)
      orderByPosition.set(key, {
        ...order,
        sl: sl ?? (prev?.sl ?? null),
        tp: tp ?? (prev?.tp ?? null)
      })
    }
  }

  const orderBehaviorByPosition = new Map()
  for (const [key, historyRaw] of orderHistoryByPosition.entries()) {
    const history = [...historyRaw].sort((a, b) => a.doneAt - b.doneAt)
    const firstSl = history.find((item) => item.sl)
    const lastSlRecord = [...history].reverse().find((item) => item.hasSlField)
    const firstTp = history.find((item) => item.tp)
    const lastTpRecord = [...history].reverse().find((item) => item.hasTpField)
    orderBehaviorByPosition.set(key, {
      initialSl: firstSl?.sl || null,
      finalSl: lastSlRecord ? lastSlRecord.sl || null : firstSl?.sl || null,
      hasFinalSlRecord: Boolean(lastSlRecord),
      slRemoved: Boolean(firstSl?.sl && lastSlRecord && !lastSlRecord.sl),
      initialTp: firstTp?.tp || null,
      finalTp: lastTpRecord ? lastTpRecord.tp || null : firstTp?.tp || null,
      hasFinalTpRecord: Boolean(lastTpRecord),
      tpRemoved: Boolean(firstTp?.tp && lastTpRecord && !lastTpRecord.tp),
      orderChangeCount: Math.max(0, history.length - 1)
    })
  }

  const openPositionByKey = new Map()
  for (const position of openPositions) {
    const keys = [position?.identifier, position?.position_id, position?.ticket]
      .map((x) => (x === null || x === undefined || x === '' ? null : String(x)))
      .filter(Boolean)
    if (!keys.length) continue
    const value = {
      sl: normalizePositivePrice(position?.sl),
      tp: normalizePositivePrice(position?.tp)
    }
    for (const key of keys) openPositionByKey.set(key, value)
  }

  const sortedDeals = [...deals]
    .filter((deal) => {
      const symbol = String(deal?.symbol || '').trim()
      const volume = toFiniteNumber(deal?.volume, 0)
      const hasPosition =
        deal?.position_id !== null &&
        deal?.position_id !== undefined &&
        String(deal?.position_id || '').trim() !== ''
      return Boolean(symbol) && (volume > 0 || hasPosition)
    })
    .map((deal, idx) => ({ ...deal, __idx: idx, __time: toFiniteNumber(deal?.time, 0) }))
    .sort((a, b) => (a.__time || 0) - (b.__time || 0))

  const groups = new Map()
  for (const deal of sortedDeals) {
    const positionId = deal?.position_id ?? deal?.positionId ?? null
    const ticket = deal?.ticket ?? deal?.order ?? null
    const key =
      positionId !== null && positionId !== undefined && positionId !== ''
        ? `pos:${String(positionId)}`
        : `deal:${String(ticket || deal.__idx)}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(deal)
  }

  const trades = []
  for (const [groupKey, groupDealsRaw] of groups.entries()) {
    const groupDeals = [...groupDealsRaw].sort((a, b) => (a.__time || 0) - (b.__time || 0))
    const entryDeals = groupDeals.filter((d) => Number(d?.entry) === 0)
    const exitDeals = groupDeals.filter((d) => [1, 2, 3].includes(Number(d?.entry)))
    const openDeal = entryDeals[0] || groupDeals[0] || null
    const closeDeal = exitDeals.length ? exitDeals[exitDeals.length - 1] : null
    if (!openDeal) continue

    const realizedDeals = exitDeals.length ? exitDeals : groupDeals
    const profit = realizedDeals.reduce((sum, d) => sum + toFiniteNumber(d?.profit, 0), 0)
    const commission = groupDeals.reduce((sum, d) => sum + toFiniteNumber(d?.commission, 0), 0)
    const fee = groupDeals.reduce((sum, d) => sum + toFiniteNumber(d?.fee, 0), 0)
    const swap = groupDeals.reduce((sum, d) => sum + toFiniteNumber(d?.swap, 0), 0)

    const positionId = openDeal?.position_id ?? closeDeal?.position_id ?? null
    const posKey = positionId === null || positionId === undefined || positionId === '' ? null : String(positionId)
    const orderMeta = posKey ? orderByPosition.get(posKey) : null
    const behaviorMeta = posKey ? orderBehaviorByPosition.get(posKey) : null
    const openMeta = (posKey && openPositionByKey.get(posKey)) || openPositionByKey.get(String(openDeal?.ticket || ''))

    let sl = normalizePositivePrice(orderMeta?.sl) ?? normalizePositivePrice(openMeta?.sl)
    let tp = normalizePositivePrice(orderMeta?.tp) ?? normalizePositivePrice(openMeta?.tp)
    const closePrice = normalizePositivePrice(closeDeal?.price)
    const closeReasonCode = Number(closeDeal?.reason)
    if (!sl && closePrice && closeReasonCode === 4) sl = closePrice
    if (!tp && closePrice && closeReasonCode === 5) tp = closePrice

    const initialSl = behaviorMeta?.initialSl || sl || null
    const finalSl = behaviorMeta?.hasFinalSlRecord ? behaviorMeta.finalSl || null : sl || null
    const initialTp = behaviorMeta?.initialTp || tp || null
    const finalTp = behaviorMeta?.hasFinalTpRecord ? behaviorMeta.finalTp || null : tp || null

    const openTime = mt5TimeToIso(openDeal?.time)
    const closeTime = closeDeal ? mt5TimeToIso(closeDeal?.time) : null
    const timeline = closeTime || openTime || null

    trades.push({
      tradeKey: groupKey,
      positionId: posKey,
      symbol: String(openDeal?.symbol || closeDeal?.symbol || '--'),
      side: normalizeTradeSide(openDeal?.type),
      volume: toFiniteNumber(openDeal?.volume ?? closeDeal?.volume, 0),
      entryPrice: normalizePositivePrice(openDeal?.price),
      exitPrice: closePrice,
      tp: finalTp || tp,
      sl: finalSl || sl,
      initialSl,
      finalSl,
      initialTp,
      finalTp,
      slRemoved: Boolean(behaviorMeta?.slRemoved),
      tpRemoved: Boolean(behaviorMeta?.tpRemoved),
      orderChangeCount: Number(behaviorMeta?.orderChangeCount || 0),
      status: closeDeal ? 'closed' : 'open',
      closeReason: closeDeal ? normalizeCloseReason(closeDeal?.reason) : 'OPEN',
      openTime,
      closeTime,
      timeline,
      ticketOpen: openDeal?.ticket ?? null,
      ticketClose: closeDeal?.ticket ?? null,
      orderOpen: openDeal?.order ?? null,
      orderClose: closeDeal?.order ?? null,
      dealCount: groupDeals.length,
      profit: Number(profit.toFixed(2)),
      commission: Number(commission.toFixed(2)),
      fee: Number(fee.toFixed(2)),
      swap: Number(swap.toFixed(2))
    })
  }

  trades.sort((a, b) => {
    const ta = new Date(a.timeline || 0).getTime()
    const tb = new Date(b.timeline || 0).getTime()
    return tb - ta
  })

  const dailyMap = new Map()
  for (const trade of trades) {
    const day = dayKeyFromTime(trade.timeline || trade.closeTime || trade.openTime)
    if (!dailyMap.has(day)) dailyMap.set(day, [])
    dailyMap.get(day).push(trade)
  }

  const daily = [...dailyMap.entries()]
    .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
    .map(([date, items]) => {
      const wins = items.filter((x) => toFiniteNumber(x.profit, 0) > 0).length
      const losses = items.filter((x) => toFiniteNumber(x.profit, 0) < 0).length
      const breakeven = items.length - wins - losses
      const netProfit = items.reduce((sum, x) => sum + toFiniteNumber(x.profit, 0), 0)
      return {
        date,
        totalTrades: items.length,
        wins,
        losses,
        breakeven,
        netProfit: Number(netProfit.toFixed(2)),
        trades: items
      }
    })

  return { trades, daily }
}

function tradeIdentity(row, idx = 0) {
  return String(row?.tradeKey || row?.ticketClose || row?.ticketOpen || row?.positionId || row?.orderClose || row?.orderOpen || `trade-${idx}`)
}

function tradeTimeMs(value) {
  if (!value) return 0
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : 0
}

function safePrice(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

function priceDistance(a, b) {
  const x = safePrice(a)
  const y = safePrice(b)
  if (!x || !y) return 0
  return Math.abs(x - y)
}

function estimatePotentialTpProfit(row) {
  const pnl = toFiniteNumber(row?.profit, 0)
  if (pnl <= 0) return 0
  const entry = safePrice(row?.entryPrice)
  const exit = safePrice(row?.exitPrice)
  const tp = safePrice(row?.initialTp || row?.finalTp || row?.tp)
  if (!entry || !exit || !tp) return 0
  const realizedMove = Math.abs(exit - entry)
  const targetMove = Math.abs(tp - entry)
  if (realizedMove <= 0 || targetMove <= 0 || targetMove <= realizedMove) return 0
  return Math.abs(pnl) * (targetMove / realizedMove)
}

function lbeSeverity(scoreChange) {
  const penalty = Math.abs(Number(scoreChange || 0))
  if (penalty >= 100) return 'critical'
  if (penalty >= 80) return 'high'
  if (penalty >= 50) return 'medium'
  return 'low'
}

function makeLbeEvent({ checker, code, behaviorTag, label, scoreChange, evidence, doctorNote, protocol }) {
  return {
    checker,
    code,
    behaviorTag,
    label,
    scoreChange,
    pointsLost: Math.abs(scoreChange),
    severity: lbeSeverity(scoreChange),
    evidence,
    doctorNote,
    protocol
  }
}

function buildCardanoBehaviorMetadata({ userId, tradeId, behaviorTag, scoreChange, newTotalScore, timestamp }) {
  const payload = {
    User_ID: String(userId || 'Fox_Profile'),
    Trade_ID: String(tradeId || ''),
    Behavior_Tag: String(behaviorTag || ''),
    Score_Change: Number(scoreChange || 0),
    New_Total_Score: Number(newTotalScore || 0),
    Timestamp: timestamp || new Date().toISOString()
  }
  return {
    ...payload,
    Metadata_Hash: crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
    Chain: 'cardano',
    Status: 'ready_to_anchor'
  }
}

function buildLuminaBehaviorEngine(rowsRaw, accountRaw = null, userId = 'Fox_Profile') {
  const rows = (Array.isArray(rowsRaw) ? rowsRaw : [])
    .slice()
    .sort(
      (a, b) =>
        tradeTimeMs(a?.openTime || a?.timeline || a?.closeTime || a?.time) -
        tradeTimeMs(b?.openTime || b?.timeline || b?.closeTime || b?.time)
    )
  const account = accountRaw && typeof accountRaw === 'object' ? accountRaw : {}
  const previousVolumes = []
  let previousClosedTrade = null
  let runningScore = 1000
  let totalPenalty = 0
  let totalBonus = 0
  let cleanStreak = 0
  let bestCleanStreak = 0
  const tagCounts = new Map()

  const trades = rows.map((row, idx) => {
    const tradeId = tradeIdentity(row, idx)
    const events = []
    const volume = Math.max(0, toFiniteNumber(row?.volume, 0))
    const priorTen = previousVolumes.slice(-10).filter((n) => n > 0)
    const averageVolume10 = priorTen.length ? priorTen.reduce((sum, n) => sum + n, 0) / priorTen.length : 0
    const pnl = toFiniteNumber(row?.profit, 0)
    const entry = safePrice(row?.entryPrice)
    const initialSl = safePrice(row?.initialSl || row?.sl)
    const finalSl = row?.slRemoved ? null : safePrice(row?.finalSl ?? row?.sl)
    const initialRiskDistance = entry && initialSl ? priceDistance(entry, initialSl) : 0
    const finalRiskDistance = entry && finalSl ? priceDistance(entry, finalSl) : 0
    const openMs = tradeTimeMs(row?.openTime || row?.timeline || row?.time)
    const closeMs = tradeTimeMs(row?.closeTime || row?.timeline || row?.time)
    const previousLossCooldownSeconds =
      previousClosedTrade?.profit < 0 && openMs > 0 && previousClosedTrade.closeMs > 0
        ? Number(((openMs - previousClosedTrade.closeMs) / 1000).toFixed(0))
        : null

    if (averageVolume10 > 0 && volume > averageVolume10 * 2) {
      events.push(
        makeLbeEvent({
          checker: 'CONSISTENCY',
          code: 'OVER_LEVERAGING',
          behaviorTag: 'Over_Leveraging_Detected',
          label: 'Over-leveraging',
          scoreChange: -50,
          evidence: `Volume ${volume.toFixed(2)} > avg10 ${averageVolume10.toFixed(2)} x2`,
          doctorNote: 'Khoi luong tang dot bien so voi 10 lenh truoc. Giam size ve muc trung binh truoc khi tiep tuc.',
          protocol: ['Reset lot size ve baseline', 'Chi tang volume sau 5 lenh ky luat lien tiep']
        })
      )
    }

    if ((initialSl && !finalSl) || row?.slRemoved) {
      events.push(
        makeLbeEvent({
          checker: 'STOPLOSS',
          code: 'LOSS_AVERSION_SL_REMOVED',
          behaviorTag: 'Loss_Aversion_Detected',
          label: 'Loss aversion / SL removed',
          scoreChange: -100,
          evidence: 'Initial SL existed but final SL is missing.',
          doctorNote: 'Day la loi nang: xoa SL bien mot lenh co ke hoach thanh lenh giong lo.',
          protocol: ['Dung giao dich 60 phut', 'Lenh tiep theo risk <= 0.5%', 'Bat buoc dat SL truoc khi vao lenh']
        })
      )
    } else if (initialRiskDistance > 0 && finalRiskDistance > initialRiskDistance * 1.05) {
      events.push(
        makeLbeEvent({
          checker: 'STOPLOSS',
          code: 'LOSS_AVERSION_SL_WIDENED',
          behaviorTag: 'Loss_Aversion_Detected',
          label: 'Loss aversion / SL widened',
          scoreChange: -100,
          evidence: `Final risk distance ${finalRiskDistance.toFixed(5)} > initial ${initialRiskDistance.toFixed(5)}`,
          doctorNote: 'Ban da noi SL ra xa hon ke hoach ban dau. He thong xem day la dau hieu so cat lo.',
          protocol: ['Khong noi SL sau khi vao lenh', 'Neu setup sai, dong lenh thay vi mo rong rui ro']
        })
      )
    } else if (!initialSl && !finalSl) {
      events.push(
        makeLbeEvent({
          checker: 'STOPLOSS',
          code: 'NO_STOPLOSS',
          behaviorTag: 'No_Stoploss_Detected',
          label: 'No stoploss',
          scoreChange: -100,
          evidence: 'No initial or final SL was detected for this trade.',
          doctorNote: 'Lenh khong co SL khong du tieu chuan ky luat cua Lumina.',
          protocol: ['No SL => No Trade', 'Dung giao dich neu 2 lenh lien tiep thieu SL']
        })
      )
    }

    if (previousClosedTrade?.profit < 0 && openMs > 0 && previousClosedTrade.closeMs > 0) {
      const diffSeconds = (openMs - previousClosedTrade.closeMs) / 1000
      if (diffSeconds >= 0 && diffSeconds < 300) {
        events.push(
          makeLbeEvent({
            checker: 'REVENGE',
            code: 'REVENGE_TRADING',
            behaviorTag: 'Revenge_Trading_Detected',
            label: 'Revenge trading',
            scoreChange: -80,
            evidence: `Opened ${Math.round(diffSeconds)} seconds after a losing trade.`,
            doctorNote: 'Lenh mo qua nhanh sau lenh thua. Day la dau hieu cay cu go gac.',
            protocol: ['Cool-down 20 phut sau lenh thua', 'Viet 1 dong ly do vao lenh truoc khi bam Buy/Sell']
          })
        )
      }
    }

    const potentialTpProfit = estimatePotentialTpProfit(row)
    if (pnl > 0 && potentialTpProfit > 0 && pnl < potentialTpProfit * 0.4 && String(row?.closeReason || '') !== 'TP') {
      events.push(
        makeLbeEvent({
          checker: 'PROFIT_EFFICIENCY',
          code: 'EARLY_EXIT',
          behaviorTag: 'Early_Exit_Detected',
          label: 'Early exit',
          scoreChange: -30,
          evidence: `Realized ${pnl.toFixed(2)} < 40% of estimated target ${potentialTpProfit.toFixed(2)}.`,
          doctorNote: 'Lenh co lai nhung chot qua som so voi TP ban dau. Can tach loi nhuan thuc te khoi cam giac so mat lai.',
          protocol: ['Chia 2 phan chot loi', 'Doi nen xac nhan dao chieu truoc khi dong som']
        })
      )
    }

    const scoreChange = events.reduce((sum, event) => sum + Number(event.scoreChange || 0), 0)
    const penalty = Math.abs(scoreChange)
    totalPenalty += penalty
    let bonusAwarded = 0
    if (!events.length) {
      cleanStreak += 1
      bestCleanStreak = Math.max(bestCleanStreak, cleanStreak)
      if (cleanStreak > 0 && cleanStreak % 5 === 0) {
        bonusAwarded = 50
        totalBonus += bonusAwarded
      }
    } else {
      cleanStreak = 0
    }

    runningScore = Math.max(0, Math.min(1200, runningScore + scoreChange + bonusAwarded))
    const primaryEvent = events.slice().sort((a, b) => Math.abs(b.scoreChange) - Math.abs(a.scoreChange))[0] || null
    const behaviorTag = primaryEvent?.behaviorTag || 'Disciplined_Trade'
    tagCounts.set(behaviorTag, (tagCounts.get(behaviorTag) || 0) + 1)
    const timestamp = row?.timeline || row?.closeTime || row?.openTime || new Date().toISOString()

    if (volume > 0) previousVolumes.push(volume)
    previousClosedTrade = {
      profit: pnl,
      closeMs: closeMs || tradeTimeMs(row?.timeline),
      volume
    }

    return {
      tradeId,
      timeline: timestamp,
      symbol: String(row?.symbol || '--'),
      behaviorTag,
      scoreChange,
      bonusAwarded,
      newTotalScore: runningScore,
      cleanTrade: events.length === 0,
      severity: primaryEvent?.severity || 'none',
      primaryEvent,
      events,
      diagnostics: {
        averageVolume10: Number(averageVolume10.toFixed(4)),
        volume: Number(volume.toFixed(4)),
        initialRiskDistance: Number(initialRiskDistance.toFixed(8)),
        finalRiskDistance: Number(finalRiskDistance.toFixed(8)),
        potentialTpProfit: Number(potentialTpProfit.toFixed(2)),
        previousLossCooldownSeconds
      },
      doctorVerdict: primaryEvent?.doctorNote || 'Lenh nay khong vi pham 4 loi hanh vi cot loi. Tiep tuc duy tri nhat ky va ke hoach giao dich.',
      protocol: primaryEvent?.protocol || ['Giu risk co dinh', 'Ghi nhat ky sau khi dong lenh'],
      cardanoMetadata: buildCardanoBehaviorMetadata({
        userId,
        tradeId,
        behaviorTag,
        scoreChange: scoreChange + bonusAwarded,
        newTotalScore: runningScore,
        timestamp
      })
    }
  })

  const topTags = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count, rate: rows.length ? Number(((count / rows.length) * 100).toFixed(2)) : 0 }))
    .sort((a, b) => b.count - a.count)
  const profileScore = Math.max(0, Math.min(1200, 1000 - totalPenalty + totalBonus))
  const riskScore = clampMetric((1000 - profileScore) / 10, 0, 100)
  const criticalCount = trades.reduce((sum, item) => sum + item.events.filter((event) => event.severity === 'critical').length, 0)
  const highCount = trades.reduce((sum, item) => sum + item.events.filter((event) => event.severity === 'high').length, 0)
  const doctorMode = criticalCount ? 'emergency' : highCount ? 'stabilize' : riskScore >= 35 ? 'optimize' : 'maintain'
  const doctorProtocol = {
    mode: doctorMode,
    headline:
      doctorMode === 'emergency'
        ? 'Behavior Doctor: can thiep ngay'
        : doctorMode === 'stabilize'
          ? 'Behavior Doctor: on dinh lai ky luat'
          : doctorMode === 'optimize'
            ? 'Behavior Doctor: toi uu edge'
            : 'Behavior Doctor: duy tri phong do',
    nextActions:
      doctorMode === 'emergency'
        ? ['Tam dung trade 60 phut', 'Kiem tra lai SL cua tat ca lenh', 'Giam risk ve 0.5%']
        : doctorMode === 'stabilize'
          ? ['Bat cooldown sau lenh thua', 'Gioi han so lenh/ngay', 'Khong noi SL']
          : ['Review tag top moi ngay', 'Duy tri chuoi 5 lenh sach de nhan bonus', 'Chi trade setup co RR tot']
  }

  return {
    engine: 'LBE_AUTOMATED_ENGINE',
    formulaVersion: 'lumina_lbe_v3',
    profileScore,
    baseScore: 1000,
    totalPenalty,
    totalBonus,
    riskScore: Number(riskScore.toFixed(2)),
    totalTrades: rows.length,
    cleanTrades: trades.filter((item) => item.cleanTrade).length,
    violationTrades: trades.filter((item) => !item.cleanTrade).length,
    cleanStreak,
    bestCleanStreak,
    topTags,
    checkers: {
      consistency: 'Volume(N) > Average_Volume(previous 10) * 2',
      stoploss: 'Final_SL missing or farther than Initial_SL',
      revenge: 'Previous PnL < 0 and next open < 300 seconds',
      profitEfficiency: 'PnL > 0 and realized PnL < 40% estimated initial TP'
    },
    doctorProtocol,
    trustLayer: {
      chain: 'cardano',
      purpose: 'Proof of Discipline',
      latestMetadata: trades[trades.length - 1]?.cardanoMetadata || null
    },
    accountContext: {
      balance: Number(toFiniteNumber(account?.balance, 0).toFixed(2)),
      equity: Number(toFiniteNumber(account?.equity, 0).toFixed(2))
    },
    trades
  }
}

function buildTradeBehaviorAnalysis(rowsRaw, accountRaw = null) {
  const rows = (Array.isArray(rowsRaw) ? rowsRaw : [])
    .slice()
    .sort(
      (a, b) =>
        new Date(a?.timeline || a?.closeTime || a?.openTime || a?.time || 0).getTime() -
        new Date(b?.timeline || b?.closeTime || b?.openTime || b?.time || 0).getTime()
    )
  const account = accountRaw && typeof accountRaw === 'object' ? accountRaw : {}
  const severityFromScore = (score) => {
    if (score >= 80) return { level: 'critical', label: 'Can thiep ngay' }
    if (score >= 60) return { level: 'high', label: 'Rui ro cao' }
    if (score >= 40) return { level: 'medium', label: 'Can theo doi' }
    return { level: 'low', label: 'On dinh' }
  }
  const makeDiagnosis = ({ code, name, score, evidence, fix, protocol }) => {
    const safeScore = Number(clampMetric(score, 0, 100).toFixed(2))
    const sev = severityFromScore(safeScore)
    return {
      code,
      name,
      score: safeScore,
      severity: sev.level,
      severityLabel: sev.label,
      evidence,
      fix,
      protocol
    }
  }
  const normalizedExpectancyRisk = (expectancyValue) => {
    const ex = toFiniteNumber(expectancyValue, 0)
    if (ex >= 1.5) return 10
    if (ex >= 0.5) return 28
    if (ex >= 0) return 45
    return clampMetric(70 + Math.abs(ex) * 12, 0, 100)
  }
  const REVENGE_WINDOW_MINUTES = 30
  const QUICK_REENTRY_WINDOW_MINUTES = 10
  const OVERTRADE_BASELINE_DEALS_PER_DAY = 5

  let total = 0
  let win = 0
  let loss = 0
  let be = 0
  let totalProfit = 0
  let totalLossAbs = 0
  let maxWin = 0
  let maxLoss = 0
  let currentWinStreak = 0
  let currentLossStreak = 0
  let bestWinStreak = 0
  let worstLossStreak = 0
  const dealsByDay = new Map()
  let tradesWithSL = 0
  let tradesWithTP = 0
  let tradeRRTotal = 0
  let tradeRRCount = 0
  let outsidePlanCount = 0
  let revengeCount = 0
  let quickReentryCount = 0
  let postLossVolumeEscalationCount = 0
  let emotionalOverconfidenceCount = 0
  let emotionalRecoveryRiskCount = 0
  let cumulativePnl = 0
  let equityPeak = 0
  let maxDrawdownAbs = 0
  const volumes = []
  const sessionStats = new Map()
  let previousClosedTrade = null

  for (const row of rows) {
    const p = toFiniteNumber(row?.profit, 0)
    const dayKey = dayKeyFromTime(row?.timeline || row?.closeTime || row?.openTime || row?.time)
    dealsByDay.set(dayKey, (dealsByDay.get(dayKey) || 0) + 1)
    const volume = Math.max(0, toFiniteNumber(row?.volume, 0))
    volumes.push(volume)

    const entryPrice = toFiniteNumber(row?.entryPrice, 0)
    const exitPrice = toFiniteNumber(row?.exitPrice, 0)
    const sl = toFiniteNumber(row?.sl, 0)
    const tp = toFiniteNumber(row?.tp, 0)
    const hasSL = sl > 0
    const hasTP = tp > 0
    if (hasSL) tradesWithSL += 1
    if (hasTP) tradesWithTP += 1

    const risk = Math.abs(entryPrice - sl)
    const reward = Math.abs(tp - entryPrice)
    const rr = risk > 0 && reward > 0 ? reward / risk : 0
    if (rr > 0) {
      tradeRRTotal += rr
      tradeRRCount += 1
    }
    const followsPlan = hasSL && hasTP && rr >= 1
    if (!followsPlan) outsidePlanCount += 1

    const openMs = new Date(row?.openTime || row?.timeline || row?.time || 0).getTime()
    const tradeTimeline = new Date(row?.timeline || row?.closeTime || row?.openTime || row?.time || 0)
    if (!Number.isNaN(tradeTimeline.getTime())) {
      const hour = tradeTimeline.getUTCHours()
      if (!sessionStats.has(hour)) {
        sessionStats.set(hour, { hour, total: 0, losses: 0, wins: 0, pnl: 0 })
      }
      const currentHour = sessionStats.get(hour)
      currentHour.total += 1
      currentHour.pnl += p
      if (p > 0) currentHour.wins += 1
      if (p < 0) currentHour.losses += 1
    }
    if (
      previousClosedTrade &&
      Number.isFinite(openMs) &&
      openMs > 0 &&
      Number.isFinite(previousClosedTrade.closeMs) &&
      previousClosedTrade.closeMs > 0
    ) {
      const diffMinutes = (openMs - previousClosedTrade.closeMs) / 60000
      if (diffMinutes >= 0 && diffMinutes <= QUICK_REENTRY_WINDOW_MINUTES) {
        quickReentryCount += 1
      }
      if (previousClosedTrade.profit < 0 && diffMinutes >= 0 && diffMinutes <= REVENGE_WINDOW_MINUTES) {
        revengeCount += 1
      }
      if (
        previousClosedTrade.profit < 0 &&
        previousClosedTrade.volume > 0 &&
        volume >= previousClosedTrade.volume * 1.25
      ) {
        postLossVolumeEscalationCount += 1
      }
    }

    total += 1
    if (p > 0) {
      win += 1
      totalProfit += p
      maxWin = Math.max(maxWin, p)
      currentWinStreak += 1
      currentLossStreak = 0
      bestWinStreak = Math.max(bestWinStreak, currentWinStreak)
    } else if (p < 0) {
      loss += 1
      totalLossAbs += Math.abs(p)
      maxLoss = Math.min(maxLoss, p)
      currentLossStreak += 1
      currentWinStreak = 0
      worstLossStreak = Math.min(worstLossStreak, -currentLossStreak)
    } else {
      be += 1
      currentWinStreak = 0
      currentLossStreak = 0
    }

    const avgVolume = volumes.length ? volumes.reduce((sum, n) => sum + n, 0) / volumes.length : 0
    if (avgVolume > 0 && volume >= avgVolume * 1.5) {
      if (currentWinStreak >= 2) emotionalOverconfidenceCount += 1
      if (currentLossStreak >= 2) emotionalRecoveryRiskCount += 1
    }

    cumulativePnl += p
    equityPeak = Math.max(equityPeak, cumulativePnl)
    maxDrawdownAbs = Math.max(maxDrawdownAbs, equityPeak - cumulativePnl)

    previousClosedTrade = {
      profit: p,
      closeMs: new Date(row?.closeTime || row?.timeline || row?.time || 0).getTime(),
      volume
    }
  }

  const winRate = total ? (win / total) * 100 : 0
  const lossRate = total ? (loss / total) * 100 : 0
  const avgWin = win ? totalProfit / win : 0
  const avgLoss = loss ? totalLossAbs / loss : 0
  const netProfit = totalProfit - totalLossAbs
  const expectancy = (winRate / 100) * avgWin - (lossRate / 100) * avgLoss
  const profitFactor = totalLossAbs > 0 ? totalProfit / totalLossAbs : 0
  const rr = avgLoss > 0 ? avgWin / avgLoss : 0
  const drawdownPct = equityPeak > 0 ? (maxDrawdownAbs / equityPeak) * 100 : 0

  const dayCounts = [...dealsByDay.values()]
  const avgDealsPerDay = dayCounts.length ? dayCounts.reduce((a, b) => a + b, 0) / dayCounts.length : 0
  const overtradeDays = dayCounts.filter((x) => x >= 8).length
  const overtradeRatio = OVERTRADE_BASELINE_DEALS_PER_DAY > 0 ? avgDealsPerDay / OVERTRADE_BASELINE_DEALS_PER_DAY : 0
  const overtradePercent = clampMetric((overtradeRatio - 1) * 100, 0, 100)

  const longRows = rows.filter((x) => String(x?.side || '').toUpperCase() === 'LONG')
  const shortRows = rows.filter((x) => String(x?.side || '').toUpperCase() === 'SHORT')
  const longWins = longRows.filter((x) => toFiniteNumber(x?.profit, 0) > 0).length
  const shortWins = shortRows.filter((x) => toFiniteNumber(x?.profit, 0) > 0).length
  const longProfit = longRows.reduce((sum, x) => sum + toFiniteNumber(x?.profit, 0), 0)
  const shortProfit = shortRows.reduce((sum, x) => sum + toFiniteNumber(x?.profit, 0), 0)
  const longWinRate = longRows.length ? (longWins / longRows.length) * 100 : 0
  const shortWinRate = shortRows.length ? (shortWins / shortRows.length) * 100 : 0

  const accountBalance = toFiniteNumber(account?.balance, 0)
  const accountEquity = toFiniteNumber(account?.equity, 0)
  const floatingPnl = toFiniteNumber(account?.profit, 0)
  const netPnlPctBalance = accountBalance > 0 ? (netProfit / accountBalance) * 100 : 0
  const floatingPnlPctBalance = accountBalance > 0 ? (floatingPnl / accountBalance) * 100 : 0
  const equityDiff = accountEquity - accountBalance
  const equityDiffPct = accountBalance > 0 ? (equityDiff / accountBalance) * 100 : 0

  const tradesFollowingPlan = Math.max(0, total - outsidePlanCount)
  const fomoRate = total ? (outsidePlanCount / total) * 100 : 0
  const disciplineRate = total ? (tradesFollowingPlan / total) * 100 : 0
  const revengeRate = total ? (revengeCount / total) * 100 : 0
  const quickReentryRate = total ? (quickReentryCount / total) * 100 : 0
  const postLossVolumeEscalationRate = total ? (postLossVolumeEscalationCount / total) * 100 : 0
  const slCoveragePct = total ? (tradesWithSL / total) * 100 : 0
  const tpCoveragePct = total ? (tradesWithTP / total) * 100 : 0
  const avgTradeRR = tradeRRCount > 0 ? tradeRRTotal / tradeRRCount : 0
  const rrQualityPct = clampMetric((avgTradeRR / 2) * 100, 0, 100)
  const riskManagementScore = clampMetric(slCoveragePct * 0.6 + rrQualityPct * 0.4, 0, 100)

  const drawdownRisk = clampMetric(drawdownPct * 1.5, 0, 100)
  const impulseControlRisk = clampMetric(
    revengeRate * 0.45 + quickReentryRate * 0.25 + postLossVolumeEscalationRate * 0.3,
    0,
    100
  )
  const executionDisciplineRisk = clampMetric(
    fomoRate * 0.5 + overtradePercent * 0.25 + (100 - disciplineRate) * 0.25,
    0,
    100
  )
  const capitalProtectionRisk = clampMetric((100 - riskManagementScore) * 0.55 + drawdownRisk * 0.45, 0, 100)
  const sideImbalancePct = total ? (Math.abs(longRows.length - shortRows.length) / total) * 100 : 0
  const directionBiasRisk = clampMetric(sideImbalancePct * 0.4 + Math.abs(longWinRate - shortWinRate) * 0.6, 0, 100)
  const lossDenominator = Math.max(1, loss)
  let highestLossSessionShare = 0
  for (const item of sessionStats.values()) {
    const share = (toFiniteNumber(item?.losses, 0) / lossDenominator) * 100
    highestLossSessionShare = Math.max(highestLossSessionShare, share)
  }
  const sessionDriftRisk = clampMetric(highestLossSessionShare, 0, 100)
  const expectancyRisk = normalizedExpectancyRisk(expectancy)
  const strategyStabilityRisk = clampMetric(
    directionBiasRisk * 0.4 + sessionDriftRisk * 0.3 + expectancyRisk * 0.3,
    0,
    100
  )
  const legacyBehaviorRiskScore = clampMetric(
    impulseControlRisk * 0.3 +
      executionDisciplineRisk * 0.28 +
      capitalProtectionRisk * 0.27 +
      strategyStabilityRisk * 0.15,
    0,
    100
  )
  const lbe = buildLuminaBehaviorEngine(rows, account)
  const lbeRiskScore = clampMetric((1000 - lbe.profileScore) / 10, 0, 100)
  const behaviorRiskScore = clampMetric(legacyBehaviorRiskScore * 0.55 + lbeRiskScore * 0.45, 0, 100)
  const behaviorScore = clampMetric(100 - behaviorRiskScore, 0, 100)

  const behaviorLabel =
    behaviorRiskScore >= 70
      ? 'Rủi ro cao - cần dừng và kiểm soát hành vi'
      : behaviorRiskScore >= 40
        ? 'Rủi ro trung bình - cần tăng kỷ luật'
        : 'Trạng thái giao dịch ổn định'

  const fomoSyndromeScore = clampMetric(fomoRate * 0.7 + quickReentryRate * 0.2 + (100 - disciplineRate) * 0.1, 0, 100)
  const revengeSyndromeScore = clampMetric(revengeRate * 0.6 + postLossVolumeEscalationRate * 0.4, 0, 100)
  const overtradeSyndromeScore = clampMetric(overtradePercent * 0.65 + quickReentryRate * 0.35, 0, 100)
  const riskProtocolSyndromeScore = clampMetric(capitalProtectionRisk * 0.75 + expectancyRisk * 0.25, 0, 100)
  const consistencySyndromeScore = clampMetric(strategyStabilityRisk, 0, 100)

  const diagnoses = [
    makeDiagnosis({
      code: 'FOMO',
      name: 'Hoi chung FOMO',
      score: fomoSyndromeScore,
      evidence: `Ngoai ke hoach ${fomoRate.toFixed(1)}% | vao lai nhanh ${quickReentryRate.toFixed(1)}%`,
      fix: 'Bat buoc xac nhan setup truoc lenh: SL + TP + RR >= 1.5.',
      protocol: ['Dung 2-5 phut truoc khi vao lenh', 'Chi vao lenh khi setup du 3/3 dieu kien']
    }),
    makeDiagnosis({
      code: 'REVENGE',
      name: 'Hoi chung Revenge',
      score: revengeSyndromeScore,
      evidence: `Re-entry sau thua ${revengeRate.toFixed(1)}% | tang volume sau thua ${postLossVolumeEscalationRate.toFixed(1)}%`,
      fix: 'Kich hoat cool-down 20 phut sau moi lenh thua.',
      protocol: ['Khoa nut trade sau chuoi thua', 'Giam 50% khoi luong den khi trang thai on']
    }),
    makeDiagnosis({
      code: 'OVERTRADE',
      name: 'Hoi chung Overtrade',
      score: overtradeSyndromeScore,
      evidence: `Lenh/ngay ${avgDealsPerDay.toFixed(2)} | overtrade ${overtradePercent.toFixed(1)}%`,
      fix: 'Dat tran so lenh/ngay theo profile tai khoan.',
      protocol: ['Vuot tran => khoa giao dich den het ngay', 'Tap trung 1-2 setup co xac suat cao']
    }),
    makeDiagnosis({
      code: 'RISK_PROTOCOL',
      name: 'Benh quan tri rui ro',
      score: riskProtocolSyndromeScore,
      evidence: `SL coverage ${slCoveragePct.toFixed(1)}% | RR TB 1:${avgTradeRR.toFixed(2)} | DD ${drawdownPct.toFixed(1)}%`,
      fix: 'Tat ca lenh phai co SL va RR >= 1.5 truoc khi submit.',
      protocol: ['Risk moi lenh <= 1% balance', 'Dung giao dich khi DD ngay vuot nguong']
    }),
    makeDiagnosis({
      code: 'CONSISTENCY',
      name: 'Benh mat on dinh chien luoc',
      score: consistencySyndromeScore,
      evidence: `Chenhlech Long/Short winrate ${Math.abs(longWinRate - shortWinRate).toFixed(1)}% | session drift ${sessionDriftRisk.toFixed(1)}%`,
      fix: 'Chi trade khung gio co edge duong.',
      protocol: ['Loai bo khung gio am lien tuc', 'Toi uu hoa huong trade co hieu suat tot hon']
    })
  ].sort((a, b) => b.score - a.score)

  const topDiagnosis = diagnoses[0] || null
  const carePhase =
    behaviorRiskScore >= 75 ? 'emergency' : behaviorRiskScore >= 55 ? 'stabilize' : behaviorRiskScore >= 35 ? 'optimize' : 'maintain'
  const phaseLabelMap = {
    emergency: 'Cap cuu hanh vi',
    stabilize: 'On dinh tam ly',
    optimize: 'Toi uu ky luat',
    maintain: 'Duy tri phong do'
  }
  const treatmentPlan = {
    phase: carePhase,
    phaseLabel: phaseLabelMap[carePhase] || 'Theo doi',
    today:
      carePhase === 'emergency'
        ? [
            'Tam dung giao dich 60 phut, reset trang thai tam ly.',
            'Chi mo lai lenh khi setup, SL, TP va RR ro rang.',
            'Risk moi lenh toi da 0.5% trong phien con lai.'
          ]
        : carePhase === 'stabilize'
          ? [
              'Gioi han 3 lenh toi da trong ngay.',
              'Moi lenh phai dat RR >= 1.5 va co SL.',
              'Sau 1 lenh thua bat buoc nghi 20 phut.'
            ]
          : [
              'Duy tri ke hoach truoc lenh.',
              'Tap trung 1 khung gio co hieu suat cao.',
              'Tong ket cuoi ngay: 3 diem tot, 1 diem can sua.'
            ],
    week: [
      'Review 20 lenh gan nhat, danh dau lenh ngoai ke hoach.',
      'Tinh lai muc risk theo drawdown hien tai.',
      'Cap nhat rulebook ca nhan theo cac diagnosis top.'
    ],
    rules: [
      'No SL => No Trade',
      'No RR >= 1.5 => No Trade',
      '2 lenh thua lien tiep => Cool-down bat buoc'
    ]
  }
  const doctorNote = topDiagnosis
    ? `${topDiagnosis.name}: ${topDiagnosis.severityLabel}. Uu tien can thiep theo protocol ngay hom nay.`
    : 'Trang thai hanh vi on dinh. Duy tri ky luat hien tai.'

  return {
    totalDeals: total,
    wins: win,
    losses: loss,
    breakeven: be,
    winRate: Number(winRate.toFixed(2)),
    lossRate: Number(lossRate.toFixed(2)),
    avgWin: Number(avgWin.toFixed(2)),
    avgLoss: Number(avgLoss.toFixed(2)),
    netProfit: Number(netProfit.toFixed(2)),
    expectancy: Number(expectancy.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    rr: Number(rr.toFixed(2)),
    drawdownAbs: Number(maxDrawdownAbs.toFixed(2)),
    drawdownPct: Number(drawdownPct.toFixed(2)),
    bestWin: Number(maxWin.toFixed(2)),
    worstLoss: Number(maxLoss.toFixed(2)),
    bestWinStreak,
    worstLossStreak: Math.abs(worstLossStreak),
    avgDealsPerDay: Number(avgDealsPerDay.toFixed(2)),
    overtradeDays,
    overtradeRatio: Number(overtradeRatio.toFixed(2)),
    overtradePercent: Number(overtradePercent.toFixed(2)),
    fomoCount: outsidePlanCount,
    fomoRate: Number(fomoRate.toFixed(2)),
    disciplineCount: tradesFollowingPlan,
    disciplineRate: Number(disciplineRate.toFixed(2)),
    revengeCount,
    revengeRate: Number(revengeRate.toFixed(2)),
    quickReentryCount,
    quickReentryRate: Number(quickReentryRate.toFixed(2)),
    postLossVolumeEscalationCount,
    postLossVolumeEscalationRate: Number(postLossVolumeEscalationRate.toFixed(2)),
    tradesWithSL,
    tradesWithTP,
    slCoveragePct: Number(slCoveragePct.toFixed(2)),
    tpCoveragePct: Number(tpCoveragePct.toFixed(2)),
    avgTradeRR: Number(avgTradeRR.toFixed(2)),
    riskManagementScore: Number(riskManagementScore.toFixed(2)),
    emotionalOverconfidenceCount,
    emotionalRecoveryRiskCount,
    longCount: longRows.length,
    shortCount: shortRows.length,
    longWins,
    shortWins,
    longWinRate: Number(longWinRate.toFixed(2)),
    shortWinRate: Number(shortWinRate.toFixed(2)),
    longNetProfit: Number(longProfit.toFixed(2)),
    shortNetProfit: Number(shortProfit.toFixed(2)),
    accountBalance: Number(accountBalance.toFixed(2)),
    accountEquity: Number(accountEquity.toFixed(2)),
    floatingPnl: Number(floatingPnl.toFixed(2)),
    netPnlPctBalance: Number(netPnlPctBalance.toFixed(2)),
    floatingPnlPctBalance: Number(floatingPnlPctBalance.toFixed(2)),
    equityDiff: Number(equityDiff.toFixed(2)),
    equityDiffPct: Number(equityDiffPct.toFixed(2)),
    impulseControlRisk: Number(impulseControlRisk.toFixed(2)),
    executionDisciplineRisk: Number(executionDisciplineRisk.toFixed(2)),
    capitalProtectionRisk: Number(capitalProtectionRisk.toFixed(2)),
    strategyStabilityRisk: Number(strategyStabilityRisk.toFixed(2)),
    directionBiasRisk: Number(directionBiasRisk.toFixed(2)),
    sessionDriftRisk: Number(sessionDriftRisk.toFixed(2)),
    expectancyRisk: Number(expectancyRisk.toFixed(2)),
    legacyBehaviorRiskScore: Number(legacyBehaviorRiskScore.toFixed(2)),
    lbeRiskScore: Number(lbeRiskScore.toFixed(2)),
    behaviorRiskScore: Number(behaviorRiskScore.toFixed(2)),
    behaviorScore: Number(behaviorScore.toFixed(2)),
    behaviorLabel,
    lbe,
    behaviorHospital: {
      doctorNote,
      diagnoses,
      treatmentPlan
    },
    formulaVersion: 'lumina_lbe_behavior_system_v3'
  }
}

function parseDateOnlyToUTC(value) {
  if (!value) return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
  }
  const raw = String(value).trim()
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const dt = new Date(Date.UTC(y, mo, d))
  if (Number.isNaN(dt.getTime())) return null
  return dt
}

function dateKeyUTC(value) {
  const dt =
    value instanceof Date
      ? value
      : typeof value === 'string'
        ? parseDateOnlyToUTC(value)
        : null
  if (!dt || Number.isNaN(dt.getTime())) return ''
  return dt.toISOString().slice(0, 10)
}

function addDaysUTC(dateKey, days) {
  const base = parseDateOnlyToUTC(dateKey)
  if (!base) return ''
  const next = new Date(base.getTime())
  next.setUTCDate(next.getUTCDate() + Number(days || 0))
  return dateKeyUTC(next)
}

function getWeekRangeUTC(anchorDateKey) {
  const base = parseDateOnlyToUTC(anchorDateKey) || parseDateOnlyToUTC(dateKeyUTC(new Date()))
  const day = (base.getUTCDay() + 6) % 7
  const start = new Date(base.getTime())
  start.setUTCDate(start.getUTCDate() - day)
  const end = new Date(start.getTime())
  end.setUTCDate(end.getUTCDate() + 6)
  return {
    startDate: dateKeyUTC(start),
    endDate: dateKeyUTC(end)
  }
}

function getMonthRangeUTC(anchorDateKey) {
  const base = parseDateOnlyToUTC(anchorDateKey) || parseDateOnlyToUTC(dateKeyUTC(new Date()))
  const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1))
  const end = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0))
  return {
    startDate: dateKeyUTC(start),
    endDate: dateKeyUTC(end),
    monthKey: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`
  }
}

function enumerateDateKeysUTC(startDateKey, endDateKey) {
  const out = []
  let cursor = startDateKey
  let safety = 0
  while (cursor && cursor <= endDateKey && safety < 1000) {
    out.push(cursor)
    cursor = addDaysUTC(cursor, 1)
    safety += 1
  }
  return out
}

function viWeekdayShort(dateKey) {
  const dt = parseDateOnlyToUTC(dateKey)
  if (!dt) return '--'
  const map = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  return map[dt.getUTCDay()] || '--'
}

function toDateLabelVi(dateKey) {
  const dt = parseDateOnlyToUTC(dateKey)
  if (!dt) return dateKey || '--'
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = dt.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function summarizeChecklistRows(rowsRaw) {
  const rows = Array.isArray(rowsRaw) ? rowsRaw : []
  if (!rows.length) {
    return {
      checklistCount: 0,
      avgTotalScore: 0,
      avgEmotionScore: 0,
      avgPlanScore: 0,
      avgRR: 0,
      canTradeRate: 0,
      blockedCount: 0,
      lastChecklistAt: null
    }
  }
  const sum = {
    total: 0,
    emotion: 0,
    plan: 0,
    rr: 0,
    canTrade: 0,
    blocked: 0
  }
  let lastChecklistAt = null
  for (const row of rows) {
    const totalScore = toFiniteNumber(row?.total_score, 0)
    const emotion = toFiniteNumber(row?.emotion_score, 0)
    const plan = toFiniteNumber(row?.plan_score, 0)
    const rr = toFiniteNumber(row?.rr_ratio, 0)
    const canTrade = Boolean(row?.can_trade)
    sum.total += totalScore
    sum.emotion += emotion
    sum.plan += plan
    sum.rr += rr
    if (canTrade) sum.canTrade += 1
    if (!canTrade) sum.blocked += 1
    if (row?.created_at && (!lastChecklistAt || new Date(row.created_at) > new Date(lastChecklistAt))) {
      lastChecklistAt = row.created_at
    }
  }
  const count = rows.length
  return {
    checklistCount: count,
    avgTotalScore: Number((sum.total / count).toFixed(2)),
    avgEmotionScore: Number((sum.emotion / count).toFixed(2)),
    avgPlanScore: Number((sum.plan / count).toFixed(2)),
    avgRR: Number((sum.rr / count).toFixed(2)),
    canTradeRate: Number(((sum.canTrade / count) * 100).toFixed(2)),
    blockedCount: sum.blocked,
    lastChecklistAt
  }
}

function buildPerformanceHistoryPayload({ tradeBook, checklistRows, view, anchorDate }) {
  const mode = ['daily', 'weekly', 'monthly'].includes(String(view || '').toLowerCase())
    ? String(view).toLowerCase()
    : 'daily'
  const todayKey = dateKeyUTC(new Date())
  const anchorDateKey = dateKeyUTC(anchorDate) || todayKey
  const safeBook = tradeBook && typeof tradeBook === 'object' ? tradeBook : { trades: [], daily: [] }
  const daily = Array.isArray(safeBook.daily) ? safeBook.daily : []
  const trades = Array.isArray(safeBook.trades) ? safeBook.trades : []
  const dailyMap = new Map(daily.map((row) => [String(row?.date || ''), row]))

  let startDate = anchorDateKey
  let endDate = anchorDateKey
  let periodLabel = toDateLabelVi(anchorDateKey)

  if (mode === 'weekly') {
    const range = getWeekRangeUTC(anchorDateKey)
    startDate = range.startDate
    endDate = range.endDate
    periodLabel = `${toDateLabelVi(startDate)} - ${toDateLabelVi(endDate)}`
  } else if (mode === 'monthly') {
    const range = getMonthRangeUTC(anchorDateKey)
    startDate = range.startDate
    endDate = range.endDate
    const dt = parseDateOnlyToUTC(startDate)
    periodLabel = dt ? `Thang ${dt.getUTCMonth() + 1}/${dt.getUTCFullYear()}` : startDate
  }

  const rangeKeys = enumerateDateKeysUTC(startDate, endDate)
  const dailyRows = rangeKeys.map((key) => ({
    date: key,
    totalTrades: toFiniteNumber(dailyMap.get(key)?.totalTrades, 0),
    wins: toFiniteNumber(dailyMap.get(key)?.wins, 0),
    losses: toFiniteNumber(dailyMap.get(key)?.losses, 0),
    breakeven: toFiniteNumber(dailyMap.get(key)?.breakeven, 0),
    netProfit: Number(toFiniteNumber(dailyMap.get(key)?.netProfit, 0).toFixed(2))
  }))

  const summary = dailyRows.reduce(
    (acc, row) => {
      acc.totalTrades += row.totalTrades
      acc.wins += row.wins
      acc.losses += row.losses
      acc.breakeven += row.breakeven
      acc.netIncome += row.netProfit
      return acc
    },
    { totalTrades: 0, wins: 0, losses: 0, breakeven: 0, netIncome: 0 }
  )
  summary.netIncome = Number(summary.netIncome.toFixed(2))
  summary.winRate =
    summary.totalTrades > 0 ? Number(((summary.wins / summary.totalTrades) * 100).toFixed(2)) : 0

  const checklistInRange = (Array.isArray(checklistRows) ? checklistRows : []).filter((row) => {
    const key = dateKeyUTC(row?.trade_date)
    return key && key >= startDate && key <= endDate
  })
  const behavior = summarizeChecklistRows(checklistInRange)

  let bars = []
  if (mode === 'daily') {
    const start = addDaysUTC(anchorDateKey, -6)
    const keys = enumerateDateKeysUTC(start, anchorDateKey)
    bars = keys.map((key) => {
      const row = dailyMap.get(key)
      const amount = Number(toFiniteNumber(row?.netProfit, 0).toFixed(2))
      return {
        key,
        label: `${viWeekdayShort(key)} ${Number(String(key).slice(8, 10))}`,
        amount,
        totalTrades: toFiniteNumber(row?.totalTrades, 0)
      }
    })
  } else if (mode === 'weekly') {
    bars = rangeKeys.map((key) => {
      const row = dailyMap.get(key)
      const amount = Number(toFiniteNumber(row?.netProfit, 0).toFixed(2))
      return {
        key,
        label: viWeekdayShort(key),
        amount,
        totalTrades: toFiniteNumber(row?.totalTrades, 0)
      }
    })
  } else {
    bars = rangeKeys.map((key) => {
      const row = dailyMap.get(key)
      const amount = Number(toFiniteNumber(row?.netProfit, 0).toFixed(2))
      return {
        key,
        label: String(Number(String(key).slice(8, 10))),
        amount,
        totalTrades: toFiniteNumber(row?.totalTrades, 0)
      }
    })
  }

  let entries = []
  if (mode === 'daily') {
    entries = trades
      .filter((trade) => dayKeyFromTime(trade?.timeline || trade?.closeTime || trade?.openTime) === anchorDateKey)
      .sort((a, b) => new Date(b.timeline || b.closeTime || b.openTime || 0) - new Date(a.timeline || a.closeTime || a.openTime || 0))
      .slice(0, 200)
      .map((trade) => ({
        kind: 'trade',
        id: trade.tradeKey || `${trade.ticketOpen || ''}-${trade.ticketClose || ''}`,
        date: dateKeyUTC(trade.timeline || trade.closeTime || trade.openTime),
        time: trade.timeline ? new Date(trade.timeline).toLocaleTimeString('vi-VN', { hour12: false }) : '--:--',
        symbol: trade.symbol || '--',
        side: trade.side || '--',
        pnl: Number(toFiniteNumber(trade.profit, 0).toFixed(2)),
        closeReason: trade.closeReason || 'OTHER',
        tp: trade.tp ?? null,
        sl: trade.sl ?? null,
        entryPrice: trade.entryPrice ?? null,
        exitPrice: trade.exitPrice ?? null
      }))
  } else {
    entries = [...dailyRows]
      .filter((row) => row.totalTrades > 0 || Math.abs(row.netProfit) > 0)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .map((row) => ({
        kind: 'day',
        date: row.date,
        label: toDateLabelVi(row.date),
        totalTrades: row.totalTrades,
        wins: row.wins,
        losses: row.losses,
        breakeven: row.breakeven,
        netIncome: row.netProfit
      }))
  }

  return {
    view: mode,
    anchorDate: anchorDateKey,
    range: {
      startDate,
      endDate,
      label: periodLabel
    },
    summary,
    bars,
    entries,
    behavior
  }
}

function resolveReportMonth(monthInput, defaultBackMonths = 1) {
  const raw = String(monthInput || '').trim()
  const m = raw.match(/^(\d{4})-(\d{2})$/)
  let year
  let monthIndex
  if (m) {
    year = Number(m[1])
    monthIndex = Number(m[2]) - 1
  } else {
    const now = new Date()
    const firstOfCurrent = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    firstOfCurrent.setUTCMonth(firstOfCurrent.getUTCMonth() - Math.max(0, Number(defaultBackMonths || 0)))
    year = firstOfCurrent.getUTCFullYear()
    monthIndex = firstOfCurrent.getUTCMonth()
  }
  const start = new Date(Date.UTC(year, monthIndex, 1))
  const end = new Date(Date.UTC(year, monthIndex + 1, 0))
  const monthKey = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`
  return {
    monthKey,
    reportMonthDate: dateKeyUTC(start),
    startDate: dateKeyUTC(start),
    endDate: dateKeyUTC(end),
    label: `Thang ${start.getUTCMonth() + 1}/${start.getUTCFullYear()}`
  }
}

async function getUserTradeSnapshot(userId) {
  const cacheRes = await pool.query(
    `SELECT data_json, updated_at
     FROM user_mt5_data_cache
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  )
  const row = cacheRes.rows[0]
  if (!row) {
    return {
      hasData: false,
      updatedAt: null,
      snapshot: {},
      tradeBook: { trades: [], daily: [] },
      analysis: buildTradeBehaviorAnalysis([], {})
    }
  }
  const snapshot = row.data_json || {}
  const tradeBook = buildTradeBook(snapshot)
  const analysis = buildTradeBehaviorAnalysis(tradeBook.trades, snapshot.account || {})
  return {
    hasData: true,
    updatedAt: row.updated_at,
    snapshot,
    tradeBook,
    analysis
  }
}

function defaultNftImageByTier(tierKey) {
  const tier = normalizeRankTier(tierKey, 'bronze')
  const base = process.env.NFT_IMAGE_BASE_URL || 'https://images.luminafox.app/nft'
  return `${base}/${tier}.png`
}

function normalizeNftProfileRow(row, fallbackTier = 'bronze') {
  if (!row) {
    return {
      isActive: false,
      nftName: '',
      nftImageUrl: defaultNftImageByTier(fallbackTier),
      walletAddress: '',
      walletMasked: '--',
      chain: 'cardano',
      contractAddress: process.env.NFT_CONTRACT_ADDRESS || 'addr1q9...5k2m7v',
      tokenId: '',
      rarity: 'standard',
      metadata: {},
      mintedTxHash: '',
      mintedAt: null
    }
  }
  const walletAddress = normalizeWalletAddress(row.wallet_address)
  const walletMasked =
    walletAddress.length > 12 ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : walletAddress || '--'
  return {
    isActive: row.is_active === true,
    nftName: String(row.nft_name || ''),
    nftImageUrl: String(row.nft_image_url || defaultNftImageByTier(fallbackTier)),
    walletAddress,
    walletMasked,
    chain: String(row.chain || 'cardano'),
    contractAddress: String(row.contract_address || process.env.NFT_CONTRACT_ADDRESS || 'addr1q9...5k2m7v'),
    tokenId: String(row.token_id || ''),
    rarity: String(row.rarity || 'standard'),
    metadata: row.metadata_json && typeof row.metadata_json === 'object' ? row.metadata_json : {},
    mintedTxHash: String(row.minted_tx_hash || ''),
    mintedAt: row.minted_at || null
  }
}

async function getChecklistSummaryForUser(userId, days = 30) {
  const safeDays = Math.max(1, Math.min(365, Number(days || 30)))
  const endDate = dateKeyUTC(new Date())
  const startDate = addDaysUTC(endDate, -(safeDays - 1))
  const rowsRes = await pool.query(
    `SELECT total_score, emotion_score, plan_score, rr_ratio, can_trade, created_at, proof_hash, cardano_tx_hash
     FROM user_trade_checklists
     WHERE user_id = $1
       AND trade_date BETWEEN $2::date AND $3::date
     ORDER BY created_at DESC`,
    [userId, startDate, endDate]
  )
  const summary = summarizeChecklistRows(rowsRes.rows)
  const totalAllRes = await pool.query(
    `SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE can_trade)::int AS verified,
      MAX(created_at) AS latest_at
     FROM user_trade_checklists
     WHERE user_id = $1`,
    [userId]
  )
  const latestRes = await pool.query(
    `SELECT proof_hash, cardano_tx_hash, cardano_block, cardano_time, created_at
     FROM user_trade_checklists
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  )
  const aggregate = totalAllRes.rows[0] || { total: 0, verified: 0, latest_at: null }
  const latest = latestRes.rows[0] || null
  const total = Number(aggregate.total || 0)
  const verified = Number(aggregate.verified || 0)
  return {
    ...summary,
    totalAll: total,
    verifiedAll: verified,
    unverifiedAll: Math.max(0, total - verified),
    verifyRatio: total > 0 ? Number(((verified / total) * 100).toFixed(2)) : 0,
    latestChecklistAt: aggregate.latest_at || null,
    latestProofHash: String(latest?.proof_hash || ''),
    latestTxHash: String(latest?.cardano_tx_hash || ''),
    latestBlock: String(latest?.cardano_block || ''),
    latestTime: String(latest?.cardano_time || '')
  }
}

async function buildUserRankNftProfile({ userId, analysis = null, days = 30 }) {
  const userRes = await pool.query(
    `SELECT id, name, email, rank_points, rank_tier, level, xp
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  )
  const user = userRes.rows[0]
  if (!user) throw new Error('User not found')

  const nftRes = await pool.query(
    `SELECT user_id, nft_name, nft_image_url, wallet_address, chain, contract_address, token_id, rarity,
            metadata_json, minted_tx_hash, minted_at, is_active, updated_at
     FROM user_nft_profiles
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  )
  const checklistSummary = await getChecklistSummaryForUser(userId, days)
  const snapshot = analysis
    ? { analysis }
    : await getUserTradeSnapshot(userId)
  const metric = snapshot.analysis || buildTradeBehaviorAnalysis([], {})
  const rankProfile = buildRankPointsFromMetrics({
    analysis: metric,
    checklistSummary,
    storedPoints: Number(user.rank_points || 0)
  })
  const normalizedTier = normalizeRankTier(user.rank_tier, rankProfile.tier.key)
  if (normalizedTier !== rankProfile.tier.key) {
    await pool.query(`UPDATE users SET rank_tier = $1, updated_at = NOW() WHERE id = $2`, [rankProfile.tier.key, userId])
  }

  const nft = normalizeNftProfileRow(nftRes.rows[0] || null, rankProfile.tier.key)
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      level: Number(user.level || 1),
      xp: Number(user.xp || 0)
    },
    rank: {
      basePoints: rankProfile.basePoints,
      bonusPoints: rankProfile.bonusPoints,
      totalPoints: rankProfile.totalPoints,
      tier: rankProfile.tier.key,
      tierLabelVi: rankProfile.tier.labelVi,
      tierLabelEn: rankProfile.tier.labelEn,
      nextTier: rankProfile.tier.nextKey,
      nextTierLabelVi: rankProfile.tier.nextLabelVi,
      nextTierLabelEn: rankProfile.tier.nextLabelEn,
      progressPct: rankProfile.tier.progressPct,
      pointsToNext: rankProfile.tier.pointsToNext,
      rules: {
        behaviorScoreWeight: 6,
        disciplineWeight: 3,
        winRateWeight: 2.4,
        checklistWeight: 2
      }
    },
    nft,
    checklist: {
      count: checklistSummary.checklistCount,
      avgBehaviorScore: checklistSummary.avgBehaviorScore,
      avgEmotionScore: checklistSummary.avgEmotionScore,
      avgPlanScore: checklistSummary.avgPlanScore,
      avgRR: checklistSummary.avgRR,
      canTradeRate: checklistSummary.canTradeRate,
      blockedCount: checklistSummary.blockedCount,
      lastChecklistAt: checklistSummary.lastChecklistAt
    },
    blockchain: {
      total: checklistSummary.totalAll,
      verified: checklistSummary.verifiedAll,
      unverified: checklistSummary.unverifiedAll,
      verifyRatio: checklistSummary.verifyRatio,
      latestChecklistAt: checklistSummary.latestChecklistAt,
      latestProofHash: checklistSummary.latestProofHash,
      latestTxHash: checklistSummary.latestTxHash,
      latestBlock: checklistSummary.latestBlock,
      latestTime: checklistSummary.latestTime
    }
  }
}

async function buildLeaderboardPayload({ days = 30, limit = 50 }) {
  const safeDays = Math.max(1, Math.min(365, Number(days || 30)))
  const safeLimit = Math.max(5, Math.min(200, Number(limit || 50)))
  const usersRes = await pool.query(
    `SELECT id, name, email, role, status, level, xp, rank_points, rank_tier, created_at
     FROM users
     WHERE role = 'user'
     ORDER BY created_at ASC`
  )
  const users = usersRes.rows
  if (!users.length) return { rows: [], totalUsers: 0, days: safeDays }
  const userIds = users.map((row) => row.id)
  const endDate = dateKeyUTC(new Date())
  const startDate = addDaysUTC(endDate, -(safeDays - 1))

  const [cacheRes, checklistRes, nftRes] = await Promise.all([
    pool.query(`SELECT user_id, data_json FROM user_mt5_data_cache WHERE user_id = ANY($1::uuid[])`, [userIds]),
    pool.query(
      `SELECT
        user_id,
        COUNT(*) AS checklist_count,
        AVG(total_score) AS avg_total_score,
        AVG(emotion_score) AS avg_emotion_score,
        AVG(plan_score) AS avg_plan_score,
        AVG(rr_ratio) AS avg_rr,
        AVG(CASE WHEN can_trade THEN 1 ELSE 0 END) AS can_trade_ratio,
        COUNT(*) FILTER (WHERE NOT can_trade) AS blocked_count
       FROM user_trade_checklists
       WHERE user_id = ANY($1::uuid[])
         AND trade_date BETWEEN $2::date AND $3::date
       GROUP BY user_id`,
      [userIds, startDate, endDate]
    ),
    pool.query(
      `SELECT user_id, nft_name, nft_image_url, rarity, token_id, is_active
       FROM user_nft_profiles
       WHERE user_id = ANY($1::uuid[])`,
      [userIds]
    )
  ])

  const cacheMap = new Map(cacheRes.rows.map((row) => [String(row.user_id), row.data_json || {}]))
  const checklistMap = new Map(checklistRes.rows.map((row) => [String(row.user_id), row]))
  const nftMap = new Map(nftRes.rows.map((row) => [String(row.user_id), row]))

  const scored = users.map((user) => {
    const snapshot = cacheMap.get(String(user.id)) || {}
    const tradeBook = buildTradeBook(snapshot)
    const analysis = buildTradeBehaviorAnalysis(tradeBook.trades, snapshot.account || {})
    const checklistRaw = checklistMap.get(String(user.id))
    const checklistSummary = {
      checklistCount: Number(checklistRaw?.checklist_count || 0),
      avgBehaviorScore: Number(toFiniteNumber(checklistRaw?.avg_total_score, analysis.behaviorScore).toFixed(2)),
      avgEmotionScore: Number(toFiniteNumber(checklistRaw?.avg_emotion_score, 0).toFixed(2)),
      avgPlanScore: Number(toFiniteNumber(checklistRaw?.avg_plan_score, 0).toFixed(2)),
      avgRR: Number(toFiniteNumber(checklistRaw?.avg_rr, 0).toFixed(2)),
      canTradeRate: Number((toFiniteNumber(checklistRaw?.can_trade_ratio, 0) * 100).toFixed(2)),
      blockedCount: Number(checklistRaw?.blocked_count || 0)
    }
    const rankProfile = buildRankPointsFromMetrics({
      analysis,
      checklistSummary,
      storedPoints: Number(user.rank_points || 0)
    })
    const nft = normalizeNftProfileRow(nftMap.get(String(user.id)) || null, rankProfile.tier.key)
    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      level: Number(user.level || 1),
      xp: Number(user.xp || 0),
      rankPoints: rankProfile.totalPoints,
      rankTier: rankProfile.tier.key,
      rankTierLabelVi: rankProfile.tier.labelVi,
      rankTierLabelEn: rankProfile.tier.labelEn,
      behaviorScore: Number(toFiniteNumber(analysis.behaviorScore, 0).toFixed(2)),
      winRate: Number(toFiniteNumber(analysis.winRate, 0).toFixed(2)),
      profitFactor: Number(toFiniteNumber(analysis.profitFactor, 0).toFixed(2)),
      checklistCount: checklistSummary.checklistCount,
      canTradeRate: checklistSummary.canTradeRate,
      nftActive: nft.isActive,
      nftName: nft.nftName,
      nftImageUrl: nft.nftImageUrl,
      nftRarity: nft.rarity,
      tokenId: nft.tokenId
    }
  })

  scored.sort((a, b) => b.rankPoints - a.rankPoints)
  const totalUsers = scored.length
  const rows = scored.map((row, index) => ({
    ...row,
    position: index + 1,
    percentile: Math.max(1, Math.round(((index + 1) / totalUsers) * 100))
  }))

  return {
    days: safeDays,
    totalUsers,
    rows: rows.slice(0, safeLimit)
  }
}

async function upsertMonthlyReportLog({
  userId,
  monthInfo,
  summary,
  behavior,
  emailTo,
  status,
  messageId = '',
  errorText = ''
}) {
  await pool.query(
    `INSERT INTO user_monthly_report_logs
      (user_id, report_month, period_start, period_end, net_profit, total_trades, win_rate,
       avg_behavior_score, mood_alert_count, email_to, status, message_id, error_text, sent_at, created_at)
     VALUES
      ($1, $2::date, $3::date, $4::date, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
     ON CONFLICT (user_id, report_month)
     DO UPDATE SET
       period_start = EXCLUDED.period_start,
       period_end = EXCLUDED.period_end,
       net_profit = EXCLUDED.net_profit,
       total_trades = EXCLUDED.total_trades,
       win_rate = EXCLUDED.win_rate,
       avg_behavior_score = EXCLUDED.avg_behavior_score,
       mood_alert_count = EXCLUDED.mood_alert_count,
       email_to = EXCLUDED.email_to,
       status = EXCLUDED.status,
       message_id = EXCLUDED.message_id,
       error_text = EXCLUDED.error_text,
       sent_at = NOW()`,
    [
      userId,
      monthInfo.reportMonthDate,
      monthInfo.startDate,
      monthInfo.endDate,
      Number(summary.netIncome || 0),
      Number(summary.totalTrades || 0),
      Number(summary.winRate || 0),
      Number(behavior.avgTotalScore || 0),
      Number(behavior.blockedCount || 0),
      String(emailTo || ''),
      String(status || 'sent'),
      String(messageId || ''),
      String(errorText || '').slice(0, 1000)
    ]
  )
}

function buildMonthlyReportEmailText({ userName, monthInfo, summary, behavior }) {
  const net = Number(summary.netIncome || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  const winRate = Number(summary.winRate || 0).toFixed(2)
  const avgScore = Number(behavior.avgTotalScore || 0).toFixed(2)
  const canTradeRate = Number(behavior.canTradeRate || 0).toFixed(2)
  return [
    `Xin chao ${userName || 'Trader'},`,
    '',
    `Bao cao thang ${monthInfo.label}:`,
    `- Tong thu nhap rong: ${net} USD`,
    `- Tong so lenh: ${summary.totalTrades || 0}`,
    `- Win rate: ${winRate}%`,
    `- Diem hanh vi trung binh: ${avgScore}/100`,
    `- Ky luat ke hoach truoc lenh: ${canTradeRate}%`,
    `- So lan bi canh bao tam ly/rui ro: ${behavior.blockedCount || 0}`,
    '',
    'Khuyen nghi:',
    '- Neu diem hanh vi < 60, nen giam khoi luong va tan suat vao lenh.',
    '- Uu tien tuan thu setup va quan tri rui ro truoc khi vao lenh.',
    '',
    'LuminaFox Behavioral Intelligence'
  ].join('\n')
}

async function sendMonthlyReportForUser({ userId, monthInput = '', force = false, requestedBy = 'user' }) {
  if (!mailerEnabled || !transporter) {
    throw new Error('Email service is not configured. Please set SMTP_* in .env.')
  }

  const userRes = await pool.query(
    `SELECT id, name, email, status, email_verified
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  )
  const user = userRes.rows[0]
  if (!user) throw new Error('User not found')
  if (user.status !== 'active') throw new Error('User is inactive')
  if (!user.email_verified) throw new Error('User email is not verified')

  const monthInfo = resolveReportMonth(monthInput, 1)
  const existingRes = await pool.query(
    `SELECT status
     FROM user_monthly_report_logs
     WHERE user_id = $1 AND report_month = $2::date
     LIMIT 1`,
    [userId, monthInfo.reportMonthDate]
  )
  if (!force && existingRes.rows[0]?.status === 'sent') {
    return {
      skipped: true,
      month: monthInfo.monthKey
    }
  }

  const cache = await getUserTradeSnapshot(userId)
  const historyPayload = buildPerformanceHistoryPayload({
    tradeBook: cache.tradeBook,
    checklistRows: [],
    view: 'monthly',
    anchorDate: monthInfo.startDate
  })
  const checklistRes = await pool.query(
    `SELECT total_score, emotion_score, plan_score, rr_ratio, can_trade
     FROM user_trade_checklists
     WHERE user_id = $1
       AND trade_date BETWEEN $2::date AND $3::date
     ORDER BY created_at DESC`,
    [userId, monthInfo.startDate, monthInfo.endDate]
  )
  const behavior = summarizeChecklistRows(checklistRes.rows)

  const subject = `[LuminaFox] Bao cao giao dich ${monthInfo.label}`
  const text = buildMonthlyReportEmailText({
    userName: user.name,
    monthInfo,
    summary: historyPayload.summary,
    behavior
  })

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: user.email,
      subject,
      text
    })
    await upsertMonthlyReportLog({
      userId,
      monthInfo,
      summary: historyPayload.summary,
      behavior,
      emailTo: user.email,
      status: 'sent',
      messageId: info?.messageId || '',
      errorText: ''
    })
    return {
      ok: true,
      month: monthInfo.monthKey,
      summary: historyPayload.summary,
      behavior
    }
  } catch (error) {
    await upsertMonthlyReportLog({
      userId,
      monthInfo,
      summary: historyPayload.summary,
      behavior,
      emailTo: user.email,
      status: 'failed',
      messageId: '',
      errorText: error.message || 'Send email failed'
    })
    throw error
  }
}

async function runAutoMonthlyReportJob() {
  if (!mailerEnabled || !transporter) return
  const now = new Date()
  if (now.getUTCDate() > 3) return
  const monthInfo = resolveReportMonth('', 1)
  const usersRes = await pool.query(
    `SELECT id
     FROM users
     WHERE status = 'active'
       AND email_verified = true
     ORDER BY created_at ASC
     LIMIT $1`,
    [Math.max(1, MONTHLY_REPORT_AUTO_MAX_USERS)]
  )
  for (const row of usersRes.rows) {
    try {
      await sendMonthlyReportForUser({
        userId: row.id,
        monthInput: monthInfo.monthKey,
        force: false,
        requestedBy: 'auto'
      })
    } catch (error) {
      console.error('[monthly-report][auto]', row.id, error.message || error)
    }
  }
}

function sanitizeMt5Connection(row) {
  if (!row) return null
  return {
    login: maskSecret(row.mt5_login),
    server: row.mt5_server,
    terminalPath: row.mt5_terminal_path || '',
    updatedAt: row.updated_at,
    isActive: Boolean(row.is_active)
  }
}

function runMt5Collector({ login, password, server, days, terminalPath }) {
  if (process.platform !== 'win32') {
    return Promise.reject(
      new Error(
        'MT5 Python collector only runs on Windows with MetaTrader 5 installed (official MetaTrader5 pip package). Deploy the API on Windows, or use a Windows worker machine; Linux/macOS hosts cannot drive terminal64.exe this way.'
      )
    )
  }
  const scriptPath = path.join(__dirname, 'mt5_fetch.py')
  return new Promise((resolve, reject) => {
    const args = [
      scriptPath,
      '--login',
      String(login || ''),
      '--password',
      String(password || ''),
      '--server',
      String(server || ''),
      '--days',
      String(days || 30)
    ]
    if (terminalPath) {
      args.push('--terminal-path', String(terminalPath))
    }
    const child = spawn(MT5_PYTHON_BIN, args, { windowsHide: true })

    let stdout = ''
    let stderr = ''
    const timeout = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error('MT5 data fetch timed out'))
    }, MT5_FETCH_TIMEOUT_MS)

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk || '')
    })
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk || '')
    })
    child.on('error', () => {
      clearTimeout(timeout)
      reject(
        new Error(
          `Cannot start Python process (${MT5_PYTHON_BIN}). Install Python and MetaTrader5 package first.`
        )
      )
    })
    child.on('close', (code) => {
      clearTimeout(timeout)
      if (code !== 0) {
        return reject(new Error(stderr.trim() || stdout.trim() || 'MT5 collector failed'))
      }
      try {
        const lines = String(stdout || '')
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
        const jsonLine =
          [...lines]
            .reverse()
            .find((line) => line.startsWith('{') && line.endsWith('}')) || '{}'
        const payload = JSON.parse(jsonLine)
        if (!payload?.ok) {
          const tried = Array.isArray(payload?.triedPaths) ? payload.triedPaths.filter(Boolean).join(' | ') : ''
          const details = tried ? ` | tried: ${tried}` : ''
          return reject(new Error(`${payload?.error || 'MT5 collector returned invalid payload'}${details}`))
        }
        return resolve(payload)
      } catch {
        return reject(
          new Error(
            `Invalid JSON output from MT5 collector. stdout=${String(stdout || '')
              .slice(0, 500)
              .replace(/\s+/g, ' ')} stderr=${String(stderr || '').slice(0, 300).replace(/\s+/g, ' ')}`
          )
        )
      }
    })
  })
}

async function collectAndCacheMt5Snapshot({ userId, login, password, server, days = 30, terminalPath = '' }) {
  const snapshot = await runMt5Collector({
    login,
    password,
    server,
    days,
    terminalPath
  })
  await pool.query(
    `INSERT INTO user_mt5_data_cache (user_id, data_json, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET data_json = EXCLUDED.data_json, updated_at = NOW()`,
    [userId, JSON.stringify(snapshot)]
  )
  const tradeBook = buildTradeBook(snapshot)
  const analysis = buildTradeBehaviorAnalysis(tradeBook.trades, snapshot.account || {})
  await queueBehaviorProofs({ userId, analysis })
  return { snapshot, analysis, tradeBook }
}

function buildMt5AutoSyncMeta() {
  return {
    enabled: MT5_AUTO_SYNC_ENABLED,
    intervalMs: MT5_AUTO_SYNC_INTERVAL_MS,
    staleMs: MT5_AUTO_SYNC_STALE_MS,
    days: MT5_AUTO_SYNC_DAYS,
    maxUsers: MT5_AUTO_SYNC_MAX_USERS,
    running: mt5AutoSyncRunning,
    inFlight: mt5AutoSyncInFlight.size
  }
}

async function runAutoMt5SyncJob() {
  if (!MT5_AUTO_SYNC_ENABLED) return
  if (mt5AutoSyncRunning) return
  mt5AutoSyncRunning = true
  try {
    const now = Date.now()
    const result = await pool.query(
      `SELECT c.user_id, c.mt5_login, c.mt5_password, c.mt5_server, c.mt5_terminal_path, cache.updated_at AS cache_updated_at
       FROM user_mt5_connections c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN user_mt5_data_cache cache ON cache.user_id = c.user_id
       WHERE c.is_active = true
         AND u.status = 'active'
       ORDER BY cache.updated_at ASC NULLS FIRST
       LIMIT $1`,
      [MT5_AUTO_SYNC_MAX_USERS]
    )

    const candidates = result.rows.filter((row) => {
      const userId = String(row.user_id || '')
      if (!userId || mt5AutoSyncInFlight.has(userId)) return false
      const updatedAt = row.cache_updated_at ? new Date(row.cache_updated_at).getTime() : 0
      if (!updatedAt || Number.isNaN(updatedAt)) return true
      return now - updatedAt >= MT5_AUTO_SYNC_STALE_MS
    })

    for (let i = 0; i < candidates.length; i += MT5_AUTO_SYNC_CONCURRENCY) {
      const batch = candidates.slice(i, i + MT5_AUTO_SYNC_CONCURRENCY)
      await Promise.all(
        batch.map(async (row) => {
          const userId = String(row.user_id || '')
          if (!userId) return
          mt5AutoSyncInFlight.add(userId)
          try {
            const password = decryptMt5Password(row.mt5_password)
            await collectAndCacheMt5Snapshot({
              userId,
              login: row.mt5_login,
              password,
              server: row.mt5_server,
              days: MT5_AUTO_SYNC_DAYS,
              terminalPath: row.mt5_terminal_path || ''
            })
          } catch (error) {
            console.error(`[mt5-auto-sync][${userId}]`, error.message || error)
          } finally {
            mt5AutoSyncInFlight.delete(userId)
          }
        })
      )
    }
  } finally {
    mt5AutoSyncRunning = false
  }
}

function triggerAutoMt5SyncSoon(delayMs = 250) {
  if (!MT5_AUTO_SYNC_ENABLED) return
  setTimeout(() => {
    runAutoMt5SyncJob().catch((error) => {
      console.error('[mt5-auto-sync][trigger]', error.message || error)
    })
  }, Math.max(0, Number(delayMs || 0)))
}

function setupMt5WebSocketServer(httpServer) {
  wss = new WebSocketServer({ server: httpServer, path: '/ws/agent' })

  wss.on('connection', (ws, req) => {
    let userId = null
    let authenticated = false

    const closeWith = (code, reason) => {
      if (ws.readyState === ws.OPEN) ws.close(code, reason)
    }

    const send = (data) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(data))
    }

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw))

        if (!authenticated) {
          if (msg.type !== 'auth' || !msg.token) {
            return closeWith(4001, 'Auth required')
          }
          try {
            const decoded = jwt.verify(msg.token, JWT_SECRET, { algorithms: ['HS256'] })
            if (decoded.scope !== 'mt5_connector' || !decoded.sub) {
              return closeWith(4003, 'Invalid token scope')
            }
            userId = String(decoded.sub)
            authenticated = true
            mt5AgentConnections.set(userId, { ws, connectedAt: new Date().toISOString() })
            ws.userId = userId
            send({ type: 'auth', status: 'ok', userId })
            console.log(`[ws-agent] Authenticated user=${userId}`)
          } catch (error) {
            return closeWith(4002, `Token invalid: ${error.message}`)
          }
          return
        }

        if (msg.type === 'snapshot' && msg.data) {
          const snapshot = msg.data
          const payload = {
            ...snapshot,
            source: snapshot.source || 'mt5-agent-ws',
            receivedAt: new Date().toISOString()
          }
          pool.query(
            `INSERT INTO user_mt5_data_cache (user_id, data_json, updated_at)
             VALUES ($1, $2::jsonb, NOW())
             ON CONFLICT (user_id)
             DO UPDATE SET data_json = EXCLUDED.data_json, updated_at = NOW()`,
            [userId, JSON.stringify(payload)]
          ).catch((error) => {
            console.error(`[ws-agent][db][${userId}]`, error.message || error)
          })
        }

        if (msg.type === 'ping') {
          send({ type: 'pong' })
        }
      } catch (error) {
        console.error('[ws-agent][message]', error.message || error)
      }
    })

    ws.on('close', () => {
      if (userId) {
        mt5AgentConnections.delete(userId)
        console.log(`[ws-agent] Disconnected user=${userId}`)
      }
    })

    ws.on('error', (error) => {
      console.error('[ws-agent][error]', error.message || error)
    })

    const timeout = setTimeout(() => {
      if (!authenticated) {
        closeWith(4000, 'Auth timeout')
      }
    }, 15000)

    ws.on('close', () => clearTimeout(timeout))
  })

  console.log(`[ws-agent] WebSocket server ready on /ws/agent`)
}

function getMt5AgentStatus(userId) {
  const conn = mt5AgentConnections.get(String(userId))
  if (!conn) return null
  return {
    connected: conn.ws.readyState === conn.ws.OPEN,
    connectedAt: conn.connectedAt
  }
}

// ═══════════════════════════════════════════════════════
// Multi-Account MT5 Helpers
// ═══════════════════════════════════════════════════════

function sanitizeMt5AccountRow(row) {
  if (!row) return null
  return {
    id: Number(row.id),
    loginId: maskSecret(row.mt5_login),
    loginRaw: row.mt5_login,
    server: row.mt5_server,
    terminalPath: row.mt5_terminal_path || '',
    accountName: row.account_name || '',
    accountType: row.account_type || 'prop',
    initialBalance: Number(row.initial_balance || 0),
    isActive: Boolean(row.is_active),
    lastSyncAt: row.last_sync_at || null,
    lastSyncStatus: row.last_sync_status || 'pending',
    lastSyncError: row.last_sync_error || '',
    syncDays: Number(row.sync_days || 365),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function sanitizeMt5AccountPublic(row) {
  const base = sanitizeMt5AccountRow(row)
  if (!base) return null
  delete base.loginRaw
  return base
}

async function collectAndCacheAccountSnapshot({ accountId, userId, login, password, server, days = 365, terminalPath = '' }) {
  const snapshot = await runMt5Collector({ login, password, server, days, terminalPath })
  // Update account balance from snapshot
  const balance = Number(snapshot?.account?.balance || 0)
  const equity = Number(snapshot?.account?.equity || 0)
  await pool.query(
    `INSERT INTO user_mt5_account_cache (mt5_account_id, user_id, data_json, updated_at)
     VALUES ($1, $2, $3::jsonb, NOW())
     ON CONFLICT (mt5_account_id)
     DO UPDATE SET data_json = EXCLUDED.data_json, user_id = EXCLUDED.user_id, updated_at = NOW()`,
    [accountId, userId, JSON.stringify(snapshot)]
  )
  await pool.query(
    `UPDATE user_mt5_accounts SET last_sync_at = NOW(), last_sync_status = 'ok', last_sync_error = '', updated_at = NOW() WHERE id = $1`,
    [accountId]
  )
  // Also update legacy single-account cache for backward compatibility
  const mergedData = await getMergedMt5Data(userId)
  if (mergedData) {
    await pool.query(
      `INSERT INTO user_mt5_data_cache (user_id, data_json, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET data_json = EXCLUDED.data_json, updated_at = NOW()`,
      [userId, JSON.stringify(mergedData)]
    )
  }
  const tradeBook = buildTradeBook(snapshot)
  const analysis = buildTradeBehaviorAnalysis(tradeBook.trades, snapshot.account || {})
  await queueBehaviorProofs({ userId, analysis }).catch(() => {})
  
  // Calculate and persist the 6 Daily Quantitative Scores
  const { calculateAndSaveDailyScores } = require('./services/scoringService.cjs')
  await calculateAndSaveDailyScores(pool, userId, accountId, tradeBook.trades, balance).catch(err => console.error('[ScoringService]', err))
  
  return { snapshot, analysis, tradeBook, balance, equity }
}

async function getMergedMt5Data(userId) {
  const cacheRes = await pool.query(
    `SELECT c.data_json, c.updated_at, a.mt5_login, a.mt5_server, a.account_name, a.account_type, a.initial_balance, a.id AS account_id
     FROM user_mt5_account_cache c
     JOIN user_mt5_accounts a ON a.id = c.mt5_account_id
     WHERE c.user_id = $1 AND a.is_active = true
     ORDER BY c.updated_at DESC`,
    [userId]
  )
  if (!cacheRes.rows.length) return null

  // Merge all account data
  const allDeals = []
  const allOrders = []
  const allPositions = []
  const allPendingOrders = []
  const accountsSummary = []
  let latestUpdatedAt = null

  for (const row of cacheRes.rows) {
    const data = row.data_json || {}
    if (Array.isArray(data.historyDeals)) allDeals.push(...data.historyDeals)
    if (Array.isArray(data.historyOrders)) allOrders.push(...data.historyOrders)
    if (Array.isArray(data.openPositions)) allPositions.push(...data.openPositions)
    if (Array.isArray(data.pendingOrders)) allPendingOrders.push(...data.pendingOrders)
    const updatedAtMs = row.updated_at ? new Date(row.updated_at).getTime() : 0
    if (!latestUpdatedAt || updatedAtMs > new Date(latestUpdatedAt).getTime()) {
      latestUpdatedAt = row.updated_at
    }
    accountsSummary.push({
      accountId: Number(row.account_id),
      login: row.mt5_login,
      server: row.mt5_server,
      accountName: row.account_name,
      accountType: row.account_type,
      initialBalance: Number(row.initial_balance || 0),
      account: data.account || {},
      summary: data.summary || {},
      updatedAt: row.updated_at
    })
  }

  // Use first (most recent) account as primary
  const primaryData = cacheRes.rows[0].data_json || {}
  return {
    source: 'mt5-multi-account-merged',
    fetchedAt: latestUpdatedAt || new Date().toISOString(),
    account: primaryData.account || {},
    openPositions: allPositions,
    pendingOrders: allPendingOrders,
    historyDeals: allDeals,
    historyOrders: allOrders,
    accounts: accountsSummary,
    summary: primaryData.summary || {}
  }
}

async function runMultiAccountAutoSync() {
  if (!MT5_AUTO_SYNC_ENABLED) return
  if (mt5AutoSyncRunning) return
  mt5AutoSyncRunning = true
  try {
    const now = Date.now()
    const result = await pool.query(
      `SELECT a.id, a.user_id, a.mt5_login, a.mt5_password, a.mt5_server, a.mt5_terminal_path, a.sync_days,
              c.updated_at AS cache_updated_at
       FROM user_mt5_accounts a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN user_mt5_account_cache c ON c.mt5_account_id = a.id
       WHERE a.is_active = true AND u.status = 'active'
       ORDER BY c.updated_at ASC NULLS FIRST
       LIMIT $1`,
      [MT5_AUTO_SYNC_MAX_USERS]
    )

    const candidates = result.rows.filter((row) => {
      const key = `${row.user_id}:${row.id}`
      if (mt5AutoSyncInFlight.has(key)) return false
      const updatedAt = row.cache_updated_at ? new Date(row.cache_updated_at).getTime() : 0
      if (!updatedAt || Number.isNaN(updatedAt)) return true
      return now - updatedAt >= MT5_AUTO_SYNC_STALE_MS
    })

    // Sync sequentially (MT5 terminal supports only 1 connection at a time)
    for (const row of candidates) {
      const key = `${row.user_id}:${row.id}`
      mt5AutoSyncInFlight.add(key)
      try {
        const password = decryptMt5Password(row.mt5_password)
        await collectAndCacheAccountSnapshot({
          accountId: Number(row.id),
          userId: String(row.user_id),
          login: row.mt5_login,
          password,
          server: row.mt5_server,
          days: row.sync_days || MT5_AUTO_SYNC_DAYS,
          terminalPath: row.mt5_terminal_path || ''
        })
      } catch (error) {
        console.error(`[mt5-multi-sync][${row.user_id}:${row.id}]`, error.message || error)
        await pool.query(
          `UPDATE user_mt5_accounts SET last_sync_status = 'error', last_sync_error = $1, updated_at = NOW() WHERE id = $2`,
          [String(error.message || 'Unknown error').slice(0, 500), row.id]
        ).catch(() => {})
      } finally {
        mt5AutoSyncInFlight.delete(key)
      }
    }
  } finally {
    mt5AutoSyncRunning = false
  }
}

function computeLevelProgress(xpRaw) {
  const xp = Math.max(0, Number(xpRaw || 0))
  const MAX_LEVEL = 30
  const STEP_XP = 100000
  const level = Math.min(MAX_LEVEL, Math.floor(xp / STEP_XP) + 1)
  const totalXP = level >= MAX_LEVEL ? null : level * STEP_XP
  return {
    level,
    totalXP,
    isMaxLevel: level >= MAX_LEVEL
  }
}

function mapUser(row) {
  if (!row) return null
  const progress = computeLevelProgress(row.xp)
  const rankPoints = Math.max(0, Number(row.rank_points || 0))
  const rankTier = normalizeRankTier(row.rank_tier, rankTierByPoints(rankPoints).key)
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    role: row.role,
    status: row.status,
    provider: row.provider,
    emailVerified: row.email_verified,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    level: progress.level,
    xp: row.xp,
    totalXP: progress.totalXP,
    isMaxLevel: progress.isMaxLevel,
    rankPoints,
    rankTier,
    passwordHash: row.password_hash
  }
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    status: user.status,
    provider: user.provider,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    level: user.level,
    xp: user.xp,
    totalXP: user.totalXP,
    isMaxLevel: user.isMaxLevel,
    rankPoints: Math.max(0, Number(user.rankPoints || 0)),
    rankTier: normalizeRankTier(user.rankTier, 'bronze')
  }
}

function normalizePlanCode(value, fallback = FREE_PLAN_CODE) {
  const code = String(value || '')
    .trim()
    .toLowerCase()
  if (code === FREE_PLAN_CODE || code === PRO_PLAN_CODE) return code
  return fallback
}

function planDefByCode(value) {
  const code = normalizePlanCode(value, PRO_PLAN_CODE)
  if (code === FREE_PLAN_CODE) return FREE_PLAN_DEFINITION
  return PLAN_CATALOG.find((item) => item.code === code) || PLAN_CATALOG[0]
}

function maskOrderCode(value) {
  const text = String(value || '').trim()
  if (text.length <= 8) return text || '--'
  return `${text.slice(0, 4)}...${text.slice(-4)}`
}

function serializeSubscription(row, user = null, { hasPaidOrder = false } = {}) {
  const isAdminUser = String(user?.role || '').toLowerCase() === 'admin'
  const rawPlanCode = normalizePlanCode(row?.plan_code, FREE_PLAN_CODE)
  const rawStatus = String(row?.status || 'inactive').trim().toLowerCase()
  const expiresAt = row?.expires_at || null
  const expiresTime = expiresAt ? new Date(expiresAt).getTime() : 0
  const notExpired = !expiresAt || (Number.isFinite(expiresTime) && expiresTime > Date.now())

  if (isAdminUser) {
    const plan = planDefByCode(PRO_PLAN_CODE)
    return {
      planCode: plan.code,
      planName: plan.name,
      status: 'active',
      startedAt: row?.started_at || null,
      expiresAt: null,
      updatedAt: row?.updated_at || null,
      isPro: true,
      requiresPayment: false,
      adminBypass: true,
      priceVnd: PRO_PLAN_PRICE_VND
    }
  }

  const activePro =
    rawPlanCode === PRO_PLAN_CODE &&
    rawStatus === 'active' &&
    notExpired &&
    hasPaidOrder
  const plan = activePro ? planDefByCode(PRO_PLAN_CODE) : FREE_PLAN_DEFINITION
  return {
    planCode: plan.code,
    planName: plan.name,
    status: activePro ? 'active' : 'payment_required',
    startedAt: row?.started_at || null,
    expiresAt: activePro ? expiresAt : null,
    updatedAt: row?.updated_at || null,
    isPro: activePro,
    requiresPayment: !activePro,
    adminBypass: false,
    priceVnd: PRO_PLAN_PRICE_VND
  }
}

async function ensureUserSubscription(userId) {
  await pool.query(
    `INSERT INTO user_subscriptions
      (user_id, plan_code, status, started_at, expires_at, updated_at)
     VALUES ($1, $2, 'inactive', NOW(), NULL, NOW())
     ON CONFLICT (user_id)
     DO NOTHING`,
    [userId, FREE_PLAN_CODE]
  )
}

async function hasPaidBillingOrder(userId) {
  const result = await pool.query(
    `SELECT id
     FROM billing_orders
     WHERE user_id = $1
       AND status = 'paid'
     LIMIT 1`,
    [userId]
  )
  return Boolean(result.rows[0])
}

async function getUserSubscription(userId, user = null) {
  await ensureUserSubscription(userId)
  const accountUser = user || (await findUserById(userId))
  const result = await pool.query(
    `SELECT user_id, plan_code, status, started_at, expires_at, updated_at
     FROM user_subscriptions
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  )
  const hasPaidOrder = accountUser?.role === 'admin' ? true : await hasPaidBillingOrder(userId)
  return serializeSubscription(result.rows[0] || {}, accountUser, { hasPaidOrder })
}

async function activateUserSubscription(userId, planCode, durationDays) {
  const nextPlanCode = normalizePlanCode(planCode, PRO_PLAN_CODE)
  await pool.query(
    `INSERT INTO user_subscriptions
      (user_id, plan_code, status, started_at, expires_at, updated_at)
     VALUES ($1, $2, 'active', NOW(), NULL, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       plan_code = EXCLUDED.plan_code,
       status = EXCLUDED.status,
       started_at = NOW(),
       expires_at = NULL,
       updated_at = NOW()`,
    [userId, nextPlanCode]
  )
}

function projectAnalysisByPlan(analysis, planCode) {
  return analysis
}

function projectTradeBookByPlan(tradeBook, planCode, analysis = null) {
  const trades = Array.isArray(tradeBook?.trades) ? tradeBook.trades : []
  const lbeTrades = Array.isArray(analysis?.lbe?.trades) ? analysis.lbe.trades : []
  const lbeById = new Map(lbeTrades.map((item) => [String(item.tradeId), item]))
  return {
    ...tradeBook,
    trades: trades.map((trade, idx) => ({
      ...trade,
      behavior: lbeById.get(tradeIdentity(trade, idx)) || null
    })),
    plan: normalizePlanCode(planCode, FREE_PLAN_CODE),
    analysisDepth: normalizePlanCode(planCode, FREE_PLAN_CODE) === PRO_PLAN_CODE ? 'pro' : 'summary'
  }
}

function sanitizeAiPrompt(value) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 900)
}

function buildBehaviorDoctorReply({ message, analysis, tradeId = '' }) {
  const prompt = sanitizeAiPrompt(message)
  const lbe = analysis?.lbe || {}
  const trades = Array.isArray(lbe.trades) ? lbe.trades : []
  const selectedTrade = tradeId ? trades.find((item) => String(item.tradeId) === String(tradeId)) : null
  const topTag = Array.isArray(lbe.topTags) && lbe.topTags.length ? lbe.topTags[0] : null
  const protocol = lbe.doctorProtocol || {}
  const topDiagnosis = Array.isArray(analysis?.behaviorHospital?.diagnoses)
    ? analysis.behaviorHospital.diagnoses[0]
    : null
  const lines = []

  if (selectedTrade) {
    lines.push(`Lenh ${selectedTrade.tradeId}: ${selectedTrade.behaviorTag}.`)
    lines.push(selectedTrade.doctorVerdict)
    if (selectedTrade.protocol?.length) lines.push(`Protocol: ${selectedTrade.protocol.slice(0, 3).join(' | ')}`)
  } else {
    lines.push(`Tong diem LBE hien tai: ${Number(lbe.profileScore || 0)}/1000.`)
    if (topTag) lines.push(`Nhom hanh vi noi bat: ${topTag.tag} (${topTag.rate}%).`)
    if (topDiagnosis) lines.push(`Chan doan chinh: ${topDiagnosis.name} - ${topDiagnosis.fix}`)
    if (protocol?.nextActions?.length) lines.push(`Ke hoach gan nhat: ${protocol.nextActions.slice(0, 3).join(' | ')}`)
  }

  if (/stop|sl|dung lo|cat lo/i.test(prompt)) {
    lines.push('Uu tien so 1: khong xoa hoac noi SL sau khi vao lenh. Neu setup sai, dong lenh thay vi tang rui ro.')
  } else if (/revenge|go|thua|loss/i.test(prompt)) {
    lines.push('Sau lenh thua, dung 20 phut va chi vao lai khi setup, SL, TP va RR ro rang.')
  } else if (/volume|lot|size|khoi luong/i.test(prompt)) {
    lines.push('Volume nen quay ve baseline 10 lenh gan nhat. Chi tang size sau chuoi 5 lenh sach.')
  } else if (prompt) {
    lines.push('Goi y: tap trung vao 1 loi hanh vi lon nhat trong ngay, khong sua tat ca cung luc.')
  }

  return {
    role: 'behavior_doctor',
    answer: lines.join('\n'),
    model: 'LuminaFox LBE Doctor v1',
    sources: {
      engine: String(lbe.engine || 'LBE_AUTOMATED_ENGINE'),
      formulaVersion: String(lbe.formulaVersion || analysis?.formulaVersion || 'lumina_lbe_behavior_system_v3')
    },
    suggestedActions: protocol?.nextActions || []
  }
}

async function queueBehaviorProofs({ userId, analysis }) {
  const trades = Array.isArray(analysis?.lbe?.trades) ? analysis.lbe.trades : []
  if (!userId || !trades.length) return
  const latest = trades.slice(-120)
  for (const item of latest) {
    const meta = item.cardanoMetadata || null
    if (!meta?.Metadata_Hash) continue
    await pool.query(
      `INSERT INTO user_behavior_proofs
        (user_id, trade_id, behavior_tag, score_change, new_total_score, metadata_hash, metadata_json, chain, chain_status, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'cardano', 'queued', NOW())
       ON CONFLICT (user_id, trade_id)
       DO UPDATE SET
         behavior_tag = EXCLUDED.behavior_tag,
         score_change = EXCLUDED.score_change,
         new_total_score = EXCLUDED.new_total_score,
         metadata_hash = EXCLUDED.metadata_hash,
         metadata_json = EXCLUDED.metadata_json,
         chain = 'cardano',
         chain_status = CASE
           WHEN user_behavior_proofs.tx_hash <> '' THEN user_behavior_proofs.chain_status
           ELSE 'queued'
         END,
         updated_at = NOW()`,
      [
        userId,
        String(item.tradeId || '').slice(0, 160),
        String(item.behaviorTag || '').slice(0, 120),
        Number(item.scoreChange || 0) + Number(item.bonusAwarded || 0),
        Number(item.newTotalScore || 0),
        String(meta.Metadata_Hash || '').slice(0, 128),
        JSON.stringify(meta)
      ]
    )
  }
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: '7d', algorithm: 'HS256' }
  )
}

function otpKey(email, purpose) {
  return `${purpose}:${normalizedEmail(email)}`
}

function createOtp(email, purpose) {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  otpStore.set(otpKey(email, purpose), {
    code,
    expiresAt: Date.now() + OTP_TTL_MS
  })
  if (!IS_PRODUCTION) {
    console.log(`[dev] OTP for ${purpose} <${email}>: ${code}`)
  }
  return code
}

function verifyOtp(email, purpose, code) {
  const payload = otpStore.get(otpKey(email, purpose))
  if (!payload) return false
  if (payload.expiresAt < Date.now()) {
    otpStore.delete(otpKey(email, purpose))
    return false
  }
  if (payload.code !== String(code || '').trim()) return false
  otpStore.delete(otpKey(email, purpose))
  return true
}

async function sendOtpEmail(email, code, purpose) {
  const subjectMap = {
    register: 'Verify your email',
    login: 'Your login OTP code',
    reset: 'Password reset OTP code'
  }
  const subject = `[LuminaFox] ${subjectMap[purpose] || 'OTP code'}`
  const text = `Your OTP code is ${code}. It expires in 5 minutes.`

  if (!transporter) {
    throw new Error('OTP email service is not configured')
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject,
    text
  })
  return true
}

function ensureMailer(res) {
  if (transporter) return true
  res.status(503).json({
    message: 'Email OTP service is not configured. Please set SMTP_* in .env.'
  })
  return false
}

async function findUserByEmail(email) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [normalizedEmail(email)])
  return mapUser(result.rows[0])
}

async function findUserById(id) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id])
  return mapUser(result.rows[0])
}

async function updateUserRoleByEmail(email) {
  const normalized = normalizedEmail(email)
  const existing = await findUserByEmail(normalized)
  if (!existing) return
  const nextRole = resolveRole(normalized, existing.role || 'user')
  if (nextRole === existing.role) return
  await pool.query('UPDATE users SET role = $1 WHERE email = $2', [nextRole, normalized])
}

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ message: 'Unauthorized' })

  try {
    req.auth = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
    return next()
  } catch {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

function connectorOrAuthRequired(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ message: 'Unauthorized' })
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
    if (payload?.scope && payload.scope !== 'mt5_connector') {
      return res.status(403).json({ message: 'Invalid connector scope' })
    }
    req.auth = payload
    return next()
  } catch {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

async function adminRequired(req, res, next) {
  const me = await findUserById(req.auth?.sub)
  if (!me || me.role !== 'admin') return res.status(403).json({ message: 'Forbidden' })
  req.me = me
  return next()
}

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      provider TEXT NOT NULL DEFAULT 'local',
      status TEXT NOT NULL DEFAULT 'active',
      email_verified BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ,
      level INTEGER NOT NULL DEFAULT 0,
      xp INTEGER NOT NULL DEFAULT 0,
      total_xp INTEGER NOT NULL DEFAULT 100000,
      rank_points INTEGER NOT NULL DEFAULT 0,
      rank_tier TEXT NOT NULL DEFAULT 'bronze'
    )
  `)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''`)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rank_points INTEGER NOT NULL DEFAULT 0`)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rank_tier TEXT NOT NULL DEFAULT 'bronze'`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_levels (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 1,
      is_active BOOLEAN NOT NULL DEFAULT true
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_chapters (
      id SERIAL PRIMARY KEY,
      level_id INTEGER NOT NULL REFERENCES learning_levels(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 1
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_lessons (
      id SERIAL PRIMARY KEY,
      chapter_id INTEGER NOT NULL REFERENCES learning_chapters(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      video_url TEXT NOT NULL DEFAULT '',
      duration_minutes INTEGER NOT NULL DEFAULT 5,
      xp_reward INTEGER NOT NULL DEFAULT 30,
      sort_order INTEGER NOT NULL DEFAULT 1
    )
  `)
  await pool.query(`ALTER TABLE learning_lessons ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT ''`)
  await pool.query(`ALTER TABLE learning_lessons ADD COLUMN IF NOT EXISTS video_url TEXT NOT NULL DEFAULT ''`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_level_quizzes (
      id SERIAL PRIMARY KEY,
      level_id INTEGER NOT NULL UNIQUE REFERENCES learning_levels(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      pass_score INTEGER NOT NULL DEFAULT 70,
      xp_reward INTEGER NOT NULL DEFAULT 200,
      questions_json JSONB NOT NULL DEFAULT '[]'::jsonb
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_lesson_progress (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id INTEGER NOT NULL REFERENCES learning_lessons(id) ON DELETE CASCADE,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(user_id, lesson_id)
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_level_quiz_progress (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      level_id INTEGER NOT NULL REFERENCES learning_levels(id) ON DELETE CASCADE,
      score INTEGER NOT NULL DEFAULT 0,
      passed BOOLEAN NOT NULL DEFAULT false,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(user_id, level_id)
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS psych_test_questions (
      id SERIAL PRIMARY KEY,
      question TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 1,
      is_active BOOLEAN NOT NULL DEFAULT true
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_daily_psych_tests (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      test_date DATE NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      result_label TEXT NOT NULL DEFAULT '',
      answers_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, test_date)
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS trade_products (
      id SERIAL PRIMARY KEY,
      symbol TEXT NOT NULL UNIQUE,
      is_custom BOOLEAN NOT NULL DEFAULT false,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_trade_precheck (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      trade_date DATE NOT NULL,
      reason_option TEXT NOT NULL,
      mood_option TEXT NOT NULL,
      product_symbol TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, trade_date)
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_trade_connections (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      api_key TEXT NOT NULL DEFAULT '',
      api_secret TEXT NOT NULL DEFAULT '',
      api_passphrase TEXT NOT NULL DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, provider)
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_demo_wallets (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      balance NUMERIC(18,2) NOT NULL DEFAULT 10000,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS trade_orders (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mode TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT '',
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      quantity NUMERIC(18,6) NOT NULL DEFAULT 0,
      entry_price NUMERIC(18,8) NOT NULL,
      tp_price NUMERIC(18,8) NOT NULL,
      sl_price NUMERIC(18,8) NOT NULL,
      rr_ratio NUMERIC(18,8) NOT NULL DEFAULT 0,
      risk_warning BOOLEAN NOT NULL DEFAULT false,
      reason_option TEXT NOT NULL DEFAULT '',
      mood_option TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      pnl NUMERIC(18,2) NOT NULL DEFAULT 0,
      provider_order_id TEXT NOT NULL DEFAULT '',
      opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      closed_at TIMESTAMPTZ
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_mt5_connections (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      mt5_login TEXT NOT NULL,
      mt5_password TEXT NOT NULL,
      mt5_server TEXT NOT NULL,
      mt5_terminal_path TEXT NOT NULL DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(
    `ALTER TABLE user_mt5_connections ADD COLUMN IF NOT EXISTS mt5_terminal_path TEXT NOT NULL DEFAULT ''`
  )
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_mt5_data_cache (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // --- Multi-account MT5 tables ---
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_mt5_accounts (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mt5_login TEXT NOT NULL,
      mt5_password TEXT NOT NULL,
      mt5_server TEXT NOT NULL,
      mt5_terminal_path TEXT NOT NULL DEFAULT '',
      account_name TEXT NOT NULL DEFAULT '',
      account_type TEXT NOT NULL DEFAULT 'prop',
      initial_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      last_sync_at TIMESTAMPTZ,
      last_sync_status TEXT NOT NULL DEFAULT 'pending',
      last_sync_error TEXT NOT NULL DEFAULT '',
      sync_days INTEGER NOT NULL DEFAULT 365,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, mt5_login, mt5_server)
    )
  `)
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_mt5_accounts_user_active ON user_mt5_accounts (user_id, is_active, updated_at DESC)`
  )
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_mt5_account_cache (
      mt5_account_id BIGINT PRIMARY KEY REFERENCES user_mt5_accounts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_mt5_account_cache_user ON user_mt5_account_cache (user_id, updated_at DESC)`
  )

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_trade_checklists (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      trade_date DATE NOT NULL DEFAULT CURRENT_DATE,
      pair_symbol TEXT NOT NULL DEFAULT '',
      direction TEXT NOT NULL DEFAULT '',
      entry_price NUMERIC(18,8) NOT NULL DEFAULT 0,
      sl_price NUMERIC(18,8) NOT NULL DEFAULT 0,
      tp_price NUMERIC(18,8) NOT NULL DEFAULT 0,
      risk_percent NUMERIC(8,4) NOT NULL DEFAULT 0,
      rr_ratio NUMERIC(12,6) NOT NULL DEFAULT 0,
      emotion_score INTEGER NOT NULL DEFAULT 0,
      plan_score INTEGER NOT NULL DEFAULT 0,
      total_score INTEGER NOT NULL DEFAULT 0,
      setup_score INTEGER NOT NULL DEFAULT 0,
      reason_score INTEGER NOT NULL DEFAULT 0,
      ready_accept BOOLEAN NOT NULL DEFAULT false,
      violate_daily_loss BOOLEAN NOT NULL DEFAULT false,
      can_trade BOOLEAN NOT NULL DEFAULT false,
      proof_hash TEXT NOT NULL DEFAULT '',
      chain_prev_hash TEXT NOT NULL DEFAULT '',
      chain_index INTEGER NOT NULL DEFAULT 0,
      cardano_tx_hash TEXT NOT NULL DEFAULT '',
      cardano_block TEXT NOT NULL DEFAULT '',
      cardano_time TEXT NOT NULL DEFAULT '',
      payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_user_trade_checklists_user_date ON user_trade_checklists (user_id, trade_date DESC)`
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_user_trade_checklists_created ON user_trade_checklists (created_at DESC)`
  )
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_monthly_report_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      report_month DATE NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      net_profit NUMERIC(18,2) NOT NULL DEFAULT 0,
      total_trades INTEGER NOT NULL DEFAULT 0,
      win_rate NUMERIC(8,2) NOT NULL DEFAULT 0,
      avg_behavior_score NUMERIC(8,2) NOT NULL DEFAULT 0,
      mood_alert_count INTEGER NOT NULL DEFAULT 0,
      email_to TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'sent',
      message_id TEXT NOT NULL DEFAULT '',
      error_text TEXT NOT NULL DEFAULT '',
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, report_month)
    )
  `)
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_user_monthly_report_logs_user_month ON user_monthly_report_logs (user_id, report_month DESC)`
  )
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_nft_profiles (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      nft_name TEXT NOT NULL DEFAULT '',
      nft_image_url TEXT NOT NULL DEFAULT '',
      wallet_address TEXT NOT NULL DEFAULT '',
      chain TEXT NOT NULL DEFAULT 'cardano',
      contract_address TEXT NOT NULL DEFAULT '',
      token_id TEXT NOT NULL DEFAULT '',
      rarity TEXT NOT NULL DEFAULT 'standard',
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      minted_tx_hash TEXT NOT NULL DEFAULT '',
      minted_at TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_user_nft_profiles_wallet ON user_nft_profiles (wallet_address)`
  )
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_rank_point_events (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      points INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT 'system',
      reason TEXT NOT NULL DEFAULT '',
      meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_user_rank_point_events_user_created ON user_rank_point_events (user_id, created_at DESC)`
  )
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_subscriptions (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      plan_code TEXT NOT NULL DEFAULT 'free',
      status TEXT NOT NULL DEFAULT 'inactive',
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(`ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'inactive'`)
  await pool.query(`ALTER TABLE user_subscriptions ALTER COLUMN status SET DEFAULT 'inactive'`)
  await pool.query(`ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`)
  await pool.query(`ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`)
  await pool.query(`ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_behavior_proofs (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      trade_id TEXT NOT NULL,
      behavior_tag TEXT NOT NULL DEFAULT '',
      score_change INTEGER NOT NULL DEFAULT 0,
      new_total_score INTEGER NOT NULL DEFAULT 0,
      metadata_hash TEXT NOT NULL DEFAULT '',
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      chain TEXT NOT NULL DEFAULT 'cardano',
      chain_status TEXT NOT NULL DEFAULT 'queued',
      tx_hash TEXT NOT NULL DEFAULT '',
      anchored_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, trade_id)
    )
  `)
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_user_behavior_proofs_user_created ON user_behavior_proofs (user_id, created_at DESC)`
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_user_behavior_proofs_hash ON user_behavior_proofs (metadata_hash)`
  )
  await pool.query(`
    CREATE TABLE IF NOT EXISTS trading_journal_accounts (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      broker TEXT NOT NULL DEFAULT '',
      market TEXT NOT NULL DEFAULT 'multi',
      currency TEXT NOT NULL DEFAULT 'USD',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, name)
    )
  `)
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_trading_journal_accounts_user ON trading_journal_accounts (user_id, is_active, created_at DESC)`
  )
  await pool.query(`
    CREATE TABLE IF NOT EXISTS trading_journal_trades (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id BIGINT NOT NULL REFERENCES trading_journal_accounts(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      asset_class TEXT NOT NULL DEFAULT 'forex',
      side TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'closed',
      entry_time TIMESTAMPTZ NOT NULL,
      exit_time TIMESTAMPTZ,
      entry_price NUMERIC(24,8) NOT NULL,
      exit_price NUMERIC(24,8) NOT NULL DEFAULT 0,
      stop_loss NUMERIC(24,8) NOT NULL DEFAULT 0,
      take_profit NUMERIC(24,8) NOT NULL DEFAULT 0,
      volume NUMERIC(24,8) NOT NULL DEFAULT 0,
      fees NUMERIC(18,4) NOT NULL DEFAULT 0,
      session TEXT NOT NULL DEFAULT '',
      strategy_tag TEXT NOT NULL DEFAULT '',
      emotion_tag TEXT NOT NULL DEFAULT '',
      setup_tag TEXT NOT NULL DEFAULT '',
      custom_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      notes TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'manual',
      import_ref TEXT NOT NULL DEFAULT '',
      mae NUMERIC(18,4) NOT NULL DEFAULT 0,
      mfe NUMERIC(18,4) NOT NULL DEFAULT 0,
      pnl NUMERIC(18,4) NOT NULL DEFAULT 0,
      rr NUMERIC(18,6) NOT NULL DEFAULT 0,
      planned_rr NUMERIC(18,6) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_trading_journal_trades_user_entry ON trading_journal_trades (user_id, entry_time DESC)`
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_trading_journal_trades_account_entry ON trading_journal_trades (account_id, entry_time DESC)`
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_trading_journal_trades_symbol ON trading_journal_trades (user_id, symbol)`
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_trading_journal_trades_user_status ON trading_journal_trades (user_id, status, entry_time DESC)`
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_trading_journal_trades_tags ON trading_journal_trades USING GIN (custom_tags)`
  )
  await pool.query(`
    CREATE TABLE IF NOT EXISTS trading_accounts (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      broker_name TEXT NOT NULL DEFAULT '',
      broker_server TEXT NOT NULL DEFAULT '',
      login_id TEXT NOT NULL DEFAULT '',
      account_name TEXT NOT NULL DEFAULT '',
      currency TEXT NOT NULL DEFAULT 'USD',
      initial_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
      current_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
      current_equity NUMERIC(18,2) NOT NULL DEFAULT 0,
      leverage NUMERIC(18,2) NOT NULL DEFAULT 0,
      account_type TEXT NOT NULL DEFAULT 'prop',
      status TEXT NOT NULL DEFAULT 'active',
      rules_config JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_trading_accounts_user_status ON trading_accounts (user_id, status, updated_at DESC)`
  )
  await pool.query(
    `ALTER TABLE trading_accounts ADD COLUMN IF NOT EXISTS rules_config JSONB NOT NULL DEFAULT '{}'::jsonb`
  )
  await pool.query(`
    CREATE TABLE IF NOT EXISTS prop_challenges (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      trading_account_id BIGINT REFERENCES trading_accounts(id) ON DELETE SET NULL,
      prop_firm_name TEXT NOT NULL DEFAULT '',
      challenge_name TEXT NOT NULL DEFAULT '',
      phase TEXT NOT NULL DEFAULT 'phase_1',
      account_size NUMERIC(18,2) NOT NULL DEFAULT 0,
      start_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
      profit_target_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
      profit_target_percent NUMERIC(8,4) NOT NULL DEFAULT 0,
      daily_loss_limit_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
      daily_loss_limit_percent NUMERIC(8,4) NOT NULL DEFAULT 0,
      max_loss_limit_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
      max_loss_limit_percent NUMERIC(8,4) NOT NULL DEFAULT 0,
      drawdown_type TEXT NOT NULL DEFAULT 'static',
      daily_loss_calculation TEXT NOT NULL DEFAULT 'start_of_day_balance',
      min_trading_days INTEGER NOT NULL DEFAULT 0,
      max_trading_days INTEGER NOT NULL DEFAULT 0,
      consistency_rule_enabled BOOLEAN NOT NULL DEFAULT false,
      consistency_max_day_profit_percent NUMERIC(8,4) NOT NULL DEFAULT 0,
      news_trading_allowed BOOLEAN NOT NULL DEFAULT true,
      weekend_holding_allowed BOOLEAN NOT NULL DEFAULT true,
      copy_trading_allowed BOOLEAN NOT NULL DEFAULT false,
      ea_allowed BOOLEAN NOT NULL DEFAULT true,
      status TEXT NOT NULL DEFAULT 'preparing',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_prop_challenges_user_status ON prop_challenges (user_id, status, updated_at DESC)`
  )
  await pool.query(`
    CREATE TABLE IF NOT EXISTS trades (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id BIGINT REFERENCES trading_accounts(id) ON DELETE SET NULL,
      challenge_id BIGINT REFERENCES prop_challenges(id) ON DELETE SET NULL,
      broker_trade_id TEXT NOT NULL DEFAULT '',
      position_id TEXT NOT NULL DEFAULT '',
      symbol TEXT NOT NULL DEFAULT '',
      side TEXT NOT NULL DEFAULT '',
      entry_time TIMESTAMPTZ,
      exit_time TIMESTAMPTZ,
      entry_price NUMERIC(24,8) NOT NULL DEFAULT 0,
      exit_price NUMERIC(24,8) NOT NULL DEFAULT 0,
      volume NUMERIC(24,8) NOT NULL DEFAULT 0,
      sl NUMERIC(24,8) NOT NULL DEFAULT 0,
      tp NUMERIC(24,8) NOT NULL DEFAULT 0,
      gross_profit NUMERIC(18,4) NOT NULL DEFAULT 0,
      commission NUMERIC(18,4) NOT NULL DEFAULT 0,
      swap NUMERIC(18,4) NOT NULL DEFAULT 0,
      net_profit NUMERIC(18,4) NOT NULL DEFAULT 0,
      mae NUMERIC(18,4) NOT NULL DEFAULT 0,
      mfe NUMERIC(18,4) NOT NULL DEFAULT 0,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      r_multiple NUMERIC(18,6) NOT NULL DEFAULT 0,
      risk_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
      risk_percent NUMERIC(8,4) NOT NULL DEFAULT 0,
      session TEXT NOT NULL DEFAULT '',
      strategy_tag TEXT NOT NULL DEFAULT '',
      emotion_before TEXT NOT NULL DEFAULT '',
      emotion_after TEXT NOT NULL DEFAULT '',
      mistake_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      quality_score INTEGER NOT NULL DEFAULT 0,
      discipline_score INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      screenshot_before TEXT NOT NULL DEFAULT '',
      screenshot_after TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_trades_user_exit ON trades (user_id, exit_time DESC)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_trades_challenge_exit ON trades (challenge_id, exit_time DESC)`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS open_positions_snapshots (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT REFERENCES trading_accounts(id) ON DELETE CASCADE,
      challenge_id BIGINT REFERENCES prop_challenges(id) ON DELETE SET NULL,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      symbol TEXT NOT NULL DEFAULT '',
      side TEXT NOT NULL DEFAULT '',
      volume NUMERIC(24,8) NOT NULL DEFAULT 0,
      entry_price NUMERIC(24,8) NOT NULL DEFAULT 0,
      current_price NUMERIC(24,8) NOT NULL DEFAULT 0,
      floating_profit NUMERIC(18,4) NOT NULL DEFAULT 0,
      sl NUMERIC(24,8) NOT NULL DEFAULT 0,
      tp NUMERIC(24,8) NOT NULL DEFAULT 0,
      risk_to_sl_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
      risk_to_sl_percent NUMERIC(8,4) NOT NULL DEFAULT 0
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_account_snapshots (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT REFERENCES trading_accounts(id) ON DELETE CASCADE,
      challenge_id BIGINT REFERENCES prop_challenges(id) ON DELETE SET NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      start_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
      start_equity NUMERIC(18,2) NOT NULL DEFAULT 0,
      high_equity NUMERIC(18,2) NOT NULL DEFAULT 0,
      low_equity NUMERIC(18,2) NOT NULL DEFAULT 0,
      end_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
      end_equity NUMERIC(18,2) NOT NULL DEFAULT 0,
      closed_pnl NUMERIC(18,4) NOT NULL DEFAULT 0,
      floating_pnl NUMERIC(18,4) NOT NULL DEFAULT 0,
      total_trades INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      daily_dd_used NUMERIC(18,4) NOT NULL DEFAULT 0,
      max_dd_used NUMERIC(18,4) NOT NULL DEFAULT 0,
      rule_status TEXT NOT NULL DEFAULT 'ok',
      UNIQUE(account_id, date)
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guardian_alerts (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id BIGINT REFERENCES trading_accounts(id) ON DELETE SET NULL,
      challenge_id BIGINT REFERENCES prop_challenges(id) ON DELETE SET NULL,
      type TEXT NOT NULL DEFAULT '',
      severity TEXT NOT NULL DEFAULT 'info',
      title TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      recommended_action TEXT NOT NULL DEFAULT '',
      is_acknowledged BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_guardian_alerts_user_created ON guardian_alerts (user_id, created_at DESC)`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS taskcare_tasks (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      challenge_id BIGINT REFERENCES prop_challenges(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'review',
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'todo',
      due_at TIMESTAMPTZ,
      generated_by TEXT NOT NULL DEFAULT 'system',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_taskcare_tasks_user_status ON taskcare_tasks (user_id, status, due_at)`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS billing_orders (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_code TEXT NOT NULL DEFAULT 'pro',
      amount_vnd INTEGER NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'bank_qr',
      status TEXT NOT NULL DEFAULT 'pending',
      qr_ref TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      payer_name TEXT NOT NULL DEFAULT '',
      payer_phone TEXT NOT NULL DEFAULT '',
      transfer_content TEXT NOT NULL DEFAULT '',
      proof_image_url TEXT NOT NULL DEFAULT '',
      proof_digest TEXT NOT NULL DEFAULT '',
      proof_uploaded_at TIMESTAMPTZ,
      auto_verified BOOLEAN NOT NULL DEFAULT false,
      auto_verified_at TIMESTAMPTZ,
      review_note TEXT NOT NULL DEFAULT '',
      provider_order_code TEXT NOT NULL DEFAULT '',
      payment_link_id TEXT NOT NULL DEFAULT '',
      checkout_url TEXT NOT NULL DEFAULT '',
      payos_raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      paid_at TIMESTAMPTZ,
      approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(`ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS payer_name TEXT NOT NULL DEFAULT ''`)
  await pool.query(`ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS payer_phone TEXT NOT NULL DEFAULT ''`)
  await pool.query(`ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS transfer_content TEXT NOT NULL DEFAULT ''`)
  await pool.query(`ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS proof_image_url TEXT NOT NULL DEFAULT ''`)
  await pool.query(`ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS proof_digest TEXT NOT NULL DEFAULT ''`)
  await pool.query(`ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS proof_uploaded_at TIMESTAMPTZ`)
  await pool.query(`ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS auto_verified BOOLEAN NOT NULL DEFAULT false`)
  await pool.query(`ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS auto_verified_at TIMESTAMPTZ`)
  await pool.query(`ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS review_note TEXT NOT NULL DEFAULT ''`)
  await pool.query(`ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS provider_order_code TEXT NOT NULL DEFAULT ''`)
  await pool.query(`ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS payment_link_id TEXT NOT NULL DEFAULT ''`)
  await pool.query(`ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS checkout_url TEXT NOT NULL DEFAULT ''`)
  await pool.query(`ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS payos_raw_json JSONB NOT NULL DEFAULT '{}'::jsonb`)
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_billing_orders_user_created ON billing_orders (user_id, created_at DESC)`
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_billing_orders_status_created ON billing_orders (status, created_at DESC)`
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_billing_orders_provider_code ON billing_orders (provider_order_code)`
  )
  await pool.query(
    `INSERT INTO user_subscriptions (user_id, plan_code, status, started_at, expires_at, updated_at)
     SELECT id, 'free', 'inactive', NOW(), NULL, NOW()
     FROM users
     ON CONFLICT (user_id)
     DO NOTHING`
  )
  await pool.query(
    `UPDATE user_subscriptions sub
     SET plan_code = 'free',
         status = 'inactive',
         expires_at = NULL,
         updated_at = NOW()
     FROM users u
     WHERE sub.user_id = u.id
       AND u.role <> 'admin'
       AND NOT EXISTS (
         SELECT 1
         FROM billing_orders o
         WHERE o.user_id = sub.user_id
           AND o.status = 'paid'
       )`
  )

  const levelCountRes = await pool.query('SELECT COUNT(*)::int AS c FROM learning_levels')
  const levelCount = levelCountRes.rows[0]?.c || 0
  if (levelCount === 0) {
    const seedLevels = [
      { title: 'Cap 1: Nhap Mon', description: 'Nen tang kinh te va thi truong co ban', order: 1 },
      { title: 'Cap 2: Ky Thuat', description: 'Chart, setup va ky thuat giao dich', order: 2 },
      { title: 'Cap 3: Tam Ly & Von', description: 'Quan ly cam xuc va rui ro', order: 3 },
      { title: 'Cap 4: Thuc Chien', description: 'Van dung he thong vao thi truong that', order: 4 },
      { title: 'Cap 5: Chuyen Nghiep', description: 'Xay dung quy trinh giao dich ben vung', order: 5 }
    ]
    for (const level of seedLevels) {
      const levelInsert = await pool.query(
        `INSERT INTO learning_levels (title, description, sort_order) VALUES ($1, $2, $3) RETURNING id`,
        [level.title, level.description, level.order]
      )
      const levelId = levelInsert.rows[0].id
      for (let chapterOrder = 1; chapterOrder <= 3; chapterOrder++) {
        const chapterInsert = await pool.query(
          `INSERT INTO learning_chapters (level_id, title, description, sort_order)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [
            levelId,
            `Chuong ${chapterOrder}`,
            `Noi dung trong tam chuong ${chapterOrder} cua ${level.title.toLowerCase()}`,
            chapterOrder
          ]
        )
        const chapterId = chapterInsert.rows[0].id
        for (let lessonOrder = 1; lessonOrder <= 3; lessonOrder++) {
          await pool.query(
            `INSERT INTO learning_lessons
              (chapter_id, title, content, image_url, video_url, duration_minutes, xp_reward, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              chapterId,
              `Bai ${lessonOrder} - Chuong ${chapterOrder}`,
              `Noi dung bai hoc ${lessonOrder} cua chuong ${chapterOrder}.`,
              '',
              '',
              5 + lessonOrder,
              30,
              lessonOrder
            ]
          )
        }
      }

      const questions = [
        {
          question: `Khái niệm trọng tâm của ${level.title} là gì?`,
          options: ['Lý thuyết nền tảng', 'Quản trị hệ thống', 'Bảo mật server', 'UI animation'],
          correctIndex: 0
        },
        {
          question: `Mục tiêu học tập chính ở ${level.title} là?`,
          options: ['Không cần kế hoạch', 'Tăng đòn bẩy tối đa', 'Nắm chắc kiến thức và ứng dụng', 'Chỉ học tin tức'],
          correctIndex: 2
        },
        {
          question: 'Yếu tố nào quan trọng để lên cấp tiếp theo?',
          options: ['Bỏ qua quiz', 'Hoàn thành đủ 3 chương và quiz', 'Chỉ cần đăng nhập', 'Chỉ học 1 chương'],
          correctIndex: 1
        },
        {
          question: 'Quy trình học đúng là?',
          options: ['Quiz trước, học sau', 'Học chương, hoàn thành bài, làm quiz', 'Chỉ xem tiêu đề', 'Đợi mở khóa tự động'],
          correctIndex: 1
        },
        {
          question: 'Kết quả quiz bao nhiêu thì đạt?',
          options: ['>= 70%', '>= 30%', '>= 50%', '>= 10%'],
          correctIndex: 0
        }
      ]
      await pool.query(
        `INSERT INTO learning_level_quizzes
          (level_id, title, pass_score, xp_reward, questions_json)
         VALUES ($1, $2, 70, 200, $3::jsonb)`,
        [levelId, `Quiz Tong Ket ${level.title}`, JSON.stringify(questions)]
      )
    }
  }

  const psychCountRes = await pool.query(`SELECT COUNT(*)::int AS c FROM psych_test_questions`)
  if (!psychCountRes.rows[0]?.c) {
    for (let i = 0; i < DEFAULT_PSYCH_TEST_QUESTIONS.length; i++) {
      const q = DEFAULT_PSYCH_TEST_QUESTIONS[i]
      await pool.query(
        `INSERT INTO psych_test_questions (question, option_a, option_b, option_c, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [q.question, q.optionA, q.optionB, q.optionC, i + 1]
      )
    }
  }
  const productCountRes = await pool.query(`SELECT COUNT(*)::int AS c FROM trade_products`)
  if (!productCountRes.rows[0]?.c) {
    for (const symbol of DEFAULT_TRADE_PRODUCTS) {
      await pool.query(`INSERT INTO trade_products (symbol, is_custom) VALUES ($1, false)`, [symbol])
    }
  }

  const adminEmail = normalizedEmail(process.env.ADMIN_EMAIL)
  const adminPassword = String(process.env.ADMIN_PASSWORD || '')
  if (!adminEmail || !adminPassword) return

  const exists = await findUserByEmail(adminEmail)
  if (!exists) {
    const passwordHash = await bcrypt.hash(adminPassword, 10)
    await pool.query(
      `INSERT INTO users
        (id, name, email, password_hash, role, provider, status, email_verified)
       VALUES ($1, $2, $3, $4, 'admin', 'local', 'active', true)`,
      [crypto.randomUUID(), 'System Admin', adminEmail, passwordHash]
    )
  } else if (exists.role !== 'admin') {
    await pool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [adminEmail])
  }
}

app.get('/api/health', async (_, res) => {
  await pool.query('SELECT 1')
  res.json({ ok: true })
})

app.post('/api/auth/register', async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const email = normalizedEmail(req.body?.email)
  const phone = normalizedPhone(req.body?.phone)
  const password = String(req.body?.password || '')
  if (!name || !email || !phone || !/^[0-9+()\-\s]{8,20}$/.test(phone) || password.length < 6) {
    return res.status(400).json({ message: 'Invalid register payload' })
  }

  const existed = await findUserByEmail(email)
  if (existed && existed.emailVerified) return res.status(409).json({ message: 'Email already exists' })

  const passwordHash = await bcrypt.hash(password, 10)
  const role = resolveRole(email, existed?.role || 'user')

  if (existed) {
    await pool.query(
      `UPDATE users
       SET name = $1, phone = $2, password_hash = $3, provider = 'local', status = 'active',
           email_verified = false, role = $4
       WHERE email = $5`,
      [name, phone, passwordHash, role, email]
    )
  } else {
    await pool.query(
      `INSERT INTO users
        (id, name, email, phone, password_hash, role, provider, status, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, 'local', 'active', false)`,
      [crypto.randomUUID(), name, email, phone, passwordHash, role]
    )
  }

  if (!ensureMailer(res)) return

  const code = createOtp(email, 'register')
  await sendOtpEmail(email, code, 'register')
  return res.json({ message: 'OTP sent to your email' })
})

app.post('/api/auth/verify-register-otp', async (req, res) => {
  const email = normalizedEmail(req.body?.email)
  const otp = String(req.body?.otp || '')
  if (!verifyOtp(email, 'register', otp)) {
    return res.status(400).json({ message: 'OTP is invalid or expired' })
  }

  await updateUserRoleByEmail(email)
  const result = await pool.query(
    `UPDATE users
     SET email_verified = true, last_login_at = NOW()
     WHERE email = $1
     RETURNING *`,
    [email]
  )
  const user = mapUser(result.rows[0])
  if (!user) return res.status(404).json({ message: 'User not found' })
  const token = signToken(user)
  const subscription = await getUserSubscription(user.id, user)
  return res.json({
    token,
    user: {
      ...publicUser(user),
      subscription,
      access: {
        isPro: subscription.isPro,
        analysisDepth: subscription.isPro ? 'pro' : 'summary'
      }
    }
  })
})

app.post('/api/auth/login', async (req, res) => {
  const email = normalizedEmail(req.body?.email)
  const password = String(req.body?.password || '')
  const user = await findUserByEmail(email)
  if (!user || user.provider !== 'local' || !user.passwordHash) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }
  if (user.status !== 'active') return res.status(403).json({ message: 'Account is inactive' })

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' })

  if (!user.emailVerified) {
    if (!ensureMailer(res)) return
    const code = createOtp(email, 'register')
    await sendOtpEmail(email, code, 'register')
    return res.status(403).json({
      message: 'Email is not verified. Verify OTP first.',
      reason: 'EMAIL_NOT_VERIFIED'
    })
  }

  await updateUserRoleByEmail(email)
  const result = await pool.query(
    `UPDATE users SET last_login_at = NOW() WHERE email = $1 RETURNING *`,
    [email]
  )
  const loggedInUser = mapUser(result.rows[0])
  if (!loggedInUser) return res.status(404).json({ message: 'User not found' })
  const token = signToken(loggedInUser)
  const subscription = await getUserSubscription(loggedInUser.id, loggedInUser)
  return res.json({
    token,
    user: {
      ...publicUser(loggedInUser),
      subscription,
      access: {
        isPro: subscription.isPro,
        analysisDepth: subscription.isPro ? 'pro' : 'summary'
      }
    }
  })
})

app.post('/api/auth/verify-login-otp', async (req, res) => {
  const email = normalizedEmail(req.body?.email)
  const otp = String(req.body?.otp || '')
  const otpOk = verifyOtp(email, 'login', otp)

  if (!otpOk) {
    if (!IS_PRODUCTION) {
      const user = await findUserByEmail(email)
      if (user && user.role === 'admin') {
        await updateUserRoleByEmail(email)
        const result = await pool.query(
          `UPDATE users SET last_login_at = NOW() WHERE email = $1 RETURNING *`,
          [email]
        )
        const adminUser = mapUser(result.rows[0])
        if (adminUser && adminUser.status === 'active') {
          const token = signToken(adminUser)
          const subscription = await getUserSubscription(adminUser.id, adminUser)
          return res.json({
            token,
            user: { ...publicUser(adminUser), subscription, access: { isPro: true, analysisDepth: 'pro' } },
            devBypass: true
          })
        }
      }
    }
    return res.status(400).json({ message: 'OTP is invalid or expired' })
  }

  await updateUserRoleByEmail(email)
  const result = await pool.query(
    `UPDATE users SET last_login_at = NOW() WHERE email = $1 RETURNING *`,
    [email]
  )
  const user = mapUser(result.rows[0])
  if (!user) return res.status(404).json({ message: 'User not found' })
  if (user.status !== 'active') return res.status(403).json({ message: 'Account is inactive' })
  const token = signToken(user)
  const subscription = await getUserSubscription(user.id, user)
  return res.json({
    token,
    user: {
      ...publicUser(user),
      subscription,
      access: {
        isPro: subscription.isPro,
        analysisDepth: subscription.isPro ? 'pro' : 'summary'
      }
    }
  })
})

app.post('/api/auth/forgot-password', async (req, res) => {
  const email = normalizedEmail(req.body?.email)
  const user = await findUserByEmail(email)
  if (user && user.provider === 'local' && transporter) {
    const code = createOtp(email, 'reset')
    await sendOtpEmail(email, code, 'reset')
  }
  return res.json({ message: 'If your email exists, OTP has been sent.' })
})

app.post('/api/auth/reset-password', async (req, res) => {
  const email = normalizedEmail(req.body?.email)
  const otp = String(req.body?.otp || '')
  const newPassword = String(req.body?.newPassword || '')
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must have at least 6 characters' })
  }
  if (!verifyOtp(email, 'reset', otp)) {
    return res.status(400).json({ message: 'OTP is invalid or expired' })
  }

  const hash = await bcrypt.hash(newPassword, 10)
  const result = await pool.query(
    `UPDATE users SET password_hash = $1 WHERE email = $2 AND provider = 'local' RETURNING id`,
    [hash, email]
  )
  if (!result.rows.length) return res.status(404).json({ message: 'User not found' })
  return res.json({ message: 'Password updated successfully' })
})

app.get('/api/auth/google/url', (_, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(400).json({ message: 'Google OAuth is not configured on server' })
  }

  const state = crypto.randomBytes(12).toString('hex')
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', GOOGLE_CLIENT_ID)
  url.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)
  return res.json({ url: url.toString() })
})

app.get('/api/auth/google/callback', async (req, res) => {
  const code = String(req.query?.code || '')
  if (!code) return res.status(400).send('Missing code')
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(400).send('Google OAuth is not configured')
  }

  try {
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    })
    const tokenJson = await tokenResp.json()
    if (!tokenResp.ok || !tokenJson.access_token) {
      return res.status(401).send('Google token exchange failed')
    }

    const infoResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` }
    })
    const infoJson = await infoResp.json()
    if (!infoResp.ok || !infoJson.email) {
      return res.status(401).send('Google user info fetch failed')
    }

    const email = normalizedEmail(infoJson.email)
    const role = resolveRole(email)
    const existing = await findUserByEmail(email)

    let row
    if (existing) {
      if (!existing.emailVerified) {
        if (ensureMailer(res)) {
          const code = createOtp(email, 'register')
          await sendOtpEmail(email, code, 'register')
        }
        const redirectUrl = `${FRONTEND_URL}/auth/callback?email=${encodeURIComponent(email)}&requires_otp=true`
        return res.redirect(302, redirectUrl)
      } else {
        const result = await pool.query(
          `UPDATE users
           SET provider = COALESCE(provider, 'google'),
               role = $1,
               last_login_at = NOW()
           WHERE email = $2
           RETURNING *`,
          [role, email]
        )
        row = result.rows[0]
      }
    } else {
      await pool.query(
        `INSERT INTO users
          (id, name, email, phone, password_hash, role, provider, status, email_verified, last_login_at)
         VALUES ($1, $2, $3, '', NULL, $4, 'google', 'active', false, NOW())
         RETURNING *`,
        [crypto.randomUUID(), infoJson.name || email.split('@')[0], email, role]
      )
      
      if (ensureMailer(res)) {
        const code = createOtp(email, 'register')
        await sendOtpEmail(email, code, 'register')
      }
      const redirectUrl = `${FRONTEND_URL}/auth/callback?email=${encodeURIComponent(email)}&requires_otp=true`
      return res.redirect(302, redirectUrl)
    }

    const user = mapUser(row)
    const token = signToken(user)
    const redirectUrl = `${FRONTEND_URL}/auth/callback?token=${encodeURIComponent(token)}`
    return res.redirect(302, redirectUrl)
  } catch (error) {
    return res.status(500).send(`Google auth failed: ${error.message}`)
  }
})

app.get('/api/auth/me', authRequired, async (req, res) => {
  const user = await findUserById(req.auth.sub)
  if (!user) return res.status(404).json({ message: 'User not found' })
  const subscription = await getUserSubscription(user.id, user)
  return res.json({
    user: {
      ...publicUser(user),
      subscription,
      access: {
        isPro: subscription.isPro,
        analysisDepth: subscription.isPro ? 'pro' : 'summary'
      }
    }
  })
})

app.patch('/api/auth/profile', authRequired, async (req, res) => {
  const user = await findUserById(req.auth.sub)
  if (!user) return res.status(404).json({ message: 'User not found' })
  const name = String(req.body?.name || user.name).trim().slice(0, 120)
  const phone = normalizedPhone(req.body?.phone || user.phone || '')
  if (!name) return res.status(400).json({ message: 'Name is required.' })
  if (phone && !/^[0-9+()\-\s]{8,20}$/.test(phone)) {
    return res.status(400).json({ message: 'Phone is invalid.' })
  }
  const updateRes = await pool.query(
    `UPDATE users
     SET name = $1, phone = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [name, phone, user.id]
  )
  const updated = mapUser(updateRes.rows[0])
  const subscription = await getUserSubscription(updated.id, updated)
  return res.json({
    user: {
      ...publicUser(updated),
      subscription,
      access: {
        isPro: subscription.isPro,
        analysisDepth: subscription.isPro ? 'pro' : 'summary'
      }
    }
  })
})

app.patch('/api/auth/password', authRequired, async (req, res) => {
  const user = await findUserById(req.auth.sub)
  if (!user) return res.status(404).json({ message: 'User not found' })
  if (user.provider !== 'local' || !user.passwordHash) {
    return res.status(400).json({ message: 'Password update is only available for local account.' })
  }
  const oldPassword = String(req.body?.oldPassword || '')
  const newPassword = String(req.body?.newPassword || '')
  if (!oldPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'Invalid password payload.' })
  }
  const ok = await bcrypt.compare(oldPassword, user.passwordHash)
  if (!ok) return res.status(400).json({ message: 'Old password is incorrect.' })
  const nextHash = await bcrypt.hash(newPassword, 10)
  await pool.query(
    `UPDATE users
     SET password_hash = $1, updated_at = NOW()
     WHERE id = $2`,
    [nextHash, user.id]
  )
  return res.json({ ok: true })
})

app.get('/api/psych-test/status', authRequired, async (req, res) => {
  const me = await findUserById(req.auth.sub)
  if (!me) return res.status(404).json({ message: 'User not found' })
  if (me.role === 'admin') {
    return res.json({ required: false, completed: true, isAdmin: true })
  }

  const doneRes = await pool.query(
    `SELECT score, result_label, completed_at
     FROM user_daily_psych_tests
     WHERE user_id = $1 AND test_date = CURRENT_DATE
     LIMIT 1`,
    [me.id]
  )
  const done = doneRes.rows[0]
  return res.json({
    required: true,
    completed: Boolean(done),
    isAdmin: false,
    score: done?.score ?? null,
    result: done?.result_label ?? null,
    completedAt: done?.completed_at ?? null
  })
})

app.get('/api/psych-test/questions', authRequired, async (req, res) => {
  const me = await findUserById(req.auth.sub)
  if (!me) return res.status(404).json({ message: 'User not found' })
  if (me.role === 'admin') {
    return res.json({ questions: [], required: false })
  }
  const result = await pool.query(
    `SELECT id, question, option_a, option_b, option_c, sort_order
     FROM psych_test_questions
     WHERE is_active = true
     ORDER BY sort_order ASC, id ASC`
  )
  return res.json({
    required: true,
    questions: result.rows.map((row) => ({
      id: row.id,
      question: row.question,
      options: { A: row.option_a, B: row.option_b, C: row.option_c },
      sortOrder: row.sort_order
    }))
  })
})

app.post('/api/psych-test/submit', authRequired, async (req, res) => {
  const me = await findUserById(req.auth.sub)
  if (!me) return res.status(404).json({ message: 'User not found' })
  if (me.role === 'admin') {
    return res.json({ required: false, completed: true, score: null, result: 'Admin skipped' })
  }

  const questionRes = await pool.query(
    `SELECT id
     FROM psych_test_questions
     WHERE is_active = true
     ORDER BY sort_order ASC, id ASC`
  )
  const questionIds = questionRes.rows.map((r) => Number(r.id))
  if (!questionIds.length) {
    return res.status(400).json({ message: 'Psych test has no questions' })
  }

  const incoming = Array.isArray(req.body?.answers) ? req.body.answers : []
  const answerMap = new Map()
  for (const item of incoming) {
    const qid = Number(item?.questionId)
    const choice = String(item?.choice || '').toUpperCase().trim()
    if (!questionIds.includes(qid)) continue
    if (!PSYCH_TEST_CHOICES.includes(choice)) continue
    answerMap.set(qid, choice)
  }
  if (answerMap.size !== questionIds.length) {
    return res.status(400).json({ message: 'Ban can tra loi day du tat ca cau hoi.' })
  }

  const normalizedAnswers = questionIds.map((questionId) => ({
    questionId,
    choice: answerMap.get(questionId)
  }))
  const score = normalizedAnswers.reduce((sum, item) => sum + psychScoreOfChoice(item.choice), 0)
  const result = psychResultLabel(score)

  await pool.query(
    `INSERT INTO user_daily_psych_tests (user_id, test_date, score, result_label, answers_json, completed_at)
     VALUES ($1, CURRENT_DATE, $2, $3, $4::jsonb, NOW())
     ON CONFLICT (user_id, test_date)
     DO UPDATE SET score = EXCLUDED.score,
                   result_label = EXCLUDED.result_label,
                   answers_json = EXCLUDED.answers_json,
                   completed_at = NOW()`,
    [me.id, score, result, JSON.stringify(normalizedAnswers)]
  )

  return res.json({ required: true, completed: true, score, result })
})

app.get('/api/trading/exness/status', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const [connRes, cacheRes] = await Promise.all([
    pool.query(
      `SELECT mt5_login, mt5_server, mt5_terminal_path, is_active, updated_at
       FROM user_mt5_connections
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    ),
    pool.query(
      `SELECT data_json, updated_at
       FROM user_mt5_data_cache
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    )
  ])
  const connection = sanitizeMt5Connection(connRes.rows[0])
  const cache = cacheRes.rows[0]
  const cacheUpdatedAt = cache?.updated_at ? new Date(cache.updated_at).getTime() : null
  const cacheAgeMs = cacheUpdatedAt ? Math.max(0, Date.now() - cacheUpdatedAt) : null
  const agentStatus = getMt5AgentStatus(userId)
  return res.json({
    connected: Boolean(connection?.isActive) || Boolean(agentStatus?.connected),
    connection,
    lastSyncAt: cache?.updated_at || null,
    snapshot: cache?.data_json || null,
    cacheAgeMs,
    autoSync: buildMt5AutoSyncMeta(),
    realtimeAgent: agentStatus
  })
})

app.post('/api/trading/exness/connect', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const login = String(req.body?.login || '').trim()
  const password = String(req.body?.password || '').trim()
  const server = String(req.body?.server || '').trim()
  const terminalPath = String(req.body?.terminalPath || '').trim()
  if (!login || !password || !server) {
    return res.status(400).json({ message: 'MT5 login, password, server are required.' })
  }
  const encryptedPassword = encryptMt5Password(password)
  await pool.query(
    `INSERT INTO user_mt5_connections (user_id, mt5_login, mt5_password, mt5_server, mt5_terminal_path, is_active, updated_at)
     VALUES ($1, $2, $3, $4, $5, true, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       mt5_login = EXCLUDED.mt5_login,
       mt5_password = EXCLUDED.mt5_password,
       mt5_server = EXCLUDED.mt5_server,
       mt5_terminal_path = EXCLUDED.mt5_terminal_path,
       is_active = true,
       updated_at = NOW()`,
    [userId, login, encryptedPassword, server, terminalPath]
  )
  triggerAutoMt5SyncSoon(100)
  return res.json({ ok: true })
})

app.post('/api/trading/exness/connect-and-sync', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const login = String(req.body?.login || '').trim()
  const password = String(req.body?.password || '').trim()
  const server = String(req.body?.server || '').trim()
  const terminalPath = String(req.body?.terminalPath || '').trim()
  const days = Math.max(1, Math.min(365, Number(req.body?.days || 30)))

  if (!login || !password || !server) {
    return res.status(400).json({ message: 'MT5 login, password, server are required.' })
  }

  const encryptedPassword = encryptMt5Password(password)
  await pool.query(
    `INSERT INTO user_mt5_connections (user_id, mt5_login, mt5_password, mt5_server, mt5_terminal_path, is_active, updated_at)
     VALUES ($1, $2, $3, $4, $5, true, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       mt5_login = EXCLUDED.mt5_login,
       mt5_password = EXCLUDED.mt5_password,
       mt5_server = EXCLUDED.mt5_server,
       mt5_terminal_path = EXCLUDED.mt5_terminal_path,
       is_active = true,
       updated_at = NOW()`,
    [userId, login, encryptedPassword, server, terminalPath]
  )
  triggerAutoMt5SyncSoon(100)

  try {
    const { snapshot, analysis, tradeBook } = await collectAndCacheMt5Snapshot({
      userId,
      login,
      password,
      server,
      days,
      terminalPath
    })
    return res.json({ ok: true, snapshot, analysis, tradeBook })
  } catch (error) {
    return res.json({
      ok: true,
      connected: true,
      syncOk: false,
      syncError: error.message || 'Connected but cannot sync MT5 data right now. Check MT5 terminal/service.',
      message: 'MT5 connection saved. Start the realtime agent to stream data.'
    })
  }
})

app.post('/api/trading/exness/connector-token', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const token = jwt.sign(
    {
      sub: userId,
      scope: 'mt5_connector',
      type: 'connector'
    },
    JWT_SECRET,
    { expiresIn: '90d', algorithm: 'HS256' }
  )
  return res.json({ token, expiresInDays: 90 })
})

app.delete('/api/trading/exness/connect', authRequired, async (req, res) => {
  const userId = req.auth.sub
  await pool.query(`DELETE FROM user_mt5_connections WHERE user_id = $1`, [userId])
  return res.json({ ok: true })
})

app.get('/api/trading/exness/agent/download', async (req, res) => {
  const agentPath = path.join(__dirname, 'mt5_agent_ws.py')
  res.download(agentPath, 'mt5_agent_ws.py')
})

app.post('/api/trading/exness/sync', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const days = Math.max(1, Math.min(365, Number(req.body?.days || 30)))
  const connRes = await pool.query(
    `SELECT mt5_login, mt5_password, mt5_server, mt5_terminal_path, is_active
     FROM user_mt5_connections
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  )
  const connection = connRes.rows[0]
  if (!connection || !connection.is_active) {
    return res.status(400).json({ message: 'Please connect MT5 Exness first.' })
  }
  try {
    const password = decryptMt5Password(connection.mt5_password)
    const { snapshot, analysis, tradeBook } = await collectAndCacheMt5Snapshot({
      userId,
      login: connection.mt5_login,
      password,
      server: connection.mt5_server,
      days,
      terminalPath: connection.mt5_terminal_path
    })
    triggerAutoMt5SyncSoon(100)
    return res.json({ ok: true, snapshot, analysis, tradeBook })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Cannot fetch MT5 data now.' })
  }
})

app.post('/api/trading/exness/push', connectorOrAuthRequired, async (req, res) => {
  const userId = req.auth.sub
  const snapshot = req.body?.snapshot || req.body || {}
  if (!snapshot || typeof snapshot !== 'object') {
    return res.status(400).json({ message: 'Invalid snapshot payload' })
  }
  if (!snapshot.account || !Array.isArray(snapshot.historyDeals || [])) {
    return res.status(400).json({ message: 'Snapshot must include account and historyDeals' })
  }
  const payload = {
    ...snapshot,
    source: snapshot.source || 'mt5-connector',
    pushedAt: new Date().toISOString()
  }
  await pool.query(
    `INSERT INTO user_mt5_data_cache (user_id, data_json, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET data_json = EXCLUDED.data_json, updated_at = NOW()`,
    [userId, JSON.stringify(payload)]
  )
  triggerAutoMt5SyncSoon(100)
  return res.json({ ok: true })
})

// ═══════════════════════════════════════════════════════
// Multi-Account MT5 API Endpoints
// ═══════════════════════════════════════════════════════

app.get('/api/mt5/accounts', authRequired, async (req, res) => {
  try {
    const userId = req.auth.sub
    const result = await pool.query(
      `SELECT a.*, c.updated_at AS cache_updated_at, c.data_json->'account' AS cached_account_json
       FROM user_mt5_accounts a
       LEFT JOIN user_mt5_account_cache c ON c.mt5_account_id = a.id
       WHERE a.user_id = $1 ORDER BY a.created_at ASC`,
      [userId]
    )
    const accounts = result.rows.map((row) => {
      const base = sanitizeMt5AccountPublic(row)
      try {
        const ca = row.cached_account_json || null
        if (ca && typeof ca === 'object') {
          base.currentBalance = Number(ca.balance || base.initialBalance)
          base.currentEquity = Number(ca.equity || base.currentBalance)
          base.profit = Number(ca.profit || 0)
          base.leverage = Number(ca.leverage || 0)
          base.currency = ca.currency || 'USD'
          base.company = ca.company || ''
          base.brokerName = ca.company || 'MetaQuotes'
        } else {
          base.currentBalance = base.initialBalance; base.currentEquity = base.initialBalance
          base.profit = 0; base.leverage = 0; base.currency = 'USD'; base.company = ''; base.brokerName = 'MetaQuotes'
        }
      } catch { base.currentBalance = base.initialBalance; base.currentEquity = base.initialBalance }
      base.cacheUpdatedAt = row.cache_updated_at || null
      return base
    })
    return res.json({ accounts })
  } catch (error) {
    console.error('GET /api/mt5/accounts error:', error)
    return res.status(500).json({ message: 'Internal server error', error: error.message })
  }
})

app.get('/api/journal/data/:accountId', authRequired, async (req, res) => {
  try {
    const userId = req.auth.sub
    const accountId = Number(req.params.accountId)
    if (!accountId) return res.status(400).json({ message: 'Invalid account ID' })

    const result = await pool.query(
      `SELECT c.data_json
       FROM user_mt5_accounts a
       JOIN user_mt5_account_cache c ON c.mt5_account_id = a.id
       WHERE a.id = $1 AND a.user_id = $2`,
      [accountId, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No MT5 data found for this account. Ensure it is connected and synced.' })
    }

    const dataJson = result.rows[0].data_json || {}
    const rawTrades = dataJson.historyDeals || []
    const accountInfo = dataJson.account || {}

    // Group trades by date to build the daily stats
    const tradesByDate = {}
    for (const trade of rawTrades) {
      let exitTimeStr = trade.exitTime || trade.closeTime || trade.close_time || trade.timeline
      if (!exitTimeStr && trade.time) {
        exitTimeStr = new Date(trade.time * 1000).toISOString()
      }
      if (!exitTimeStr) continue
      // Keep local date for daily journal grouping
      const dateStr = exitTimeStr.slice(0, 10) 
      if (!tradesByDate[dateStr]) {
        tradesByDate[dateStr] = {
          date: dateStr,
          trades: [],
          netProfit: 0,
          grossProfit: 0,
          grossLoss: 0,
          totalTrades: 0,
          winners: 0,
          losers: 0,
          commission: 0,
          volume: 0,
          profitFactor: 0,
          winRate: 0
        }
      }
      
      const stat = tradesByDate[dateStr]
      stat.trades.push(trade)
      stat.totalTrades++
      stat.volume += Number(trade.volume || 0)
      stat.commission += Number(trade.commission || 0)
      
      const pnl = Number(trade.netProfit || trade.profit || 0)
      stat.netProfit += pnl
      
      if (pnl >= 0) {
        stat.winners++
        stat.grossProfit += pnl
      } else {
        stat.losers++
        stat.grossLoss += Math.abs(pnl)
      }
    }

    const dailyStats = Object.values(tradesByDate).map(stat => {
      stat.winRate = stat.totalTrades > 0 ? (stat.winners / stat.totalTrades) * 100 : 0
      stat.profitFactor = stat.grossLoss > 0 ? (stat.grossProfit / stat.grossLoss) : (stat.grossProfit > 0 ? 999 : 0)
      
      // rounding
      stat.netProfit = Number(stat.netProfit.toFixed(2))
      stat.grossProfit = Number(stat.grossProfit.toFixed(2))
      stat.grossLoss = Number(stat.grossLoss.toFixed(2))
      stat.commission = Number(stat.commission.toFixed(2))
      stat.volume = Number(stat.volume.toFixed(2))
      stat.profitFactor = Number(stat.profitFactor.toFixed(2))
      stat.winRate = Number(stat.winRate.toFixed(2))
      
      // Sort trades inside day (newest first)
      stat.trades.sort((a, b) => {
        const tA = new Date(a.exitTime || a.closeTime || a.close_time || a.timeline || (a.time ? a.time * 1000 : 0)).getTime()
        const tB = new Date(b.exitTime || b.closeTime || b.close_time || b.timeline || (b.time ? b.time * 1000 : 0)).getTime()
        return tB - tA
      })
      return stat
    })

    // Sort days descending (newest first)
    dailyStats.sort((a, b) => b.date.localeCompare(a.date))

    return res.json({
      accountId,
      dailyStats,
      totalTradesFound: rawTrades.length,
      accountSnapshot: { account: accountInfo },
      rawTrades: rawTrades
    })

  } catch (error) {
    console.error('GET /api/journal/data/:accountId error:', error)
    return res.status(500).json({ message: 'Internal server error', error: error.message })
  }
})


app.post('/api/mt5/accounts', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const login = String(req.body?.login || '').trim()
  const password = String(req.body?.password || '').trim()
  const server = String(req.body?.server || '').trim()
  const terminalPath = String(req.body?.terminalPath || '').trim()
  const accountName = String(req.body?.accountName || '').trim()
  const accountType = ['demo', 'live', 'prop'].includes(req.body?.accountType) ? req.body.accountType : 'prop'
  const initialBalance = Math.max(0, Number(req.body?.initialBalance || 0))
  const days = Math.max(1, Math.min(365, Number(req.body?.days || 365)))
  if (!login || !password || !server) return res.status(400).json({ message: 'MT5 login, password, server are required.' })
  if (!accountName) return res.status(400).json({ message: 'Account name/label is required.' })

  const existsRes = await pool.query(
    `SELECT id FROM user_mt5_accounts WHERE user_id = $1 AND mt5_login = $2 AND mt5_server = $3`, [userId, login, server]
  )
  if (existsRes.rows.length > 0) return res.status(409).json({ message: 'This MT5 account is already connected.' })

  const encPass = encryptMt5Password(password)
  const insertRes = await pool.query(
    `INSERT INTO user_mt5_accounts (user_id, mt5_login, mt5_password, mt5_server, mt5_terminal_path, account_name, account_type, initial_balance, sync_days, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING *`,
    [userId, login, encPass, server, terminalPath, accountName, accountType, initialBalance, days]
  )
  const newAcc = insertRes.rows[0]
  const accId = Number(newAcc.id)

  await pool.query(
    `INSERT INTO user_mt5_connections (user_id, mt5_login, mt5_password, mt5_server, mt5_terminal_path, is_active, updated_at)
     VALUES ($1, $2, $3, $4, $5, true, NOW()) ON CONFLICT (user_id)
     DO UPDATE SET mt5_login = EXCLUDED.mt5_login, mt5_password = EXCLUDED.mt5_password, mt5_server = EXCLUDED.mt5_server, mt5_terminal_path = EXCLUDED.mt5_terminal_path, is_active = true, updated_at = NOW()`,
    [userId, login, encPass, server, terminalPath]
  )

  try {
    const { snapshot, analysis, tradeBook, balance, equity } = await collectAndCacheAccountSnapshot({ accountId: accId, userId, login, password, server, days, terminalPath })
    const pub = sanitizeMt5AccountPublic(newAcc)
    pub.currentBalance = balance; pub.currentEquity = equity
    pub.currency = snapshot?.account?.currency || 'USD'; pub.company = snapshot?.account?.company || ''
    pub.brokerName = snapshot?.account?.company || 'MetaQuotes'; pub.profit = Number(snapshot?.account?.profit || 0)
    pub.leverage = Number(snapshot?.account?.leverage || 0); pub.lastSyncAt = new Date().toISOString(); pub.lastSyncStatus = 'ok'
    triggerAutoMt5SyncSoon(100)
    return res.json({ ok: true, synced: true, account: pub, snapshot, analysis, tradeBook, totalDeals: snapshot?.historyDeals?.length || 0, totalPositions: snapshot?.openPositions?.length || 0 })
  } catch (syncErr) {
    const pub = sanitizeMt5AccountPublic(newAcc)
    pub.currentBalance = initialBalance; pub.currentEquity = initialBalance; pub.lastSyncStatus = 'error'; pub.lastSyncError = syncErr.message || 'Sync failed'
    await pool.query(`UPDATE user_mt5_accounts SET last_sync_status = 'error', last_sync_error = $1, updated_at = NOW() WHERE id = $2`, [String(syncErr.message || '').slice(0, 500), accId])
    return res.json({ ok: true, synced: false, syncError: syncErr.message || 'Connected but cannot sync MT5 data right now.', account: pub, message: 'MT5 account saved. Data sync will retry automatically.' })
  }
})

app.delete('/api/mt5/accounts/:id', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const accountId = Number(req.params.id)
  if (!accountId) return res.status(400).json({ message: 'Invalid account ID.' })
  const result = await pool.query(`DELETE FROM user_mt5_accounts WHERE id = $1 AND user_id = $2 RETURNING id`, [accountId, userId])
  if (!result.rows.length) return res.status(404).json({ message: 'Account not found.' })
  const remaining = await pool.query(`SELECT id FROM user_mt5_accounts WHERE user_id = $1 AND is_active = true`, [userId])
  if (!remaining.rows.length) {
    await pool.query(`DELETE FROM user_mt5_connections WHERE user_id = $1`, [userId])
    await pool.query(`DELETE FROM user_mt5_data_cache WHERE user_id = $1`, [userId])
  } else {
    const merged = await getMergedMt5Data(userId)
    if (merged) await pool.query(`INSERT INTO user_mt5_data_cache (user_id, data_json, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (user_id) DO UPDATE SET data_json = EXCLUDED.data_json, updated_at = NOW()`, [userId, JSON.stringify(merged)])
  }
  return res.json({ ok: true })
})

app.post('/api/mt5/accounts/:id/sync', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const accountId = Number(req.params.id)
  const days = Math.max(1, Math.min(365, Number(req.body?.days || 365)))
  if (!accountId) return res.status(400).json({ message: 'Invalid account ID.' })
  const accRes = await pool.query(`SELECT * FROM user_mt5_accounts WHERE id = $1 AND user_id = $2`, [accountId, userId])
  const account = accRes.rows[0]
  if (!account) return res.status(404).json({ message: 'Account not found.' })
  if (!account.is_active) return res.status(400).json({ message: 'Account is inactive.' })
  try {
    const password = decryptMt5Password(account.mt5_password)
    const { snapshot, analysis, tradeBook, balance, equity } = await collectAndCacheAccountSnapshot({ accountId, userId, login: account.mt5_login, password, server: account.mt5_server, days, terminalPath: account.mt5_terminal_path || '' })
    if (days !== Number(account.sync_days)) await pool.query(`UPDATE user_mt5_accounts SET sync_days = $1 WHERE id = $2`, [days, accountId])
    triggerAutoMt5SyncSoon(100)
    return res.json({ ok: true, snapshot, analysis, tradeBook, balance, equity, totalDeals: snapshot?.historyDeals?.length || 0, totalPositions: snapshot?.openPositions?.length || 0 })
  } catch (error) {
    await pool.query(`UPDATE user_mt5_accounts SET last_sync_status = 'error', last_sync_error = $1, updated_at = NOW() WHERE id = $2`, [String(error.message || '').slice(0, 500), accountId])
    return res.status(500).json({ message: error.message || 'Cannot sync MT5 data now.' })
  }
})

app.post('/api/mt5/accounts/sync-all', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const days = Math.max(1, Math.min(365, Number(req.body?.days || 365)))
  const accRes = await pool.query(`SELECT * FROM user_mt5_accounts WHERE user_id = $1 AND is_active = true ORDER BY created_at ASC`, [userId])
  if (!accRes.rows.length) return res.status(400).json({ message: 'No active MT5 accounts.' })
  const results = []
  for (const acc of accRes.rows) {
    try {
      const pw = decryptMt5Password(acc.mt5_password)
      const { snapshot, balance, equity } = await collectAndCacheAccountSnapshot({ accountId: Number(acc.id), userId, login: acc.mt5_login, password: pw, server: acc.mt5_server, days, terminalPath: acc.mt5_terminal_path || '' })
      results.push({ accountId: Number(acc.id), login: maskSecret(acc.mt5_login), ok: true, balance, equity, totalDeals: snapshot?.historyDeals?.length || 0 })
    } catch (err) {
      await pool.query(`UPDATE user_mt5_accounts SET last_sync_status = 'error', last_sync_error = $1, updated_at = NOW() WHERE id = $2`, [String(err.message || '').slice(0, 500), acc.id]).catch(() => {})
      results.push({ accountId: Number(acc.id), login: maskSecret(acc.mt5_login), ok: false, error: err.message || 'Sync failed' })
    }
  }
  triggerAutoMt5SyncSoon(100)
  return res.json({ ok: true, results })
})

app.get('/api/mt5/data/merged', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const subscription = await getUserSubscription(userId)
  const merged = await getMergedMt5Data(userId)
  if (!merged) return res.json({ hasData: false, updatedAt: null, analysis: null, accounts: [] })
  const tradeBook = buildTradeBook(merged)
  const analysis = buildTradeBehaviorAnalysis(tradeBook.trades, merged.account || {})
  const projectedAnalysis = projectAnalysisByPlan(analysis, subscription.planCode)
  const projectedTradeBook = projectTradeBookByPlan(tradeBook, subscription.planCode, analysis)
  return res.json({ hasData: true, updatedAt: merged.fetchedAt, plan: { code: subscription.planCode, isPro: subscription.isPro }, analysis: projectedAnalysis, tradeBook: projectedTradeBook, accounts: merged.accounts || [], snapshot: merged })
})

app.get('/api/trading/statement/status', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const cacheRes = await pool.query(
    `SELECT data_json, updated_at
     FROM user_mt5_data_cache
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  )
  const row = cacheRes.rows[0]
  if (!row) return res.json({ hasData: false, updatedAt: null, snapshot: null, analysis: null })
  const snapshot = row.data_json || {}
  const tradeBook = buildTradeBook(snapshot)
  const analysis = buildTradeBehaviorAnalysis(tradeBook.trades, snapshot.account || {})
  const deals = Array.isArray(snapshot.historyDeals) ? snapshot.historyDeals : []
  return res.json({
    hasData: true,
    updatedAt: row.updated_at,
    snapshot: {
      source: snapshot.source || '',
      fileName: snapshot.fileName || '',
      fetchedAt: snapshot.fetchedAt || null,
      account: snapshot.account || {},
      historyDeals: deals,
      summary: snapshot.summary || {}
    },
    analysis,
    tradeBook
  })
})

app.post('/api/trading/statement/import', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const fileName = String(req.body?.fileName || 'statement.csv').trim()
  const content = String(req.body?.content || '')
  if (!content) {
    return res.status(400).json({ message: 'Nội dung file rỗng. Vui lòng chọn statement CSV/TXT.' })
  }
  if (content.length > 8_000_000) {
    return res.status(400).json({ message: 'File quá lớn. Vui lòng giữ dưới 8MB.' })
  }
  try {
    const parsed = parseStatementContent(content)
    const tradeBook = buildTradeBook(parsed.deals)
    const analysis = buildTradeBehaviorAnalysis(tradeBook.trades, {})
    const payload = {
      source: 'statement-upload',
      fileName,
      fetchedAt: new Date().toISOString(),
      account: {},
      historyDeals: parsed.deals,
      summary: {
        totalDeals: analysis.totalDeals,
        winRate: analysis.winRate,
        netProfit: analysis.netProfit,
        profitFactor: analysis.profitFactor
      }
    }
    await pool.query(
      `INSERT INTO user_mt5_data_cache (user_id, data_json, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET data_json = EXCLUDED.data_json, updated_at = NOW()`,
      [userId, JSON.stringify(payload)]
    )
    await queueBehaviorProofs({ userId, analysis })
    return res.json({
      ok: true,
      importedDeals: parsed.deals.length,
      analysis,
      tradeBook,
      sample: parsed.deals.slice(0, 5)
    })
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Không parse được statement.' })
  }
})

app.get('/api/prop-accounts/:id/metrics', authRequired, async (req, res) => {
  try {
    const userId = req.auth.sub
    const accountId = req.params.id

    const accountRes = await pool.query(
      `SELECT * FROM trading_accounts WHERE id = $1 AND user_id = $2`,
      [accountId, userId]
    )
    if (!accountRes.rows.length) return res.status(404).json({ message: 'Account not found' })

    const tradesRes = await pool.query(
      `SELECT * FROM trades WHERE account_id = $1 ORDER BY entry_time ASC`,
      [accountId]
    )

    const metrics = calculatePropMetrics(accountRes.rows[0], tradesRes.rows)
    return res.json(metrics)
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

app.get('/api/prop-accounts/:id/analytics', authRequired, async (req, res) => {
  try {
    const userId = req.auth.sub
    const accountId = req.params.id

    const tradesRes = await pool.query(
      `SELECT * FROM trades WHERE account_id = $1 ORDER BY entry_time ASC`,
      [accountId]
    )

    const analytics = analyzeBehavior(tradesRes.rows)
    return res.json(analytics)
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

app.get('/api/trading/exness/analysis', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const subscription = await getUserSubscription(userId)
  const cacheRes = await pool.query(
    `SELECT data_json, updated_at
     FROM user_mt5_data_cache
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  )
  const row = cacheRes.rows[0]
  if (!row) return res.json({ hasData: false, updatedAt: null, analysis: null })
  const data = row.data_json || {}
  const tradeBook = buildTradeBook(data)
  const analysis = buildTradeBehaviorAnalysis(tradeBook.trades, data.account || {})
  const projectedAnalysis = projectAnalysisByPlan(analysis, subscription.planCode)
  const projectedTradeBook = projectTradeBookByPlan(tradeBook, subscription.planCode, analysis)
  const updatedAtMs = row.updated_at ? new Date(row.updated_at).getTime() : null
  const cacheAgeMs = updatedAtMs ? Math.max(0, Date.now() - updatedAtMs) : null

  return res.json({
    hasData: true,
    updatedAt: row.updated_at,
    cacheAgeMs,
    autoSync: buildMt5AutoSyncMeta(),
    plan: {
      code: subscription.planCode,
      isPro: subscription.isPro,
      analysisDepth: subscription.isPro ? 'pro' : 'summary'
    },
    analysis: projectedAnalysis,
    tradeBook: projectedTradeBook
  })
})

app.post('/api/trading/behavior/ai-chat', authRequired, aiRateLimiter, async (req, res) => {
  const userId = req.auth.sub
  const subscription = await getUserSubscription(userId)
  if (!subscription.isPro) {
    return res.status(403).json({
      message: 'AI Behavior Doctor is available on LuminaFox Pro.',
      upgradeRequired: true
    })
  }
  const message = sanitizeAiPrompt(req.body?.message)
  const tradeId = String(req.body?.tradeId || '').trim().slice(0, 120)
  if (!message) return res.status(400).json({ message: 'Message is required.' })
  const cache = await getUserTradeSnapshot(userId)
  if (!cache.hasData) return res.status(400).json({ message: 'No trading data available for AI analysis.' })
  const reply = buildBehaviorDoctorReply({ message, analysis: cache.analysis, tradeId })
  return res.json({
    ok: true,
    reply,
    plan: {
      code: subscription.planCode,
      isPro: subscription.isPro,
      analysisDepth: 'pro'
    }
  })
})

app.post('/api/trading/checklist/submit', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const pairSymbol = normalizeSymbol(req.body?.pairSymbol || req.body?.symbol)
  const direction = String(req.body?.direction || '').trim().toUpperCase()
  const entryPrice = toFiniteNumber(req.body?.entryPrice, 0)
  const slPrice = toFiniteNumber(req.body?.slPrice, 0)
  const tpPrice = toFiniteNumber(req.body?.tpPrice, 0)
  const riskPercent = toFiniteNumber(req.body?.riskPercent, 0)
  const rrRatio = toFiniteNumber(req.body?.rrRatio, 0)
  const emotionScore = clamp(toFiniteNumber(req.body?.emotionScore, 0))
  const planScore = clamp(toFiniteNumber(req.body?.planScore, 0))
  const totalScore = clamp(toFiniteNumber(req.body?.totalScore, Math.round((emotionScore + planScore) / 2)))
  const setupScore = clamp(toFiniteNumber(req.body?.setupScore, 0))
  const reasonScore = clamp(toFiniteNumber(req.body?.reasonScore, 0))
  const readyAccept = Boolean(req.body?.readyAccept)
  const violateDailyLoss = Boolean(req.body?.violateDailyLoss)
  const canTrade = Boolean(req.body?.canTrade)
  const cardanoTxHash = String(req.body?.cardanoTxHash || '').trim().slice(0, 255)
  const cardanoBlock = String(req.body?.cardanoBlock || '').trim().slice(0, 255)
  const cardanoTime = String(req.body?.cardanoTime || '').trim().slice(0, 255)

  if (!pairSymbol) return res.status(400).json({ message: 'Pair symbol is required.' })
  if (!['LONG', 'SHORT'].includes(direction)) return res.status(400).json({ message: 'Direction must be LONG or SHORT.' })
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) return res.status(400).json({ message: 'Entry price is required.' })
  if (!Number.isFinite(slPrice) || slPrice <= 0) return res.status(400).json({ message: 'SL price is required.' })
  if (!Number.isFinite(tpPrice) || tpPrice <= 0) return res.status(400).json({ message: 'TP price is required.' })

  const previousRes = await pool.query(
    `SELECT proof_hash, chain_index
     FROM user_trade_checklists
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  )
  const previousHash = String(previousRes.rows[0]?.proof_hash || '')
  const previousIndex = Number(previousRes.rows[0]?.chain_index || 0)
  const chainIndex = previousIndex + 1

  const tradeDate = dateKeyUTC(new Date())
  const payload = {
    userId,
    tradeDate,
    pairSymbol,
    direction,
    entryPrice,
    slPrice,
    tpPrice,
    riskPercent,
    rrRatio,
    emotionScore,
    planScore,
    totalScore,
    setupScore,
    reasonScore,
    readyAccept,
    violateDailyLoss,
    canTrade
  }
  const proofHash = crypto
    .createHash('sha256')
    .update(`${JSON.stringify(payload)}|${previousHash}|${chainIndex}`)
    .digest('hex')

  const result = await pool.query(
    `INSERT INTO user_trade_checklists
      (user_id, trade_date, pair_symbol, direction, entry_price, sl_price, tp_price, risk_percent, rr_ratio,
       emotion_score, plan_score, total_score, setup_score, reason_score, ready_accept, violate_daily_loss,
       can_trade, proof_hash, chain_prev_hash, chain_index, cardano_tx_hash, cardano_block, cardano_time, payload_json, created_at)
     VALUES
      ($1, $2::date, $3, $4, $5, $6, $7, $8, $9,
       $10, $11, $12, $13, $14, $15, $16,
       $17, $18, $19, $20, $21, $22, $23, $24::jsonb, NOW())
     RETURNING id, trade_date, total_score, can_trade, proof_hash, chain_index, created_at`,
    [
      userId,
      tradeDate,
      pairSymbol,
      direction,
      entryPrice,
      slPrice,
      tpPrice,
      riskPercent,
      rrRatio,
      emotionScore,
      planScore,
      totalScore,
      setupScore,
      reasonScore,
      readyAccept,
      violateDailyLoss,
      canTrade,
      proofHash,
      previousHash,
      chainIndex,
      cardanoTxHash,
      cardanoBlock,
      cardanoTime,
      JSON.stringify(payload)
    ]
  )
  const row = result.rows[0]
  const rankDelta = buildChecklistRankPointDelta({
    totalScore,
    emotionScore,
    planScore,
    rrRatio,
    riskPercent,
    canTrade,
    violateDailyLoss,
    readyAccept
  })
  const rankEvent = await appendRankPointEvent({
    userId,
    points: rankDelta.points,
    source: 'checklist_auto',
    reason: rankDelta.reason,
    meta: {
      checklistId: row.id,
      pairSymbol,
      direction,
      tradeDate,
      canTrade
    },
    createdBy: 'system-checklist'
  })
  const identity = await buildUserRankNftProfile({ userId, days: 30 })
  return res.json({
    ok: true,
    checklist: {
      id: row.id,
      tradeDate: row.trade_date,
      totalScore: row.total_score,
      canTrade: row.can_trade,
      proofHash: row.proof_hash,
      chainIndex: row.chain_index,
      createdAt: row.created_at
    },
    rank: identity.rank,
    rankEvent: rankEvent
      ? {
          id: rankEvent.id,
          points: rankEvent.points,
          source: rankEvent.source,
          reason: rankEvent.reason,
          createdAt: rankEvent.created_at
        }
      : null
  })
})

app.get('/api/trading/checklist/latest', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const limit = Math.max(1, Math.min(50, Number(req.query?.limit || 10)))
  const result = await pool.query(
    `SELECT id, trade_date, pair_symbol, direction, total_score, emotion_score, plan_score,
            rr_ratio, risk_percent, can_trade, proof_hash, chain_index, cardano_tx_hash, cardano_block, cardano_time, created_at
     FROM user_trade_checklists
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  )
  return res.json({
    latest: result.rows[0] || null,
    items: result.rows
  })
})

app.get('/api/trading/profile/nft', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const days = Math.max(7, Math.min(365, Number(req.query?.days || 30)))
  try {
    const cache = await getUserTradeSnapshot(userId)
    const identity = await buildUserRankNftProfile({
      userId,
      analysis: cache.analysis,
      days
    })
    return res.json({
      updatedAt: cache.updatedAt,
      rank: identity.rank,
      nft: identity.nft,
      checklist: identity.checklist,
      blockchain: identity.blockchain,
      analysis: {
        behaviorScore: Number(cache.analysis?.behaviorScore || 0),
        behaviorRiskScore: Number(cache.analysis?.behaviorRiskScore || 0),
        behaviorLabel: String(cache.analysis?.behaviorLabel || ''),
        disciplineRate: Number(cache.analysis?.disciplineRate || 0),
        winRate: Number(cache.analysis?.winRate || 0),
        profitFactor: Number(cache.analysis?.profitFactor || 0),
        rr: Number(cache.analysis?.rr || 0)
      }
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Cannot load NFT profile.' })
  }
})

app.post('/api/trading/profile/nft/mint', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const walletAddress = normalizeWalletAddress(req.body?.walletAddress)
  const rarity = String(req.body?.rarity || 'standard')
    .trim()
    .toLowerCase()
    .slice(0, 40)
  const displayName = String(req.body?.nftName || '').trim().slice(0, 120)
  const imageUrl = String(req.body?.nftImageUrl || '').trim().slice(0, 500)
  const metadata = req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {}
  const mintTx = String(req.body?.mintedTxHash || `0x${crypto.randomBytes(16).toString('hex')}`).trim().slice(0, 255)

  const userRes = await pool.query(
    `SELECT rank_points, rank_tier
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  )
  if (!userRes.rows.length) return res.status(404).json({ message: 'User not found' })
  const rankTier = rankTierByPoints(Number(userRes.rows[0].rank_points || 0)).key
  const tokenId = String(req.body?.tokenId || `LFX-${Date.now().toString(36).toUpperCase()}`).trim().slice(0, 120)
  const nftName = displayName || `LuminaFox ${rankTier.toUpperCase()}`
  const nftImageUrl = imageUrl || defaultNftImageByTier(rankTier)

  await pool.query(
    `INSERT INTO user_nft_profiles
      (user_id, nft_name, nft_image_url, wallet_address, chain, contract_address, token_id, rarity, metadata_json,
       minted_tx_hash, minted_at, is_active, updated_at)
     VALUES
      ($1, $2, $3, $4, 'cardano', $5, $6, $7, $8::jsonb, $9, NOW(), true, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       nft_name = EXCLUDED.nft_name,
       nft_image_url = EXCLUDED.nft_image_url,
       wallet_address = EXCLUDED.wallet_address,
       chain = EXCLUDED.chain,
       contract_address = EXCLUDED.contract_address,
       token_id = EXCLUDED.token_id,
       rarity = EXCLUDED.rarity,
       metadata_json = EXCLUDED.metadata_json,
       minted_tx_hash = EXCLUDED.minted_tx_hash,
       minted_at = NOW(),
       is_active = true,
       updated_at = NOW()`,
    [
      userId,
      nftName,
      nftImageUrl,
      walletAddress,
      String(process.env.NFT_CONTRACT_ADDRESS || 'addr1q9...5k2m7v').slice(0, 255),
      tokenId,
      rarity || 'standard',
      JSON.stringify(metadata),
      mintTx
    ]
  )
  await appendRankPointEvent({
    userId,
    points: 50,
    source: 'nft_mint',
    reason: `mint:${tokenId}`,
    meta: { tokenId, rarity, walletAddress: walletAddress || '' },
    createdBy: 'self'
  })
  const cache = await getUserTradeSnapshot(userId)
  const identity = await buildUserRankNftProfile({ userId, analysis: cache.analysis, days: 30 })
  return res.json({
    ok: true,
    nft: identity.nft,
    rank: identity.rank
  })
})

app.patch('/api/trading/profile/nft', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const walletAddress = normalizeWalletAddress(req.body?.walletAddress)
  const nftName = String(req.body?.nftName || '').trim().slice(0, 120)
  const nftImageUrl = String(req.body?.nftImageUrl || '').trim().slice(0, 500)
  const rarity = String(req.body?.rarity || 'standard')
    .trim()
    .toLowerCase()
    .slice(0, 40)
  const metadata = req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {}
  await pool.query(
    `INSERT INTO user_nft_profiles
      (user_id, nft_name, nft_image_url, wallet_address, chain, contract_address, token_id, rarity, metadata_json,
       minted_tx_hash, minted_at, is_active, updated_at)
     VALUES
      ($1, $2, $3, $4, 'cardano', $5, $6, $7, $8::jsonb, '', NULL, false, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       nft_name = COALESCE(NULLIF($2, ''), user_nft_profiles.nft_name),
       nft_image_url = COALESCE(NULLIF($3, ''), user_nft_profiles.nft_image_url),
       wallet_address = COALESCE(NULLIF($4, ''), user_nft_profiles.wallet_address),
       rarity = COALESCE(NULLIF($7, ''), user_nft_profiles.rarity),
       metadata_json = CASE
         WHEN $8::jsonb = '{}'::jsonb THEN user_nft_profiles.metadata_json
         ELSE $8::jsonb
       END,
       updated_at = NOW()`,
    [
      userId,
      nftName,
      nftImageUrl,
      walletAddress,
      String(process.env.NFT_CONTRACT_ADDRESS || 'addr1q9...5k2m7v').slice(0, 255),
      String(req.body?.tokenId || '').trim().slice(0, 120),
      rarity || 'standard',
      JSON.stringify(metadata)
    ]
  )
  const cache = await getUserTradeSnapshot(userId)
  const identity = await buildUserRankNftProfile({ userId, analysis: cache.analysis, days: 30 })
  return res.json({ ok: true, nft: identity.nft, rank: identity.rank })
})

app.get('/api/billing/plans', authRequired, async (_, res) => {
  return res.json({
    plans: PLAN_CATALOG.map((plan) => ({
      code: plan.code,
      name: plan.name,
      priceVnd: plan.priceVnd,
      durationDays: plan.durationDays,
      features: plan.features
    }))
  })
})

app.get('/api/billing/me', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const subscription = await getUserSubscription(userId)
  const latestOrderRes = await pool.query(
    `SELECT id, plan_code, amount_vnd, payment_method, status, qr_ref, note,
            payer_name, payer_phone, transfer_content, proof_image_url, proof_uploaded_at, proof_digest,
            auto_verified, auto_verified_at, review_note,
            provider_order_code, payment_link_id, checkout_url, payos_raw_json,
            created_at, paid_at, approved_at
     FROM billing_orders
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  )
  const latestOrder = latestOrderRes.rows[0] || null
  return res.json({
    subscription,
    latestOrder: latestOrder
      ? {
          id: Number(latestOrder.id),
          planCode: normalizePlanCode(latestOrder.plan_code, PRO_PLAN_CODE),
          amountVnd: Number(latestOrder.amount_vnd || 0),
          paymentMethod: String(latestOrder.payment_method || 'bank_qr'),
          status: String(latestOrder.status || 'pending'),
          qrRef: String(latestOrder.qr_ref || ''),
          note: String(latestOrder.note || ''),
          payerName: String(latestOrder.payer_name || ''),
          payerPhone: String(latestOrder.payer_phone || ''),
          transferContent: String(latestOrder.transfer_content || ''),
          proofImageUrl: String(latestOrder.proof_image_url || ''),
          proofDigest: String(latestOrder.proof_digest || ''),
          proofUploadedAt: latestOrder.proof_uploaded_at || null,
          autoVerified: Boolean(latestOrder.auto_verified),
          autoVerifiedAt: latestOrder.auto_verified_at || null,
          reviewNote: String(latestOrder.review_note || ''),
          providerOrderCode: String(latestOrder.provider_order_code || ''),
          paymentLinkId: String(latestOrder.payment_link_id || ''),
          checkoutUrl: String(latestOrder.checkout_url || ''),
          payosQrCode: String(latestOrder.payos_raw_json?.data?.qrCode || ''),
          createdAt: latestOrder.created_at || null,
          paidAt: latestOrder.paid_at || null,
          approvedAt: latestOrder.approved_at || null
        }
      : null
    ,
    paymentMeta: {
      qrImageUrl: PRO_UPGRADE_QR_IMAGE_URL,
      accountName: PRO_UPGRADE_QR_OWNER,
      accountPhone: PRO_UPGRADE_QR_PHONE,
      provider: PRO_UPGRADE_QR_BANK,
      priceVnd: PRO_PLAN_PRICE_VND,
      payosEnabled: PAYOS_ENABLED,
      autoVerifyEnabled: PRO_UPGRADE_AUTO_VERIFY_ENABLED
    }
  })
})

app.post('/api/billing/upgrade-intent', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const user = await findUserById(userId)
  if (!user) return res.status(404).json({ message: 'User not found.' })
  const subscription = await getUserSubscription(userId, user)
  if (subscription.isPro) {
    return res.json({
      alreadyActive: true,
      subscription,
      payment: {
        priceVnd: PRO_PLAN_PRICE_VND,
        payosEnabled: PAYOS_ENABLED,
        instruction: 'Tai khoan cua ban da duoc kich hoat Premium.'
      }
    })
  }
  const requestedPlan = normalizePlanCode(req.body?.planCode, PRO_PLAN_CODE)
  if (requestedPlan !== PRO_PLAN_CODE) {
    return res.status(400).json({ message: 'Only Pro upgrade is available for paid subscription.' })
  }
  const plan = planDefByCode(requestedPlan)
  const qrRef = buildUpgradeQrRef({ userId })
  const note = String(req.body?.note || '').trim().slice(0, 500)
  const paymentMethod = PAYOS_ENABLED ? 'payos' : 'bank_qr'
  const orderRes = await pool.query(
    `INSERT INTO billing_orders
      (user_id, plan_code, amount_vnd, payment_method, status, qr_ref, note, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'pending', $5, $6, NOW(), NOW())
     RETURNING id, plan_code, amount_vnd, payment_method, status, qr_ref, note, created_at`,
    [userId, requestedPlan, plan.priceVnd, paymentMethod, qrRef, note]
  )
  let order = orderRes.rows[0]
  let payosPayment = null
  let payosError = ''
  if (PAYOS_ENABLED) {
    try {
      payosPayment = await createPayosPaymentLink({ order, qrRef, plan })
      const updateRes = await pool.query(
        `UPDATE billing_orders
         SET provider_order_code = $2,
             payment_link_id = $3,
             checkout_url = $4,
             payos_raw_json = $5::jsonb,
             transfer_content = $6,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, plan_code, amount_vnd, payment_method, status, qr_ref, note,
                   provider_order_code, payment_link_id, checkout_url, payos_raw_json, created_at`,
        [
          order.id,
          payosPayment.providerOrderCode,
          payosPayment.paymentLinkId,
          payosPayment.checkoutUrl,
          JSON.stringify(payosPayment.raw || {}),
          payosPayment.description || qrRef
        ]
      )
      order = updateRes.rows[0] || order
    } catch (error) {
      payosError = String(error?.message || error || 'PayOS create payment link failed').slice(0, 400)
      const updateRes = await pool.query(
        `UPDATE billing_orders
         SET payment_method = 'bank_qr',
             review_note = $2,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, plan_code, amount_vnd, payment_method, status, qr_ref, note, created_at`,
        [order.id, `PAYOS_FALLBACK ${payosError}`]
      )
      order = updateRes.rows[0] || order
    }
  }
  return res.json({
    order: {
      id: Number(order.id),
      planCode: normalizePlanCode(order.plan_code, PRO_PLAN_CODE),
      amountVnd: Number(order.amount_vnd || 0),
      paymentMethod: String(order.payment_method || 'bank_qr'),
      status: String(order.status || 'pending'),
      qrRef: String(order.qr_ref || ''),
      note: String(order.note || ''),
      providerOrderCode: String(order.provider_order_code || ''),
      paymentLinkId: String(order.payment_link_id || ''),
      checkoutUrl: String(order.checkout_url || ''),
      createdAt: order.created_at
    },
    payment: {
      priceVnd: plan.priceVnd,
      qrRef,
      transferContentHint: qrRef,
      qrImageUrl: PRO_UPGRADE_QR_IMAGE_URL,
      accountName: PRO_UPGRADE_QR_OWNER,
      accountPhone: PRO_UPGRADE_QR_PHONE,
      provider: PRO_UPGRADE_QR_BANK,
      payosEnabled: PAYOS_ENABLED,
      payosCheckoutUrl: payosPayment?.checkoutUrl || '',
      payosQrCode: payosPayment?.qrCode || '',
      payosError,
      autoVerifyEnabled: PRO_UPGRADE_AUTO_VERIFY_ENABLED,
      instruction:
        payosPayment?.checkoutUrl
          ? 'Mo link PayOS de thanh toan 149K. He thong se tu kich hoat khi PayOS webhook bao thanh cong.'
          : 'Chuyen khoan dung noi dung ma don hang de he thong doi soat tu dong. Neu khong du dieu kien, admin se duyet tay.'
    }
  })
})

app.post('/api/billing/orders/:id/mark-paid', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const orderId = Number(req.params.id)
  const payerName = normalizePayerName(req.body?.payerName || '')
  const payerPhone = normalizePayerPhone(req.body?.payerPhone || '')
  const transferContent = normalizeTransferContent(req.body?.transferContent || '')
  const proofImageUrl = normalizeProofImageDataUrl(req.body?.proofImageUrl || '')
  if (!orderId) return res.status(400).json({ message: 'Invalid order id.' })
  const currentRes = await pool.query(
    `SELECT id, plan_code, amount_vnd, status, qr_ref, proof_image_url, proof_digest
     FROM billing_orders
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [orderId, userId]
  )
  const current = currentRes.rows[0]
  if (!current) return res.status(404).json({ message: 'Order not found.' })
  if (String(current.status) === 'paid') return res.json({ ok: true, status: 'paid' })
  const finalProof = proofImageUrl || String(current.proof_image_url || '')
  const finalDigest = computePaymentProofDigest(finalProof) || String(current.proof_digest || '')
  if (!finalProof) {
    return res.status(400).json({ message: 'Proof image is required before submitting payment confirmation.' })
  }
  if (!finalDigest) {
    return res.status(400).json({ message: 'Invalid proof image payload.' })
  }

  const duplicateRes = await pool.query(
    `SELECT id, user_id
     FROM billing_orders
     WHERE id <> $1
       AND proof_digest = $2
       AND status = 'paid'
     LIMIT 1`,
    [orderId, finalDigest]
  )
  const duplicateProofUsed = Boolean(duplicateRes.rows[0])
  const autoCheck = evaluateUpgradeAutoApproval({
    order: current,
    proofImageUrl: finalProof,
    payerName,
    payerPhone,
    transferContent,
    duplicateProofUsed
  })

  const nextStatus = autoCheck.autoApproved ? 'paid' : 'waiting_admin'
  const reviewNote = autoCheck.autoApproved
    ? `AUTO_VERIFIED score=${autoCheck.confidence} (${autoCheck.reasons.join(',')})`
    : `MANUAL_REVIEW score=${autoCheck.confidence} (${autoCheck.reasons.join(',')})`

  await pool.query(
    `UPDATE billing_orders
     SET status = $6,
         payer_name = CASE WHEN $3 = '' THEN payer_name ELSE $3 END,
         payer_phone = CASE WHEN $4 = '' THEN payer_phone ELSE $4 END,
         transfer_content = CASE WHEN $7 = '' THEN transfer_content ELSE $7 END,
         proof_image_url = CASE WHEN $5 = '' THEN proof_image_url ELSE $5 END,
         proof_uploaded_at = CASE WHEN $5 = '' THEN proof_uploaded_at ELSE NOW() END,
         proof_digest = CASE WHEN $8 = '' THEN proof_digest ELSE $8 END,
         auto_verified = $9,
         auto_verified_at = CASE WHEN $9 = true THEN NOW() ELSE auto_verified_at END,
         review_note = $10,
         paid_at = CASE WHEN $6 = 'paid' THEN COALESCE(paid_at, NOW()) ELSE paid_at END,
         approved_at = CASE WHEN $6 = 'paid' THEN COALESCE(approved_at, NOW()) ELSE approved_at END,
         updated_at = NOW()
     WHERE id = $1 AND user_id = $2`,
    [orderId, userId, payerName, payerPhone, finalProof, nextStatus, transferContent, finalDigest, autoCheck.autoApproved, reviewNote]
  )

  if (autoCheck.autoApproved) {
    const planCode = normalizePlanCode(current.plan_code, PRO_PLAN_CODE)
    const plan = planDefByCode(planCode)
    await activateUserSubscription(userId, planCode, Math.max(1, Number(plan.durationDays || 30)))
  }

  return res.json({
    ok: true,
    status: nextStatus,
    autoVerified: autoCheck.autoApproved,
    confidence: autoCheck.confidence,
    reviewNote
  })
})

app.post('/api/billing/payos/webhook', async (req, res) => {
  if (!PAYOS_ENABLED) {
    return res.status(503).json({ success: false, message: 'PayOS is not configured.' })
  }
  const payload = req.body || {}
  const data = payload.data || {}
  const signature = String(payload.signature || '')
  if (!verifyPayosSignature(data, signature)) {
    return res.status(400).json({ success: false, message: 'Invalid PayOS webhook signature.' })
  }

  const providerOrderCode = String(data.orderCode || data.order_code || '').trim()
  const paymentLinkId = String(data.paymentLinkId || data.payment_link_id || '').trim()
  const providerStatus = String(data.status || data.code || payload.code || '').trim().toUpperCase()
  const successFlag = payload.success === true || ['PAID', 'SUCCESS', '00'].includes(providerStatus)
  const paidAmount = Number(data.amountPaid || data.amount || data.totalAmount || 0)

  if (!providerOrderCode && !paymentLinkId) {
    return res.status(400).json({ success: false, message: 'Missing PayOS order code.' })
  }

  const params = []
  const clauses = []
  if (providerOrderCode) {
    params.push(providerOrderCode)
    clauses.push(`provider_order_code = $${params.length}`)
    if (/^\d+$/.test(providerOrderCode)) {
      params.push(Number(providerOrderCode))
      clauses.push(`id = $${params.length}`)
    }
  }
  if (paymentLinkId) {
    params.push(paymentLinkId)
    clauses.push(`payment_link_id = $${params.length}`)
  }

  const orderRes = await pool.query(
    `SELECT id, user_id, plan_code, amount_vnd, status
     FROM billing_orders
     WHERE ${clauses.join(' OR ')}
     ORDER BY created_at DESC
     LIMIT 1`,
    params
  )
  const order = orderRes.rows[0]
  if (!order) {
    return res.status(404).json({ success: false, message: 'Billing order not found.' })
  }

  const amountOk = paidAmount <= 0 || paidAmount >= Number(order.amount_vnd || 0)
  const shouldActivate = successFlag && amountOk
  const nextStatus = shouldActivate ? 'paid' : String(order.status || 'pending')
  const reviewNote = shouldActivate
    ? `PAYOS_PAID orderCode=${providerOrderCode || paymentLinkId}`
    : `PAYOS_EVENT status=${providerStatus || 'unknown'} amount=${paidAmount || 0}`

  await pool.query(
    `UPDATE billing_orders
     SET status = $2,
         provider_order_code = CASE WHEN $3 = '' THEN provider_order_code ELSE $3 END,
         payment_link_id = CASE WHEN $4 = '' THEN payment_link_id ELSE $4 END,
         payos_raw_json = $5::jsonb,
         review_note = $6,
         paid_at = CASE WHEN $2 = 'paid' THEN COALESCE(paid_at, NOW()) ELSE paid_at END,
         approved_at = CASE WHEN $2 = 'paid' THEN COALESCE(approved_at, NOW()) ELSE approved_at END,
         updated_at = NOW()
     WHERE id = $1`,
    [order.id, nextStatus, providerOrderCode, paymentLinkId, JSON.stringify(payload), reviewNote]
  )

  if (shouldActivate) {
    const planCode = normalizePlanCode(order.plan_code, PRO_PLAN_CODE)
    const plan = planDefByCode(planCode)
    await activateUserSubscription(order.user_id, planCode, Math.max(1, Number(plan.durationDays || 30)))
  }

  return res.json({ success: true, status: nextStatus })
})

app.get('/api/admin/billing/orders', authRequired, adminRequired, async (req, res) => {
  const status = String(req.query?.status || 'all').trim().toLowerCase()
  const limit = Math.max(10, Math.min(500, Number(req.query?.limit || 120)))
  const clauses = []
  const params = []
  if (status && status !== 'all') {
    params.push(status)
    clauses.push(`o.status = $${params.length}`)
  }
  params.push(limit)
  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const result = await pool.query(
    `SELECT
      o.id,
      o.user_id,
      o.plan_code,
      o.amount_vnd,
      o.payment_method,
      o.status,
      o.qr_ref,
      o.note,
      o.payer_name,
      o.payer_phone,
      o.transfer_content,
      o.proof_image_url,
      o.proof_digest,
      o.proof_uploaded_at,
      o.auto_verified,
      o.auto_verified_at,
      o.review_note,
      o.provider_order_code,
      o.payment_link_id,
      o.checkout_url,
      o.created_at,
      o.paid_at,
      o.approved_at,
      u.name AS user_name,
      u.email AS user_email
     FROM billing_orders o
     JOIN users u ON u.id = o.user_id
     ${whereSql}
     ORDER BY o.created_at DESC
     LIMIT $${params.length}`,
    params
  )
  return res.json({
    orders: result.rows.map((row) => ({
      id: Number(row.id),
      userId: String(row.user_id),
      userName: String(row.user_name || 'User'),
      userEmail: String(row.user_email || ''),
      planCode: normalizePlanCode(row.plan_code, PRO_PLAN_CODE),
      amountVnd: Number(row.amount_vnd || 0),
      paymentMethod: String(row.payment_method || 'bank_qr'),
      status: String(row.status || 'pending'),
      qrRefMasked: maskOrderCode(row.qr_ref),
      note: String(row.note || ''),
      payerName: String(row.payer_name || ''),
      payerPhone: String(row.payer_phone || ''),
      transferContent: String(row.transfer_content || ''),
      proofImageUrl: String(row.proof_image_url || ''),
      proofDigest: String(row.proof_digest || ''),
      proofUploadedAt: row.proof_uploaded_at || null,
      autoVerified: Boolean(row.auto_verified),
      autoVerifiedAt: row.auto_verified_at || null,
      reviewNote: String(row.review_note || ''),
      providerOrderCode: String(row.provider_order_code || ''),
      paymentLinkId: String(row.payment_link_id || ''),
      checkoutUrl: String(row.checkout_url || ''),
      createdAt: row.created_at || null,
      paidAt: row.paid_at || null,
      approvedAt: row.approved_at || null
    }))
  })
})

app.patch('/api/admin/billing/orders/:id/status', authRequired, adminRequired, async (req, res) => {
  const orderId = Number(req.params.id)
  const status = String(req.body?.status || '').trim().toLowerCase()
  const reviewNote = String(req.body?.reviewNote || '')
    .trim()
    .slice(0, 500)
  const allowed = new Set(['pending', 'waiting_admin', 'paid', 'rejected', 'cancelled'])
  if (!orderId || !allowed.has(status)) {
    return res.status(400).json({ message: 'Invalid order status update payload.' })
  }
  const findRes = await pool.query(
    `SELECT id, user_id, plan_code, amount_vnd, status
     FROM billing_orders
     WHERE id = $1
     LIMIT 1`,
    [orderId]
  )
  const order = findRes.rows[0]
  if (!order) return res.status(404).json({ message: 'Order not found.' })

  await pool.query(
    `UPDATE billing_orders
     SET status = $1,
         review_note = $4,
         paid_at = CASE WHEN $1 = 'paid' THEN COALESCE(paid_at, NOW()) ELSE paid_at END,
         approved_by = CASE WHEN $1 = 'paid' THEN $2 ELSE approved_by END,
         approved_at = CASE WHEN $1 = 'paid' THEN COALESCE(approved_at, NOW()) ELSE approved_at END,
         updated_at = NOW()
     WHERE id = $3`,
    [status, req.me?.id || null, orderId, reviewNote]
  )

  if (status === 'paid') {
    const planCode = normalizePlanCode(order.plan_code, PRO_PLAN_CODE)
    const plan = planDefByCode(planCode)
    const durationDays = Math.max(1, Number(plan.durationDays || 30))
    await activateUserSubscription(order.user_id, planCode, durationDays)
  }
  if (status === 'rejected' || status === 'cancelled') {
    await ensureUserSubscription(order.user_id)
    await pool.query(
      `UPDATE user_subscriptions
       SET plan_code = 'free',
           status = 'inactive',
           expires_at = NULL,
           updated_at = NOW()
       WHERE user_id = $1
         AND NOT EXISTS (
           SELECT 1
           FROM billing_orders
           WHERE user_id = $1
             AND status = 'paid'
         )`,
      [order.user_id]
    )
  }

  const subscription = await getUserSubscription(order.user_id)
  return res.json({
    ok: true,
    status,
    userId: order.user_id,
    planCode: normalizePlanCode(order.plan_code, PRO_PLAN_CODE),
    subscription
  })
})

app.get('/api/admin/billing/summary', authRequired, adminRequired, async (req, res) => {
  const days = Math.max(7, Math.min(365, Number(req.query?.days || 30)))
  const summaryRes = await pool.query(
    `SELECT
      COALESCE(SUM(amount_vnd) FILTER (WHERE status = 'paid' AND created_at >= NOW() - ($1 || ' days')::interval), 0) AS revenue_period,
      COALESCE(SUM(amount_vnd) FILTER (WHERE status = 'paid'), 0) AS revenue_total,
      COUNT(*) FILTER (WHERE status IN ('pending', 'waiting_admin')) AS pending_orders,
      COUNT(*) FILTER (WHERE status = 'paid') AS paid_orders,
      COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_orders
     FROM billing_orders`,
    [String(days)]
  )
  const activeProRes = await pool.query(
    `SELECT COUNT(*)::int AS c
     FROM user_subscriptions sub
     JOIN users u ON u.id = sub.user_id
     WHERE sub.plan_code = $1
       AND sub.status = 'active'
       AND (sub.expires_at IS NULL OR sub.expires_at > NOW())
       AND (
         u.role = 'admin'
         OR EXISTS (
           SELECT 1
           FROM billing_orders o
           WHERE o.user_id = sub.user_id
             AND o.status = 'paid'
         )
       )`,
    [PRO_PLAN_CODE]
  )
  const row = summaryRes.rows[0] || {}
  return res.json({
    days,
    revenuePeriodVnd: Number(row.revenue_period || 0),
    revenueTotalVnd: Number(row.revenue_total || 0),
    pendingOrders: Number(row.pending_orders || 0),
    paidOrders: Number(row.paid_orders || 0),
    rejectedOrders: Number(row.rejected_orders || 0),
    activeProUsers: Number(activeProRes.rows[0]?.c || 0)
  })
})

app.get('/api/trading/leaderboard', authRequired, async (req, res) => {
  const days = Math.max(7, Math.min(365, Number(req.query?.days || 30)))
  const limit = Math.max(5, Math.min(200, Number(req.query?.limit || 50)))
  try {
    const payload = await buildLeaderboardPayload({ days, limit })
    const myIndex = payload.rows.findIndex((row) => String(row.userId) === String(req.auth.sub))
    return res.json({
      ...payload,
      myPosition: myIndex >= 0 ? payload.rows[myIndex].position : null
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Cannot load leaderboard.' })
  }
})

app.get('/api/trading/performance/history', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const view = String(req.query?.view || 'daily').trim().toLowerCase()
  const anchorDate = dateKeyUTC(req.query?.anchorDate || req.query?.date) || dateKeyUTC(new Date())

  let startDate = anchorDate
  let endDate = anchorDate
  if (view === 'weekly') {
    const range = getWeekRangeUTC(anchorDate)
    startDate = range.startDate
    endDate = range.endDate
  } else if (view === 'monthly') {
    const range = getMonthRangeUTC(anchorDate)
    startDate = range.startDate
    endDate = range.endDate
  }

  const [cache, checklistRes, reportRes] = await Promise.all([
    getUserTradeSnapshot(userId),
    pool.query(
      `SELECT trade_date, total_score, emotion_score, plan_score, rr_ratio, can_trade, created_at
       FROM user_trade_checklists
       WHERE user_id = $1
         AND trade_date BETWEEN $2::date AND $3::date
       ORDER BY created_at DESC`,
      [userId, startDate, endDate]
    ),
    pool.query(
      `SELECT report_month, status, sent_at
       FROM user_monthly_report_logs
       WHERE user_id = $1
       ORDER BY report_month DESC
       LIMIT 1`,
      [userId]
    )
  ])

  const payload = buildPerformanceHistoryPayload({
    tradeBook: cache.tradeBook,
    checklistRows: checklistRes.rows,
    view,
    anchorDate
  })

  return res.json({
    hasData: cache.hasData,
    updatedAt: cache.updatedAt,
    analysis: cache.analysis,
    history: payload,
    reports: {
      latestMonth: reportRes.rows[0]?.report_month || null,
      latestStatus: reportRes.rows[0]?.status || null,
      latestSentAt: reportRes.rows[0]?.sent_at || null
    }
  })
})

app.get('/api/trading/reports/monthly/logs', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const limit = Math.max(1, Math.min(24, Number(req.query?.limit || 12)))
  const result = await pool.query(
    `SELECT report_month, period_start, period_end, net_profit, total_trades, win_rate,
            avg_behavior_score, mood_alert_count, status, sent_at
     FROM user_monthly_report_logs
     WHERE user_id = $1
     ORDER BY report_month DESC
     LIMIT $2`,
    [userId, limit]
  )
  return res.json({
    logs: result.rows.map((row) => ({
      reportMonth: row.report_month,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      netProfit: Number(row.net_profit || 0),
      totalTrades: Number(row.total_trades || 0),
      winRate: Number(row.win_rate || 0),
      avgBehaviorScore: Number(row.avg_behavior_score || 0),
      moodAlertCount: Number(row.mood_alert_count || 0),
      status: row.status,
      sentAt: row.sent_at
    }))
  })
})

app.get('/api/trading/reports/monthly/preview', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const monthInfo = resolveReportMonth(req.query?.month, 1)
  const cache = await getUserTradeSnapshot(userId)
  const checklistRes = await pool.query(
    `SELECT total_score, emotion_score, plan_score, rr_ratio, can_trade
     FROM user_trade_checklists
     WHERE user_id = $1
       AND trade_date BETWEEN $2::date AND $3::date
     ORDER BY created_at DESC`,
    [userId, monthInfo.startDate, monthInfo.endDate]
  )
  const history = buildPerformanceHistoryPayload({
    tradeBook: cache.tradeBook,
    checklistRows: checklistRes.rows,
    view: 'monthly',
    anchorDate: monthInfo.startDate
  })
  const reportRes = await pool.query(
    `SELECT report_month, status, sent_at
     FROM user_monthly_report_logs
     WHERE user_id = $1
       AND report_month = $2::date
     LIMIT 1`,
    [userId, monthInfo.reportMonthDate]
  )
  return res.json({
    month: monthInfo.monthKey,
    label: monthInfo.label,
    summary: history.summary,
    behavior: history.behavior,
    reportStatus: reportRes.rows[0] || null
  })
})

app.post('/api/trading/reports/monthly/send', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const month = String(req.body?.month || '').trim()
  const force = req.body?.force === true
  try {
    const payload = await sendMonthlyReportForUser({
      userId,
      monthInput: month,
      force,
      requestedBy: 'user'
    })
    return res.json(payload)
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Cannot send monthly report now.' })
  }
})

app.get('/api/trading/products', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const result = await pool.query(
    `SELECT id, symbol, is_custom, created_by
     FROM trade_products
     ORDER BY is_custom ASC, symbol ASC`
  )
  return res.json({
    products: result.rows.map((row) => ({
      id: row.id,
      symbol: row.symbol,
      isCustom: row.is_custom,
      mine: row.created_by === userId
    }))
  })
})

app.post('/api/trading/products/custom', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const symbol = normalizeSymbol(req.body?.symbol)
  if (!symbol || !/^[A-Z0-9._:/-]{2,30}$/.test(symbol)) {
    return res.status(400).json({ message: 'Symbol khong hop le (2-30 ky tu: A-Z, 0-9, . _ : / -).' })
  }
  const insertRes = await pool.query(
    `INSERT INTO trade_products (symbol, is_custom, created_by)
     VALUES ($1, true, $2)
     ON CONFLICT (symbol) DO NOTHING
     RETURNING id, symbol, is_custom, created_by`,
    [symbol, userId]
  )
  const row =
    insertRes.rows[0] ||
    (
      await pool.query(
        `SELECT id, symbol, is_custom, created_by
         FROM trade_products
         WHERE symbol = $1
         LIMIT 1`,
        [symbol]
      )
    ).rows[0]
  return res.json({
    product: {
      id: row.id,
      symbol: row.symbol,
      isCustom: row.is_custom,
      mine: row.created_by === userId
    }
  })
})

app.get('/api/trading/precheck/today', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const result = await pool.query(
    `SELECT reason_option, mood_option, product_symbol, note, updated_at
     FROM user_trade_precheck
     WHERE user_id = $1 AND trade_date = CURRENT_DATE
     LIMIT 1`,
    [userId]
  )
  const row = result.rows[0]
  return res.json({
    completed: Boolean(row),
    precheck: row
      ? {
          reasonOption: row.reason_option,
          moodOption: row.mood_option,
          productSymbol: row.product_symbol,
          note: row.note || '',
          updatedAt: row.updated_at
        }
      : null
  })
})

app.post('/api/trading/precheck', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const reasonOption = String(req.body?.reasonOption || '').trim()
  const moodOption = String(req.body?.moodOption || '').trim()
  const productSymbol = normalizeSymbol(req.body?.productSymbol)
  const note = String(req.body?.note || '').trim().slice(0, 500)

  if (!TRADE_REASON_OPTIONS.includes(reasonOption)) {
    return res.status(400).json({ message: 'Ly do vao lenh khong hop le.' })
  }
  if (!TRADE_MOOD_OPTIONS.includes(moodOption)) {
    return res.status(400).json({ message: 'Tam trang khong hop le.' })
  }
  if (!productSymbol) return res.status(400).json({ message: 'Vui long chon san pham trade.' })

  const productRes = await pool.query(`SELECT symbol FROM trade_products WHERE symbol = $1 LIMIT 1`, [productSymbol])
  if (!productRes.rows.length) {
    await pool.query(
      `INSERT INTO trade_products (symbol, is_custom, created_by)
       VALUES ($1, true, $2)
       ON CONFLICT (symbol) DO NOTHING`,
      [productSymbol, userId]
    )
  }

  await pool.query(
    `INSERT INTO user_trade_precheck
      (user_id, trade_date, reason_option, mood_option, product_symbol, note, updated_at)
     VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, NOW())
     ON CONFLICT (user_id, trade_date)
     DO UPDATE SET reason_option = EXCLUDED.reason_option,
                   mood_option = EXCLUDED.mood_option,
                   product_symbol = EXCLUDED.product_symbol,
                   note = EXCLUDED.note,
                   updated_at = NOW()`,
    [userId, reasonOption, moodOption, productSymbol, note]
  )

  return res.json({
    completed: true,
    warning: reasonOption === 'early_entry_high_risk',
    precheck: {
      reasonOption,
      moodOption,
      productSymbol,
      note
    }
  })
})

app.get('/api/trading/connections', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const result = await pool.query(
    `SELECT provider, api_key, api_secret, api_passphrase, is_active, updated_at
     FROM user_trade_connections
     WHERE user_id = $1`,
    [userId]
  )
  const byProvider = new Map(result.rows.map((row) => [row.provider, row]))
  const activeProvider = result.rows.find((row) => row.is_active && row.api_key && row.api_secret)?.provider || null
  return res.json({
    activeProvider,
    connections: TRADE_CONNECTORS.map((provider) => {
      const row = byProvider.get(provider)
      return {
        provider,
        connected: Boolean(row?.is_active && row?.api_key && row?.api_secret),
        hasPassphrase: Boolean(row?.api_passphrase),
        apiKeyMask: row?.api_key ? maskSecret(row.api_key) : '',
        apiSecretMask: row?.api_secret ? maskSecret(row.api_secret) : '',
        updatedAt: row?.updated_at || null
      }
    })
  })
})

app.post('/api/trading/connections', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const provider = String(req.body?.provider || '').trim().toLowerCase()
  const apiKey = String(req.body?.apiKey || '').trim()
  const apiSecret = String(req.body?.apiSecret || '').trim()
  const apiPassphrase = String(req.body?.apiPassphrase || '').trim()
  const isActive = req.body?.isActive === false ? false : true

  if (!TRADE_CONNECTORS.includes(provider)) {
    return res.status(400).json({ message: 'Provider khong duoc ho tro.' })
  }
  if (!apiKey || !apiSecret) {
    return res.status(400).json({ message: 'API key va API secret la bat buoc.' })
  }

  await pool.query(`UPDATE user_trade_connections SET is_active = false, updated_at = NOW() WHERE user_id = $1`, [userId])

  await pool.query(
    `INSERT INTO user_trade_connections
      (user_id, provider, api_key, api_secret, api_passphrase, is_active, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (user_id, provider)
     DO UPDATE SET api_key = EXCLUDED.api_key,
                   api_secret = EXCLUDED.api_secret,
                   api_passphrase = EXCLUDED.api_passphrase,
                   is_active = EXCLUDED.is_active,
                   updated_at = NOW()`,
    [userId, provider, apiKey, apiSecret, apiPassphrase, isActive]
  )

  return res.json({
    connection: {
      provider,
      connected: Boolean(isActive),
      hasPassphrase: Boolean(apiPassphrase),
      apiKeyMask: maskSecret(apiKey),
      apiSecretMask: maskSecret(apiSecret)
    }
  })
})

app.delete('/api/trading/connections/:provider', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const provider = String(req.params.provider || '').trim().toLowerCase()
  if (!TRADE_CONNECTORS.includes(provider)) {
    return res.status(400).json({ message: 'Provider khong duoc ho tro.' })
  }

  await pool.query(
    `UPDATE user_trade_connections
     SET api_key = '', api_secret = '', api_passphrase = '', is_active = false, updated_at = NOW()
     WHERE user_id = $1 AND provider = $2`,
    [userId, provider]
  )
  return res.json({ ok: true })
})

app.get('/api/trading/demo-wallet', authRequired, async (req, res) => {
  const userId = req.auth.sub
  await pool.query(
    `INSERT INTO user_demo_wallets (user_id, balance, updated_at)
     VALUES ($1, 10000, NOW())
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  )
  const walletRes = await pool.query(
    `SELECT balance, updated_at FROM user_demo_wallets WHERE user_id = $1 LIMIT 1`,
    [userId]
  )
  const row = walletRes.rows[0]
  return res.json({
    balance: Number(row?.balance || 0),
    updatedAt: row?.updated_at || null
  })
})

app.post('/api/trading/demo-wallet/deposit', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const amount = Number(req.body?.amount || 0)
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: 'So tien nap phai > 0.' })
  }
  await pool.query(
    `INSERT INTO user_demo_wallets (user_id, balance, updated_at)
     VALUES ($1, 10000, NOW())
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  )
  const result = await pool.query(
    `UPDATE user_demo_wallets
     SET balance = balance + $1, updated_at = NOW()
     WHERE user_id = $2
     RETURNING balance, updated_at`,
    [amount, userId]
  )
  return res.json({
    balance: Number(result.rows[0].balance),
    updatedAt: result.rows[0].updated_at
  })
})

app.post('/api/trading/demo-wallet/withdraw', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const amount = Number(req.body?.amount || 0)
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: 'So tien rut phai > 0.' })
  }
  await pool.query(
    `INSERT INTO user_demo_wallets (user_id, balance, updated_at)
     VALUES ($1, 10000, NOW())
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  )
  const walletRes = await pool.query(`SELECT balance FROM user_demo_wallets WHERE user_id = $1 LIMIT 1`, [userId])
  const balance = Number(walletRes.rows[0]?.balance || 0)
  if (amount > balance) return res.status(400).json({ message: 'So du vi demo khong du.' })

  const result = await pool.query(
    `UPDATE user_demo_wallets
     SET balance = balance - $1, updated_at = NOW()
     WHERE user_id = $2
     RETURNING balance, updated_at`,
    [amount, userId]
  )
  return res.json({
    balance: Number(result.rows[0].balance),
    updatedAt: result.rows[0].updated_at
  })
})

async function ensureDefaultJournalAccount(userId) {
  const existing = await pool.query(
    `SELECT id, name, broker, market, currency, is_active, created_at, updated_at
     FROM trading_journal_accounts
     WHERE user_id = $1
     ORDER BY created_at ASC
     LIMIT 1`,
    [userId]
  )
  if (existing.rows[0]) return mapJournalAccount(existing.rows[0])
  const created = await pool.query(
    `INSERT INTO trading_journal_accounts (user_id, name, broker, market, currency)
     VALUES ($1, 'Main Journal Account', 'Manual', 'multi', 'USD')
     RETURNING id, name, broker, market, currency, is_active, created_at, updated_at`,
    [userId]
  )
  return mapJournalAccount(created.rows[0])
}

async function assertJournalAccountOwner(userId, accountId) {
  const result = await pool.query(
    `SELECT id, name, broker, market, currency, is_active, created_at, updated_at
     FROM trading_journal_accounts
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [accountId, userId]
  )
  return result.rows[0] || null
}

function buildJournalWhere(userId, query = {}) {
  const where = ['t.user_id = $1']
  const params = [userId]
  const add = (sql, value) => {
    params.push(value)
    where.push(sql.replace('?', `$${params.length}`))
  }

  const accountId = Number(query.accountId || 0)
  if (accountId > 0) add('t.account_id = ?', accountId)
  const symbol = normalizeSymbol(query.symbol)
  if (symbol) add('t.symbol LIKE ?', `%${symbol}%`)
  const dateFrom = String(query.dateFrom || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) add('t.entry_time >= ?::date', dateFrom)
  const dateTo = String(query.dateTo || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) add('t.entry_time < (?::date + INTERVAL \'1 day\')', dateTo)
  const tag = normalizeJournalText(query.tag, 60).toLowerCase()
  if (tag) {
    params.push(`%${tag}%`)
    const idx = `$${params.length}`
    where.push(`(
      LOWER(t.strategy_tag) LIKE ${idx}
      OR LOWER(t.emotion_tag) LIKE ${idx}
      OR LOWER(t.setup_tag) LIKE ${idx}
      OR EXISTS (SELECT 1 FROM unnest(t.custom_tags) AS tag_item WHERE LOWER(tag_item) LIKE ${idx})
    )`)
  }
  return { whereSql: where.join(' AND '), params }
}

async function fetchJournalSummary(userId, query = {}) {
  const { whereSql, params } = buildJournalWhere(userId, query)
  const result = await pool.query(
    `SELECT
       COUNT(*)::int AS total_trades,
       COUNT(*) FILTER (WHERE t.status = 'closed')::int AS closed_trades,
       COUNT(*) FILTER (WHERE t.status = 'closed' AND t.pnl > 0)::int AS winners,
       COUNT(*) FILTER (WHERE t.status = 'closed' AND t.pnl < 0)::int AS losers,
       COALESCE(SUM(t.pnl), 0)::float8 AS net_pnl,
       COALESCE(SUM(t.pnl) FILTER (WHERE t.pnl > 0), 0)::float8 AS gross_profit,
       ABS(COALESCE(SUM(t.pnl) FILTER (WHERE t.pnl < 0), 0))::float8 AS gross_loss,
       COALESCE(AVG(t.rr) FILTER (WHERE t.status = 'closed'), 0)::float8 AS avg_rr,
       COALESCE(AVG(t.pnl) FILTER (WHERE t.status = 'closed'), 0)::float8 AS expectancy
     FROM trading_journal_trades t
     WHERE ${whereSql}`,
    params
  )
  const row = result.rows[0] || {}
  const closedTrades = Number(row.closed_trades || 0)
  const winners = Number(row.winners || 0)
  const grossProfit = Number(row.gross_profit || 0)
  const grossLoss = Number(row.gross_loss || 0)
  return {
    totalTrades: Number(row.total_trades || 0),
    closedTrades,
    winners,
    losers: Number(row.losers || 0),
    netPnl: Number(Number(row.net_pnl || 0).toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    winRate: closedTrades ? Number(((winners / closedTrades) * 100).toFixed(2)) : 0,
    avgRr: Number(Number(row.avg_rr || 0).toFixed(2)),
    profitFactor: grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 999 : 0,
    expectancy: Number(Number(row.expectancy || 0).toFixed(2))
  }
}

app.get('/api/journal/accounts', authRequired, async (req, res) => {
  const userId = req.auth.sub
  await ensureDefaultJournalAccount(userId)
  const result = await pool.query(
    `SELECT id, name, broker, market, currency, is_active, created_at, updated_at
     FROM trading_journal_accounts
     WHERE user_id = $1
     ORDER BY is_active DESC, created_at ASC`,
    [userId]
  )
  return res.json({ accounts: result.rows.map(mapJournalAccount) })
})

app.post('/api/journal/accounts', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const name = normalizeJournalText(req.body?.name, 100)
  const broker = normalizeJournalText(req.body?.broker, 80)
  const market = normalizeJournalText(req.body?.market || 'multi', 40).toLowerCase()
  const currency = normalizeJournalText(req.body?.currency || 'USD', 12).toUpperCase()
  if (!name) return res.status(400).json({ message: 'Account name is required.' })
  try {
    const result = await pool.query(
      `INSERT INTO trading_journal_accounts (user_id, name, broker, market, currency, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
       RETURNING id, name, broker, market, currency, is_active, created_at, updated_at`,
      [userId, name, broker, market || 'multi', currency || 'USD']
    )
    return res.json({ account: mapJournalAccount(result.rows[0]) })
  } catch (error) {
    if (String(error?.code) === '23505') return res.status(409).json({ message: 'Account name already exists.' })
    throw error
  }
})

app.patch('/api/journal/accounts/:id', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const accountId = Number(req.params.id || 0)
  if (!accountId) return res.status(400).json({ message: 'Invalid account id.' })
  const current = await assertJournalAccountOwner(userId, accountId)
  if (!current) return res.status(404).json({ message: 'Account not found.' })
  const name = normalizeJournalText(req.body?.name ?? current.name, 100)
  const broker = normalizeJournalText(req.body?.broker ?? current.broker, 80)
  const market = normalizeJournalText(req.body?.market ?? current.market, 40).toLowerCase()
  const currency = normalizeJournalText(req.body?.currency ?? current.currency, 12).toUpperCase()
  const isActive = req.body?.isActive === undefined ? Boolean(current.is_active) : Boolean(req.body.isActive)
  if (!name) return res.status(400).json({ message: 'Account name is required.' })
  try {
    const result = await pool.query(
      `UPDATE trading_journal_accounts
       SET name = $1, broker = $2, market = $3, currency = $4, is_active = $5, updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING id, name, broker, market, currency, is_active, created_at, updated_at`,
      [name, broker, market || 'multi', currency || 'USD', isActive, accountId, userId]
    )
    return res.json({ account: mapJournalAccount(result.rows[0]) })
  } catch (error) {
    if (String(error?.code) === '23505') return res.status(409).json({ message: 'Account name already exists.' })
    throw error
  }
})

app.delete('/api/journal/accounts/:id', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const accountId = Number(req.params.id || 0)
  if (!accountId) return res.status(400).json({ message: 'Invalid account id.' })
  const tradeCount = await pool.query(
    `SELECT COUNT(*)::int AS c FROM trading_journal_trades WHERE account_id = $1 AND user_id = $2`,
    [accountId, userId]
  )
  if (Number(tradeCount.rows[0]?.c || 0) > 0) {
    return res.status(400).json({ message: 'Cannot delete an account that already has trades. Deactivate it instead.' })
  }
  await pool.query(`DELETE FROM trading_journal_accounts WHERE id = $1 AND user_id = $2`, [accountId, userId])
  await ensureDefaultJournalAccount(userId)
  return res.json({ ok: true })
})

app.get('/api/journal/trades', authRequired, async (req, res) => {
  const userId = req.auth.sub
  await ensureDefaultJournalAccount(userId)
  const { whereSql, params } = buildJournalWhere(userId, req.query)
  const limit = Math.max(1, Math.min(500, Number(req.query?.limit || 200)))
  params.push(limit)
  const result = await pool.query(
    `SELECT t.*, a.name AS account_name
     FROM trading_journal_trades t
     JOIN trading_journal_accounts a ON a.id = t.account_id
     WHERE ${whereSql}
     ORDER BY t.entry_time DESC, t.id DESC
     LIMIT $${params.length}`,
    params
  )
  const summary = await fetchJournalSummary(userId, req.query)
  return res.json({ trades: result.rows.map(mapJournalTrade), summary })
})

app.get('/api/journal/summary', authRequired, async (req, res) => {
  const summary = await fetchJournalSummary(req.auth.sub, req.query)
  return res.json({ summary })
})

app.get('/api/journal/trades/:id', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const tradeId = Number(req.params.id || 0)
  if (!tradeId) return res.status(400).json({ message: 'Invalid trade id.' })
  const result = await pool.query(
    `SELECT t.*, a.name AS account_name
     FROM trading_journal_trades t
     JOIN trading_journal_accounts a ON a.id = t.account_id
     WHERE t.id = $1 AND t.user_id = $2
     LIMIT 1`,
    [tradeId, userId]
  )
  const trade = mapJournalTrade(result.rows[0])
  if (!trade) return res.status(404).json({ message: 'Trade not found.' })
  return res.json({ trade })
})

async function upsertJournalTrade({ req, res, tradeId = null }) {
  const userId = req.auth.sub
  const defaultAccount = await ensureDefaultJournalAccount(userId)
  const accountId = Number(req.body?.accountId || defaultAccount.id)
  const account = await assertJournalAccountOwner(userId, accountId)
  if (!account) return res.status(400).json({ message: 'Account is invalid.' })

  const symbol = normalizeSymbol(req.body?.symbol)
  const assetClass = normalizeJournalText(req.body?.assetClass || 'forex', 30).toLowerCase()
  const side = normalizeJournalSide(req.body?.side)
  const entryTimeRaw = String(req.body?.entryTime || '').trim()
  const entryTime = entryTimeRaw ? new Date(entryTimeRaw) : new Date()
  const exitTimeRaw = String(req.body?.exitTime || '').trim()
  const exitTime = exitTimeRaw ? new Date(exitTimeRaw) : null
  const entryPrice = Number(req.body?.entryPrice || 0)
  const exitPrice = Number(req.body?.exitPrice || 0)
  const stopLoss = Number(req.body?.stopLoss || 0)
  const takeProfit = Number(req.body?.takeProfit || 0)
  const volume = Number(req.body?.volume || 0)
  const fees = Number(req.body?.fees || 0)
  const status = normalizeJournalStatus(req.body?.status, exitPrice)
  const session = normalizeJournalText(req.body?.session, 40)
  const strategyTag = normalizeJournalText(req.body?.strategyTag, 60)
  const emotionTag = normalizeJournalText(req.body?.emotionTag, 60)
  const setupTag = normalizeJournalText(req.body?.setupTag, 60)
  const customTags = normalizeJournalTags(req.body?.customTags)
  const notes = normalizeJournalText(req.body?.notes, 1200)
  const source = normalizeJournalText(req.body?.source || 'manual', 40).toLowerCase()
  const importRef = normalizeJournalText(req.body?.importRef, 120)
  const mae = Number(req.body?.mae || 0)
  const mfe = Number(req.body?.mfe || 0)

  if (!symbol) return res.status(400).json({ message: 'Symbol is required.' })
  if (!side) return res.status(400).json({ message: 'Side must be LONG or SHORT.' })
  if (Number.isNaN(entryTime.getTime())) return res.status(400).json({ message: 'Entry time is invalid.' })
  if (exitTime && Number.isNaN(exitTime.getTime())) return res.status(400).json({ message: 'Exit time is invalid.' })
  if (exitTime && exitTime.getTime() < entryTime.getTime()) {
    return res.status(400).json({ message: 'Exit time cannot be before entry time.' })
  }
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) return res.status(400).json({ message: 'Entry price must be greater than 0.' })
  if (!Number.isFinite(volume) || volume <= 0) return res.status(400).json({ message: 'Volume must be greater than 0.' })
  if (status === 'closed' && (!Number.isFinite(exitPrice) || exitPrice <= 0)) {
    return res.status(400).json({ message: 'Closed trade requires exit price.' })
  }
  for (const [label, value] of [
    ['Stop loss', stopLoss],
    ['Take profit', takeProfit],
    ['Fees', fees],
    ['MAE', mae],
    ['MFE', mfe]
  ]) {
    if (!Number.isFinite(value) || value < 0) return res.status(400).json({ message: `${label} cannot be negative.` })
  }

  const metrics = computeJournalTradeMetrics({ side, entryPrice, exitPrice, stopLoss, takeProfit, volume, fees })
  const values = [
    userId,
    accountId,
    symbol,
    assetClass || 'forex',
    side,
    status,
    entryTime.toISOString(),
    exitTime ? exitTime.toISOString() : null,
    entryPrice,
    status === 'closed' ? exitPrice : 0,
    stopLoss,
    takeProfit,
    volume,
    fees,
    session,
    strategyTag,
    emotionTag,
    setupTag,
    customTags,
    notes,
    source || 'manual',
    importRef,
    mae,
    mfe,
    status === 'closed' ? metrics.pnl : 0,
    status === 'closed' ? metrics.rr : 0,
    metrics.plannedRr
  ]

  let result
  if (tradeId) {
    const existing = await pool.query(`SELECT id FROM trading_journal_trades WHERE id = $1 AND user_id = $2`, [tradeId, userId])
    if (!existing.rows[0]) return res.status(404).json({ message: 'Trade not found.' })
    result = await pool.query(
      `UPDATE trading_journal_trades
       SET account_id = $2, symbol = $3, asset_class = $4, side = $5, status = $6,
           entry_time = $7, exit_time = $8, entry_price = $9, exit_price = $10,
           stop_loss = $11, take_profit = $12, volume = $13, fees = $14, session = $15,
           strategy_tag = $16, emotion_tag = $17, setup_tag = $18, custom_tags = $19::TEXT[],
           notes = $20, source = $21, import_ref = $22, mae = $23, mfe = $24,
           pnl = $25, rr = $26, planned_rr = $27, updated_at = NOW()
       WHERE id = $28 AND user_id = $1
       RETURNING *`,
      [...values, tradeId]
    )
  } else {
    result = await pool.query(
      `INSERT INTO trading_journal_trades
        (user_id, account_id, symbol, asset_class, side, status, entry_time, exit_time,
         entry_price, exit_price, stop_loss, take_profit, volume, fees, session,
         strategy_tag, emotion_tag, setup_tag, custom_tags, notes, source, import_ref,
         mae, mfe, pnl, rr, planned_rr, created_at, updated_at)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8,
         $9, $10, $11, $12, $13, $14, $15,
         $16, $17, $18, $19::TEXT[], $20, $21, $22,
         $23, $24, $25, $26, $27, NOW(), NOW())
       RETURNING *`,
      values
    )
  }
  const row = result.rows[0]
  return res.json({ trade: mapJournalTrade({ ...row, account_name: account.name }) })
}

app.post('/api/journal/trades', authRequired, async (req, res) => {
  return upsertJournalTrade({ req, res })
})

app.patch('/api/journal/trades/:id', authRequired, async (req, res) => {
  const tradeId = Number(req.params.id || 0)
  if (!tradeId) return res.status(400).json({ message: 'Invalid trade id.' })
  return upsertJournalTrade({ req, res, tradeId })
})

app.delete('/api/journal/trades/:id', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const tradeId = Number(req.params.id || 0)
  if (!tradeId) return res.status(400).json({ message: 'Invalid trade id.' })
  const result = await pool.query(`DELETE FROM trading_journal_trades WHERE id = $1 AND user_id = $2 RETURNING id`, [tradeId, userId])
  if (!result.rows[0]) return res.status(404).json({ message: 'Trade not found.' })
  return res.json({ ok: true })
})

app.get('/api/trading/orders', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const mode = String(req.query?.mode || '').trim().toLowerCase()
  let whereSql = 'WHERE user_id = $1'
  const params = [userId]
  if (mode === 'real' || mode === 'demo') {
    whereSql += ' AND mode = $2'
    params.push(mode)
  }

  const result = await pool.query(
    `SELECT id, mode, provider, symbol, side, quantity, entry_price, tp_price, sl_price,
            rr_ratio, risk_warning, reason_option, mood_option, note, status, pnl,
            provider_order_id, opened_at, closed_at
     FROM trade_orders
     ${whereSql}
     ORDER BY opened_at DESC
     LIMIT 200`,
    params
  )
  return res.json({
    orders: result.rows.map((row) => ({
      id: row.id,
      mode: row.mode,
      provider: row.provider,
      symbol: row.symbol,
      side: row.side,
      quantity: Number(row.quantity),
      entryPrice: Number(row.entry_price),
      tpPrice: Number(row.tp_price),
      slPrice: Number(row.sl_price),
      rrRatio: Number(row.rr_ratio),
      riskWarning: row.risk_warning,
      reasonOption: row.reason_option,
      moodOption: row.mood_option,
      note: row.note,
      status: row.status,
      pnl: Number(row.pnl),
      providerOrderId: row.provider_order_id,
      openedAt: row.opened_at,
      closedAt: row.closed_at
    }))
  })
})

app.post('/api/trading/orders', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const mode = String(req.body?.mode || '').trim().toLowerCase()
  const providerInput = String(req.body?.provider || '').trim().toLowerCase()
  const symbol = normalizeSymbol(req.body?.symbol)
  const side = String(req.body?.side || '').trim().toLowerCase()
  const quantity = Number(req.body?.quantity || 0)
  const entryPrice = Number(req.body?.entryPrice || 0)
  const tpPrice = Number(req.body?.tpPrice || 0)
  const slPrice = Number(req.body?.slPrice || 0)
  const note = String(req.body?.note || '').trim().slice(0, 500)

  if (!['real', 'demo'].includes(mode)) {
    return res.status(400).json({ message: 'Mode phai la real hoac demo.' })
  }
  if (!['buy', 'sell'].includes(side)) {
    return res.status(400).json({ message: 'Side phai la buy hoac sell.' })
  }
  if (!symbol) return res.status(400).json({ message: 'Symbol la bat buoc.' })
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return res.status(400).json({ message: 'Khoi luong phai > 0.' })
  }
  if (!Number.isFinite(entryPrice) || !Number.isFinite(tpPrice) || !Number.isFinite(slPrice)) {
    return res.status(400).json({ message: 'Gia vao lenh / TP / SL khong hop le.' })
  }
  if (entryPrice <= 0 || tpPrice <= 0 || slPrice <= 0) {
    return res.status(400).json({ message: 'Gia vao lenh / TP / SL phai > 0.' })
  }
  if (tpPrice === entryPrice || slPrice === entryPrice) {
    return res.status(400).json({ message: 'TP va SL khong duoc trung voi gia vao lenh.' })
  }

  const precheckRes = await pool.query(
    `SELECT reason_option, mood_option, product_symbol, note
     FROM user_trade_precheck
     WHERE user_id = $1 AND trade_date = CURRENT_DATE
     LIMIT 1`,
    [userId]
  )
  const precheck = precheckRes.rows[0] || {
    reason_option: 'manual_journal',
    mood_option: 'neutral',
    note: ''
  }

  if (mode === 'real') {
    const connRes = await pool.query(
      `SELECT provider, is_active, api_key, api_secret
       FROM user_trade_connections
       WHERE user_id = $1 AND is_active = true
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userId]
    )
    if (!connRes.rows.length || !connRes.rows[0].api_key || !connRes.rows[0].api_secret) {
      return res.status(400).json({ message: 'Ban chua ket noi API san trade. Hay hoan thanh buoc 2.' })
    }
    if (providerInput && connRes.rows[0].provider !== providerInput) {
      return res.status(400).json({ message: 'Provider dang chon khong trung voi ket noi hien tai.' })
    }
    req.activeProvider = connRes.rows[0].provider
  }

  const rrMeta = computeRR(entryPrice, tpPrice, slPrice)
  const insertRes = await pool.query(
    `INSERT INTO trade_orders
      (user_id, mode, provider, symbol, side, quantity, entry_price, tp_price, sl_price,
       rr_ratio, risk_warning, reason_option, mood_option, note, status, pnl, provider_order_id, opened_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
             $10, $11, $12, $13, $14, 'open', 0, $15, NOW())
     RETURNING id, mode, provider, symbol, side, quantity, entry_price, tp_price, sl_price,
               rr_ratio, risk_warning, reason_option, mood_option, note, status, pnl,
               provider_order_id, opened_at, closed_at`,
    [
      userId,
      mode,
      mode === 'real' ? req.activeProvider : 'demo',
      symbol,
      side,
      quantity,
      entryPrice,
      tpPrice,
      slPrice,
      rrMeta.rr,
      rrMeta.warning,
      precheck.reason_option,
      precheck.mood_option,
      note || precheck.note || '',
      mode === 'real' ? `PENDING_${String(req.activeProvider || '').toUpperCase()}_BRIDGE` : 'DEMO_LOCAL'
    ]
  )

  await pool.query(`DELETE FROM user_trade_precheck WHERE user_id = $1 AND trade_date = CURRENT_DATE`, [userId])

  const row = insertRes.rows[0]
  return res.json({
    order: {
      id: row.id,
      mode: row.mode,
      provider: row.provider,
      symbol: row.symbol,
      side: row.side,
      quantity: Number(row.quantity),
      entryPrice: Number(row.entry_price),
      tpPrice: Number(row.tp_price),
      slPrice: Number(row.sl_price),
      rrRatio: Number(row.rr_ratio),
      riskWarning: row.risk_warning,
      reasonOption: row.reason_option,
      moodOption: row.mood_option,
      note: row.note,
      status: row.status,
      pnl: Number(row.pnl),
      providerOrderId: row.provider_order_id,
      openedAt: row.opened_at,
      closedAt: row.closed_at
    }
  })
})

app.patch('/api/trading/orders/:id/close', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const orderId = Number(req.params.id)
  const closePrice = Number(req.body?.closePrice || 0)
  const closeStatus = String(req.body?.status || '').trim().toLowerCase()
  if (!orderId || !Number.isFinite(closePrice) || closePrice <= 0) {
    return res.status(400).json({ message: 'Lenh dong khong hop le.' })
  }

  const orderRes = await pool.query(
    `SELECT id, mode, side, quantity, entry_price, status
     FROM trade_orders
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [orderId, userId]
  )
  const order = orderRes.rows[0]
  if (!order) return res.status(404).json({ message: 'Order not found' })
  if (order.status !== 'open') return res.status(400).json({ message: 'Order da dong truoc do.' })

  const qty = Number(order.quantity || 0)
  const entry = Number(order.entry_price || 0)
  const pnlRaw = order.side === 'buy' ? (closePrice - entry) * qty : (entry - closePrice) * qty
  const pnl = Number(pnlRaw.toFixed(2))
  const status = ['take_profit', 'stop_loss', 'manual_close'].includes(closeStatus)
    ? closeStatus
    : pnl >= 0
      ? 'take_profit'
      : 'stop_loss'

  const updateRes = await pool.query(
    `UPDATE trade_orders
     SET status = $1, pnl = $2, closed_at = NOW()
     WHERE id = $3
     RETURNING id, mode, provider, symbol, side, quantity, entry_price, tp_price, sl_price,
               rr_ratio, risk_warning, reason_option, mood_option, note, status, pnl,
               provider_order_id, opened_at, closed_at`,
    [status, pnl, orderId]
  )

  if (order.mode === 'demo') {
    await pool.query(
      `INSERT INTO user_demo_wallets (user_id, balance, updated_at)
       VALUES ($1, 10000, NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    )
    await pool.query(
      `UPDATE user_demo_wallets
       SET balance = balance + $1, updated_at = NOW()
       WHERE user_id = $2`,
      [pnl, userId]
    )
  }

  const row = updateRes.rows[0]
  return res.json({
    order: {
      id: row.id,
      mode: row.mode,
      provider: row.provider,
      symbol: row.symbol,
      side: row.side,
      quantity: Number(row.quantity),
      entryPrice: Number(row.entry_price),
      tpPrice: Number(row.tp_price),
      slPrice: Number(row.sl_price),
      rrRatio: Number(row.rr_ratio),
      riskWarning: row.risk_warning,
      reasonOption: row.reason_option,
      moodOption: row.mood_option,
      note: row.note,
      status: row.status,
      pnl: Number(row.pnl),
      providerOrderId: row.provider_order_id,
      openedAt: row.opened_at,
      closedAt: row.closed_at
    }
  })
})

app.get('/api/learning/tree', authRequired, async (req, res) => {
  const userId = req.auth.sub

  const [levelsRes, chaptersRes, lessonsRes, quizzesRes, lessonProgressRes, quizProgressRes] = await Promise.all([
    pool.query(`SELECT * FROM learning_levels WHERE is_active = true ORDER BY sort_order ASC, id ASC`),
    pool.query(`SELECT * FROM learning_chapters ORDER BY level_id ASC, sort_order ASC, id ASC`),
    pool.query(`SELECT * FROM learning_lessons ORDER BY chapter_id ASC, sort_order ASC, id ASC`),
    pool.query(`SELECT * FROM learning_level_quizzes ORDER BY level_id ASC`),
    pool.query(`SELECT lesson_id FROM user_lesson_progress WHERE user_id = $1`, [userId]),
    pool.query(`SELECT level_id, score, passed, completed_at FROM user_level_quiz_progress WHERE user_id = $1`, [userId])
  ])

  const chapterByLevel = new Map()
  for (const chapter of chaptersRes.rows) {
    if (!chapterByLevel.has(chapter.level_id)) chapterByLevel.set(chapter.level_id, [])
    chapterByLevel.get(chapter.level_id).push(chapter)
  }

  const lessonByChapter = new Map()
  for (const lesson of lessonsRes.rows) {
    if (!lessonByChapter.has(lesson.chapter_id)) lessonByChapter.set(lesson.chapter_id, [])
    lessonByChapter.get(lesson.chapter_id).push(lesson)
  }

  const quizByLevel = new Map(quizzesRes.rows.map((q) => [q.level_id, q]))
  const completedLessonIds = new Set(lessonProgressRes.rows.map((r) => r.lesson_id))
  const quizProgressByLevel = new Map(quizProgressRes.rows.map((r) => [r.level_id, r]))

  const levels = []
  for (let idx = 0; idx < levelsRes.rows.length; idx++) {
    const level = levelsRes.rows[idx]
    const prevLevel = levels[idx - 1]
    const unlocked = idx === 0 || Boolean(prevLevel?.quiz?.passed)
    const chapters = (chapterByLevel.get(level.id) || []).map((chapter) => {
      const chapterLessons = [...(lessonByChapter.get(chapter.id) || [])].sort(
        (a, b) => a.sort_order - b.sort_order || a.id - b.id
      )
      let prevCompletedInChapter = true
      const lessons = chapterLessons.map((lesson) => {
        const completed = completedLessonIds.has(lesson.id)
        const locked = !unlocked || !prevCompletedInChapter
        if (!completed) prevCompletedInChapter = false
        return {
          id: lesson.id,
          title: lesson.title,
          content: lesson.content,
          imageUrl: lesson.image_url || '',
          videoUrl: lesson.video_url || '',
          durationMinutes: lesson.duration_minutes,
          xpReward: lesson.xp_reward,
          sortOrder: lesson.sort_order,
          completed,
          locked
        }
      })
      const completedCount = lessons.filter((lesson) => lesson.completed).length
      return {
        id: chapter.id,
        title: chapter.title,
        description: chapter.description,
        sortOrder: chapter.sort_order,
        lessons,
        completedCount,
        totalLessons: lessons.length
      }
    })
    const allLessons = chapters.flatMap((chapter) => chapter.lessons)
    const completedLessons = allLessons.filter((lesson) => lesson.completed).length
    const quizDef = quizByLevel.get(level.id)
    const quizProgress = quizProgressByLevel.get(level.id)
    levels.push({
      id: level.id,
      title: level.title,
      description: level.description,
      sortOrder: level.sort_order,
      unlocked,
      chapters,
      completedLessons,
      totalLessons: allLessons.length,
      quiz: {
        id: quizDef?.id || null,
        title: quizDef?.title || 'Quiz Tong Ket',
        passScore: quizDef?.pass_score || 70,
        xpReward: quizDef?.xp_reward || 200,
        questions: quizDef?.questions_json || [],
        unlocked: unlocked && allLessons.length > 0 && completedLessons === allLessons.length,
        passed: Boolean(quizProgress?.passed),
        score: quizProgress?.score ?? null,
        completedAt: quizProgress?.completed_at ?? null
      }
    })
  }

  return res.json({ levels })
})

app.post('/api/learning/lessons/:id/complete', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const lessonId = Number(req.params.id)
  if (!lessonId) return res.status(400).json({ message: 'Invalid lesson id' })

  const lessonMetaRes = await pool.query(
    `SELECT l.id, l.chapter_id, l.sort_order, c.level_id, lv.sort_order AS level_sort
     FROM learning_lessons l
     JOIN learning_chapters c ON c.id = l.chapter_id
     JOIN learning_levels lv ON lv.id = c.level_id
     WHERE l.id = $1 AND lv.is_active = true
     LIMIT 1`,
    [lessonId]
  )
  if (!lessonMetaRes.rows.length) return res.status(404).json({ message: 'Lesson not found' })
  const lessonMeta = lessonMetaRes.rows[0]

  if (Number(lessonMeta.level_sort) > 1) {
    const prevLevelRes = await pool.query(
      `SELECT id
       FROM learning_levels
       WHERE is_active = true AND sort_order < $1
       ORDER BY sort_order DESC, id DESC
       LIMIT 1`,
      [lessonMeta.level_sort]
    )
    const prevLevelId = prevLevelRes.rows[0]?.id
    if (prevLevelId) {
      const prevQuizRes = await pool.query(
        `SELECT passed
         FROM user_level_quiz_progress
         WHERE user_id = $1 AND level_id = $2
         LIMIT 1`,
        [userId, prevLevelId]
      )
      if (!prevQuizRes.rows[0]?.passed) {
        return res.status(400).json({ message: 'Level is locked. Pass previous level quiz first.' })
      }
    }
  }

  const prevLessonRes = await pool.query(
    `SELECT id
     FROM learning_lessons
     WHERE chapter_id = $1
       AND (sort_order < $2 OR (sort_order = $2 AND id < $3))
     ORDER BY sort_order DESC, id DESC
     LIMIT 1`,
    [lessonMeta.chapter_id, lessonMeta.sort_order, lessonMeta.id]
  )
  const prevLessonId = prevLessonRes.rows[0]?.id
  if (prevLessonId) {
    const prevDoneRes = await pool.query(
      `SELECT 1 FROM user_lesson_progress WHERE user_id = $1 AND lesson_id = $2 LIMIT 1`,
      [userId, prevLessonId]
    )
    if (!prevDoneRes.rows.length) {
      return res.status(400).json({ message: 'Please complete previous lesson first.' })
    }
  }

  const insertProgress = await pool.query(
    `INSERT INTO user_lesson_progress (user_id, lesson_id, completed_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id, lesson_id)
     DO NOTHING
     RETURNING lesson_id`,
    [userId, lessonId]
  )

  // Award XP only when this lesson is completed for the first time.
  if (insertProgress.rows.length) {
    const lessonRes = await pool.query(`SELECT xp_reward FROM learning_lessons WHERE id = $1`, [lessonId])
    const xpReward = Number(lessonRes.rows[0]?.xp_reward || 0)
    if (xpReward > 0) {
      await pool.query(`UPDATE users SET xp = xp + $1 WHERE id = $2`, [xpReward, userId])
    }
  }

  return res.json({ ok: true })
})

app.post('/api/learning/levels/:id/quiz/submit', authRequired, async (req, res) => {
  const userId = req.auth.sub
  const levelId = Number(req.params.id)
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : []
  if (!levelId) return res.status(400).json({ message: 'Invalid level id' })

  const quizRes = await pool.query(
    `SELECT * FROM learning_level_quizzes WHERE level_id = $1 LIMIT 1`,
    [levelId]
  )
  if (!quizRes.rows.length) return res.status(404).json({ message: 'Quiz not found' })
  const quiz = quizRes.rows[0]
  const questions = Array.isArray(quiz.questions_json) ? quiz.questions_json : []
  if (!questions.length) return res.status(400).json({ message: 'Quiz has no questions' })

  let correct = 0
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    if (Number(answers[i]) === Number(q.correctIndex)) correct++
  }
  const score = Math.round((correct / questions.length) * 100)
  const passed = score >= Number(quiz.pass_score || 70)

  const prevRes = await pool.query(
    `SELECT passed FROM user_level_quiz_progress WHERE user_id = $1 AND level_id = $2`,
    [userId, levelId]
  )
  const hadPassedBefore = Boolean(prevRes.rows[0]?.passed)

  await pool.query(
    `INSERT INTO user_level_quiz_progress (user_id, level_id, score, passed, completed_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id, level_id)
     DO UPDATE SET score = EXCLUDED.score, passed = EXCLUDED.passed, completed_at = NOW()`,
    [userId, levelId, score, passed]
  )

  if (passed && !hadPassedBefore) {
    await pool.query(`UPDATE users SET xp = xp + $1 WHERE id = $2`, [Number(quiz.xp_reward || 200), userId])
  }

  return res.json({ score, passed, passScore: Number(quiz.pass_score || 70) })
})

app.get('/api/admin/psych-test/questions', authRequired, adminRequired, async (_, res) => {
  const result = await pool.query(
    `SELECT id, question, option_a, option_b, option_c, sort_order, is_active
     FROM psych_test_questions
     ORDER BY sort_order ASC, id ASC`
  )
  return res.json({
    questions: result.rows.map((row) => ({
      id: row.id,
      question: row.question,
      optionA: row.option_a,
      optionB: row.option_b,
      optionC: row.option_c,
      sortOrder: row.sort_order,
      isActive: row.is_active
    }))
  })
})

app.post('/api/admin/psych-test/questions', authRequired, adminRequired, async (req, res) => {
  const question = String(req.body?.question || '').trim()
  const optionA = String(req.body?.optionA || '').trim()
  const optionB = String(req.body?.optionB || '').trim()
  const optionC = String(req.body?.optionC || '').trim()
  const sortOrder = Number(req.body?.sortOrder || 1)
  if (!question || !optionA || !optionB || !optionC) {
    return res.status(400).json({ message: 'Noi dung cau hoi va 3 dap an A/B/C la bat buoc.' })
  }
  const result = await pool.query(
    `INSERT INTO psych_test_questions (question, option_a, option_b, option_c, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING id, question, option_a, option_b, option_c, sort_order, is_active`,
    [question, optionA, optionB, optionC, sortOrder]
  )
  const row = result.rows[0]
  return res.json({
    question: {
      id: row.id,
      question: row.question,
      optionA: row.option_a,
      optionB: row.option_b,
      optionC: row.option_c,
      sortOrder: row.sort_order,
      isActive: row.is_active
    }
  })
})

app.patch('/api/admin/psych-test/questions/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id)
  const question = String(req.body?.question || '').trim()
  const optionA = String(req.body?.optionA || '').trim()
  const optionB = String(req.body?.optionB || '').trim()
  const optionC = String(req.body?.optionC || '').trim()
  const sortOrder = Number(req.body?.sortOrder || 1)
  const isActive = req.body?.isActive === false ? false : true
  if (!id || !question || !optionA || !optionB || !optionC) {
    return res.status(400).json({ message: 'Payload cap nhat cau hoi khong hop le.' })
  }
  const result = await pool.query(
    `UPDATE psych_test_questions
     SET question = $1, option_a = $2, option_b = $3, option_c = $4, sort_order = $5, is_active = $6
     WHERE id = $7
     RETURNING id, question, option_a, option_b, option_c, sort_order, is_active`,
    [question, optionA, optionB, optionC, sortOrder, isActive, id]
  )
  if (!result.rows.length) return res.status(404).json({ message: 'Question not found' })
  const row = result.rows[0]
  return res.json({
    question: {
      id: row.id,
      question: row.question,
      optionA: row.option_a,
      optionB: row.option_b,
      optionC: row.option_c,
      sortOrder: row.sort_order,
      isActive: row.is_active
    }
  })
})

app.delete('/api/admin/psych-test/questions/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid question id' })
  await pool.query(`DELETE FROM psych_test_questions WHERE id = $1`, [id])
  return res.json({ ok: true })
})

app.get('/api/admin/trading/mt5-connections', authRequired, adminRequired, async (_, res) => {
  const result = await pool.query(
    `SELECT
      u.id AS user_id,
      u.name,
      u.email,
      u.role,
      u.status,
      c.mt5_login,
      c.mt5_server,
      c.mt5_terminal_path,
      c.is_active,
      c.updated_at AS connection_updated_at,
      k.updated_at AS cache_updated_at,
      k.data_json
     FROM users u
     LEFT JOIN user_mt5_connections c ON c.user_id = u.id
     LEFT JOIN user_mt5_data_cache k ON k.user_id = u.id
     ORDER BY u.created_at DESC`
  )

    const connections = result.rows
      .filter((row) => row.mt5_login || row.data_json)
      .map((row) => {
        const snapshot = row.data_json || {}
        const tradeBook = buildTradeBook(snapshot)
        const analysis = buildTradeBehaviorAnalysis(tradeBook.trades, snapshot.account || {})
        return {
          userId: row.user_id,
          name: row.name,
        email: row.email,
        role: row.role,
        userStatus: row.status,
        connected: Boolean(row.mt5_login),
        active: row.is_active === true,
        mt5LoginMasked: maskSecret(row.mt5_login || ''),
        mt5Server: row.mt5_server || '',
        mt5TerminalPath: row.mt5_terminal_path || '',
        connectionUpdatedAt: row.connection_updated_at || null,
        lastSyncAt: row.cache_updated_at || null,
        source: snapshot.source || '',
        analysis
      }
    })

  return res.json({ connections })
})

app.patch('/api/admin/trading/mt5-connections/:userId/status', authRequired, adminRequired, async (req, res) => {
  const userId = String(req.params.userId || '').trim()
  const active = req.body?.active === false ? false : true
  if (!userId) return res.status(400).json({ message: 'Invalid user id' })
  const result = await pool.query(
    `UPDATE user_mt5_connections
     SET is_active = $1, updated_at = NOW()
     WHERE user_id = $2
     RETURNING user_id, is_active, updated_at`,
    [active, userId]
  )
  if (!result.rows.length) return res.status(404).json({ message: 'MT5 connection not found' })
  return res.json({ ok: true, connection: result.rows[0] })
})

app.delete('/api/admin/trading/mt5-connections/:userId', authRequired, adminRequired, async (req, res) => {
  const userId = String(req.params.userId || '').trim()
  if (!userId) return res.status(400).json({ message: 'Invalid user id' })
  await pool.query(`DELETE FROM user_mt5_connections WHERE user_id = $1`, [userId])
  return res.json({ ok: true })
})

app.post('/api/admin/trading/mt5-connections/:userId/sync', authRequired, adminRequired, async (req, res) => {
  const userId = String(req.params.userId || '').trim()
  const days = Math.max(1, Math.min(365, Number(req.body?.days || 30)))
  if (!userId) return res.status(400).json({ message: 'Invalid user id' })

  const connRes = await pool.query(
    `SELECT mt5_login, mt5_password, mt5_server, mt5_terminal_path, is_active
     FROM user_mt5_connections
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  )
  const connection = connRes.rows[0]
  if (!connection) return res.status(404).json({ message: 'MT5 connection not found' })
  if (!connection.is_active) return res.status(400).json({ message: 'Connection is inactive' })

  try {
    const password = decryptMt5Password(connection.mt5_password)
    const { snapshot, analysis, tradeBook } = await collectAndCacheMt5Snapshot({
      userId,
      login: connection.mt5_login,
      password,
      server: connection.mt5_server,
      days,
      terminalPath: connection.mt5_terminal_path
    })
    return res.json({ ok: true, snapshot, analysis, tradeBook })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Admin sync failed' })
  }
})

app.get('/api/admin/trading/behavior-overview', authRequired, adminRequired, async (req, res) => {
  const days = Math.max(1, Math.min(365, Number(req.query?.days || 30)))
  const today = dateKeyUTC(new Date())
  const weekRange = getWeekRangeUTC(today)
  const monthRange = getMonthRangeUTC(today)
  const pastStart = addDaysUTC(today, -(days - 1))

  const [baseRes, checklistRes] = await Promise.all([
    pool.query(
      `SELECT
        u.id AS user_id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.level,
        u.xp,
        c.mt5_login,
        c.mt5_server,
        c.is_active,
        c.updated_at AS connection_updated_at,
        k.data_json,
        k.updated_at AS cache_updated_at,
        lr.report_month AS latest_report_month,
        lr.status AS latest_report_status,
        lr.sent_at AS latest_report_sent_at
       FROM users u
       LEFT JOIN user_mt5_connections c ON c.user_id = u.id
       LEFT JOIN user_mt5_data_cache k ON k.user_id = u.id
       LEFT JOIN LATERAL (
         SELECT report_month, status, sent_at
         FROM user_monthly_report_logs
         WHERE user_id = u.id
         ORDER BY report_month DESC
         LIMIT 1
       ) lr ON true
       ORDER BY u.created_at DESC`
    ),
    pool.query(
      `SELECT
        user_id,
        COUNT(*) FILTER (WHERE trade_date BETWEEN $1::date AND $2::date) AS checklist_count,
        AVG(total_score) FILTER (WHERE trade_date BETWEEN $1::date AND $2::date) AS avg_total_score,
        AVG(emotion_score) FILTER (WHERE trade_date BETWEEN $1::date AND $2::date) AS avg_emotion_score,
        AVG(plan_score) FILTER (WHERE trade_date BETWEEN $1::date AND $2::date) AS avg_plan_score,
        AVG(rr_ratio) FILTER (WHERE trade_date BETWEEN $1::date AND $2::date) AS avg_rr,
        AVG(CASE WHEN can_trade THEN 1 ELSE 0 END) FILTER (WHERE trade_date BETWEEN $1::date AND $2::date) AS can_trade_ratio,
        COUNT(*) FILTER (WHERE NOT can_trade AND trade_date BETWEEN $1::date AND $2::date) AS blocked_count,
        MAX(created_at) AS last_checklist_at
       FROM user_trade_checklists
       GROUP BY user_id`,
      [pastStart, today]
    )
  ])

  const checklistMap = new Map(checklistRes.rows.map((row) => [String(row.user_id), row]))
  const sumRange = (dailyMap, startDate, endDate) => {
    const keys = enumerateDateKeysUTC(startDate, endDate)
    let total = 0
    for (const key of keys) total += toFiniteNumber(dailyMap.get(key)?.netProfit, 0)
    return Number(total.toFixed(2))
  }

  const rows = baseRes.rows.map((row) => {
    const snapshot = row.data_json || {}
    const tradeBook = buildTradeBook(snapshot)
    const analysis = buildTradeBehaviorAnalysis(tradeBook.trades, snapshot.account || {})
    const dailyMap = new Map((tradeBook.daily || []).map((d) => [String(d.date || ''), d]))
    const checklist = checklistMap.get(String(row.user_id))
    return {
      userId: row.user_id,
      name: row.name,
      email: row.email,
      role: row.role,
      userStatus: row.status,
      level: Number(row.level || 1),
      xp: Number(row.xp || 0),
      mt5Connected: Boolean(row.mt5_login),
      mt5Active: row.is_active === true,
      mt5Server: row.mt5_server || '',
      mt5LoginMasked: maskSecret(row.mt5_login || ''),
      lastSyncAt: row.cache_updated_at || null,
      source: snapshot.source || '',
      netDay: sumRange(dailyMap, today, today),
      netWeek: sumRange(dailyMap, weekRange.startDate, weekRange.endDate),
      netMonth: sumRange(dailyMap, monthRange.startDate, monthRange.endDate),
      tradesMonth: Number(
        enumerateDateKeysUTC(monthRange.startDate, monthRange.endDate).reduce(
          (acc, key) => acc + toFiniteNumber(dailyMap.get(key)?.totalTrades, 0),
          0
        )
      ),
      behaviorRiskScore: Number(analysis.behaviorRiskScore || 0),
      behaviorLabel: analysis.behaviorLabel || '',
      checklistCount: Number(checklist?.checklist_count || 0),
      avgBehaviorScore: Number(toFiniteNumber(checklist?.avg_total_score, 0).toFixed(2)),
      avgEmotionScore: Number(toFiniteNumber(checklist?.avg_emotion_score, 0).toFixed(2)),
      avgPlanScore: Number(toFiniteNumber(checklist?.avg_plan_score, 0).toFixed(2)),
      avgRR: Number(toFiniteNumber(checklist?.avg_rr, 0).toFixed(2)),
      canTradeRate: Number((toFiniteNumber(checklist?.can_trade_ratio, 0) * 100).toFixed(2)),
      blockedCount: Number(checklist?.blocked_count || 0),
      lastChecklistAt: checklist?.last_checklist_at || null,
      latestReportMonth: row.latest_report_month || null,
      latestReportStatus: row.latest_report_status || null,
      latestReportSentAt: row.latest_report_sent_at || null
    }
  })

  return res.json({ days, rows })
})

app.post('/api/admin/trading/reports/monthly/send', authRequired, adminRequired, async (req, res) => {
  const userId = String(req.body?.userId || '').trim()
  const month = String(req.body?.month || '').trim()
  const force = req.body?.force === true
  if (!userId) return res.status(400).json({ message: 'userId is required' })
  try {
    const payload = await sendMonthlyReportForUser({
      userId,
      monthInput: month,
      force,
      requestedBy: 'admin'
    })
    return res.json(payload)
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Cannot send monthly report now.' })
  }
})

app.get('/api/admin/users', authRequired, adminRequired, async (_, res) => {
  const result = await pool.query(
    `SELECT
      u.id,
      u.name,
      u.email,
      u.phone,
      u.role,
      u.status,
      u.provider,
      u.email_verified,
      u.created_at,
      u.level,
      u.xp,
      u.total_xp,
      u.rank_points,
      u.rank_tier,
      sub.plan_code AS sub_plan_code,
      sub.status AS sub_status,
      sub.started_at AS sub_started_at,
      sub.expires_at AS sub_expires_at,
      EXISTS (
        SELECT 1
        FROM billing_orders bo
        WHERE bo.user_id = u.id
          AND bo.status = 'paid'
      ) AS has_paid_order,
      nft.is_active AS nft_active,
      nft.nft_name,
      nft.token_id,
      nft.rarity,
      nft.wallet_address,
      nft.minted_at
     FROM users u
     LEFT JOIN user_subscriptions sub ON sub.user_id = u.id
     LEFT JOIN user_nft_profiles nft ON nft.user_id = u.id
     ORDER BY u.created_at DESC`
  )
  const users = result.rows.map((row) => {
    const base = publicUser(mapUser(row))
    return {
      ...base,
      rankPoints: Math.max(0, Number(row.rank_points || 0)),
      rankTier: normalizeRankTier(row.rank_tier, 'bronze'),
      nft: {
        active: row.nft_active === true,
        nftName: String(row.nft_name || ''),
        tokenId: String(row.token_id || ''),
        rarity: String(row.rarity || 'standard'),
        walletAddress: normalizeWalletAddress(row.wallet_address || ''),
        mintedAt: row.minted_at || null
      },
      subscription: serializeSubscription({
        plan_code: row.sub_plan_code,
        status: row.sub_status,
        started_at: row.sub_started_at,
        expires_at: row.sub_expires_at
      }, { role: row.role }, { hasPaidOrder: Boolean(row.has_paid_order) })
    }
  })
  return res.json({ users })
})

app.get('/api/admin/users/full', authRequired, adminRequired, async (req, res) => {
  const days = Math.max(7, Math.min(365, Number(req.query?.days || 30)))
  try {
    const board = await buildLeaderboardPayload({ days, limit: 200 })
    const map = new Map(board.rows.map((row) => [String(row.userId), row]))
    const usersRes = await pool.query(
      `SELECT id, name, email, phone, role, status, provider, created_at, rank_points, rank_tier
       FROM users
       ORDER BY created_at DESC`
    )
    const users = usersRes.rows.map((row) => {
      const detail = map.get(String(row.id))
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone || '',
        role: row.role,
        status: row.status,
        provider: row.provider,
        createdAt: row.created_at,
        rankPoints: Number(row.rank_points || 0),
        rankTier: normalizeRankTier(row.rank_tier, detail?.rankTier || 'bronze'),
        leaderboard: detail
          ? {
              position: detail.position,
              percentile: detail.percentile,
              behaviorScore: detail.behaviorScore,
              winRate: detail.winRate,
              checklistCount: detail.checklistCount,
              canTradeRate: detail.canTradeRate
            }
          : null,
        nft: detail
          ? {
              active: detail.nftActive,
              nftName: detail.nftName,
              tokenId: detail.tokenId,
              rarity: detail.nftRarity,
              nftImageUrl: detail.nftImageUrl
            }
          : null
      }
    })
    return res.json({
      days,
      totalUsers: board.totalUsers,
      users
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Cannot load full admin users.' })
  }
})

app.post('/api/admin/users/:id/rank/adjust', authRequired, adminRequired, async (req, res) => {
  const targetUserId = String(req.params.id || '').trim()
  const points = Math.round(Number(req.body?.points || 0))
  const reason = String(req.body?.reason || '').trim().slice(0, 255)
  if (!targetUserId) return res.status(400).json({ message: 'Invalid user id' })
  if (!Number.isFinite(points) || points === 0) {
    return res.status(400).json({ message: 'points must be a non-zero number' })
  }
  const event = await appendRankPointEvent({
    userId: targetUserId,
    points,
    source: 'admin_adjust',
    reason: reason || `admin-adjust:${points}`,
    meta: { actor: req.me?.email || req.auth?.sub || 'admin' },
    createdBy: req.me?.email || req.auth?.sub || 'admin'
  })
  if (!event) return res.status(404).json({ message: 'User not found' })
  const identity = await buildUserRankNftProfile({ userId: targetUserId, days: 30 })
  return res.json({
    ok: true,
    event: {
      id: event.id,
      points: event.points,
      source: event.source,
      reason: event.reason,
      createdAt: event.created_at
    },
    rank: identity.rank
  })
})

app.patch('/api/admin/users/:id/nft', authRequired, adminRequired, async (req, res) => {
  const targetUserId = String(req.params.id || '').trim()
  if (!targetUserId) return res.status(400).json({ message: 'Invalid user id' })
  const walletAddress = normalizeWalletAddress(req.body?.walletAddress)
  const nftName = String(req.body?.nftName || '').trim().slice(0, 120)
  const nftImageUrl = String(req.body?.nftImageUrl || '').trim().slice(0, 500)
  const tokenId = String(req.body?.tokenId || '').trim().slice(0, 120)
  const rarity = String(req.body?.rarity || 'standard')
    .trim()
    .toLowerCase()
    .slice(0, 40)
  const isActive = req.body?.isActive === false ? false : true
  const metadata = req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {}
  await pool.query(
    `INSERT INTO user_nft_profiles
      (user_id, nft_name, nft_image_url, wallet_address, chain, contract_address, token_id, rarity, metadata_json,
       minted_tx_hash, minted_at, is_active, updated_at)
     VALUES
      ($1, $2, $3, $4, 'cardano', $5, $6, $7, $8::jsonb, $9, CASE WHEN $10 THEN NOW() ELSE NULL END, $10, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       nft_name = COALESCE(NULLIF($2, ''), user_nft_profiles.nft_name),
       nft_image_url = COALESCE(NULLIF($3, ''), user_nft_profiles.nft_image_url),
       wallet_address = COALESCE(NULLIF($4, ''), user_nft_profiles.wallet_address),
       contract_address = COALESCE(NULLIF($5, ''), user_nft_profiles.contract_address),
       token_id = COALESCE(NULLIF($6, ''), user_nft_profiles.token_id),
       rarity = COALESCE(NULLIF($7, ''), user_nft_profiles.rarity),
       metadata_json = CASE
         WHEN $8::jsonb = '{}'::jsonb THEN user_nft_profiles.metadata_json
         ELSE $8::jsonb
       END,
       minted_tx_hash = CASE
         WHEN $9 <> '' THEN $9
         ELSE user_nft_profiles.minted_tx_hash
       END,
       minted_at = CASE
         WHEN $10 THEN COALESCE(user_nft_profiles.minted_at, NOW())
         ELSE user_nft_profiles.minted_at
       END,
       is_active = $10,
       updated_at = NOW()`,
    [
      targetUserId,
      nftName,
      nftImageUrl,
      walletAddress,
      String(process.env.NFT_CONTRACT_ADDRESS || 'addr1q9...5k2m7v').slice(0, 255),
      tokenId,
      rarity,
      JSON.stringify(metadata),
      String(req.body?.mintedTxHash || '').trim().slice(0, 255),
      isActive
    ]
  )
  const identity = await buildUserRankNftProfile({ userId: targetUserId, days: 30 })
  return res.json({ ok: true, nft: identity.nft, rank: identity.rank })
})

app.get('/api/admin/leaderboard', authRequired, adminRequired, async (req, res) => {
  const days = Math.max(7, Math.min(365, Number(req.query?.days || 30)))
  const limit = Math.max(5, Math.min(500, Number(req.query?.limit || 200)))
  try {
    const payload = await buildLeaderboardPayload({ days, limit })
    return res.json(payload)
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Cannot load admin leaderboard.' })
  }
})

app.get('/api/admin/learning/tree', authRequired, adminRequired, async (_, res) => {
  const [levelsRes, chaptersRes, lessonsRes, quizzesRes] = await Promise.all([
    pool.query(`SELECT * FROM learning_levels ORDER BY sort_order ASC, id ASC`),
    pool.query(`SELECT * FROM learning_chapters ORDER BY level_id ASC, sort_order ASC, id ASC`),
    pool.query(`SELECT * FROM learning_lessons ORDER BY chapter_id ASC, sort_order ASC, id ASC`),
    pool.query(`SELECT * FROM learning_level_quizzes ORDER BY level_id ASC`)
  ])

  const chapterByLevel = new Map()
  for (const chapter of chaptersRes.rows) {
    if (!chapterByLevel.has(chapter.level_id)) chapterByLevel.set(chapter.level_id, [])
    chapterByLevel.get(chapter.level_id).push(chapter)
  }
  const lessonByChapter = new Map()
  for (const lesson of lessonsRes.rows) {
    if (!lessonByChapter.has(lesson.chapter_id)) lessonByChapter.set(lesson.chapter_id, [])
    lessonByChapter.get(lesson.chapter_id).push(lesson)
  }
  const quizByLevel = new Map(quizzesRes.rows.map((q) => [q.level_id, q]))

  const levels = levelsRes.rows.map((level) => ({
    id: level.id,
    title: level.title,
    description: level.description,
    sortOrder: level.sort_order,
    chapters: (chapterByLevel.get(level.id) || []).map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      description: chapter.description,
      sortOrder: chapter.sort_order,
      lessons: (lessonByChapter.get(chapter.id) || []).map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        content: lesson.content,
        imageUrl: lesson.image_url || '',
        videoUrl: lesson.video_url || '',
        durationMinutes: lesson.duration_minutes,
        xpReward: lesson.xp_reward,
        sortOrder: lesson.sort_order
      }))
    })),
    quiz: quizByLevel.get(level.id)
      ? {
          id: quizByLevel.get(level.id).id,
          title: quizByLevel.get(level.id).title,
          passScore: quizByLevel.get(level.id).pass_score,
          xpReward: quizByLevel.get(level.id).xp_reward,
          questions: quizByLevel.get(level.id).questions_json
        }
      : null
  }))

  return res.json({ levels })
})

app.post('/api/admin/learning/chapters', authRequired, adminRequired, async (req, res) => {
  const levelId = Number(req.body?.levelId)
  const title = String(req.body?.title || '').trim()
  const description = String(req.body?.description || '').trim()
  const sortOrder = Number(req.body?.sortOrder || 1)
  if (!levelId || !title) return res.status(400).json({ message: 'Invalid chapter payload' })

  const result = await pool.query(
    `INSERT INTO learning_chapters (level_id, title, description, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING id, level_id, title, description, sort_order`,
    [levelId, title, description, sortOrder]
  )
  return res.json({ chapter: result.rows[0] })
})

app.post('/api/admin/learning/lessons', authRequired, adminRequired, async (req, res) => {
  const chapterId = Number(req.body?.chapterId)
  const title = String(req.body?.title || '').trim()
  const content = String(req.body?.content || '').trim()
  const imageUrl = String(req.body?.imageUrl || '').trim()
  const videoUrl = String(req.body?.videoUrl || '').trim()
  const durationMinutes = Number(req.body?.durationMinutes || 5)
  const xpReward = Number(req.body?.xpReward || 30)
  const sortOrder = Number(req.body?.sortOrder || 1)
  if (!Number.isFinite(chapterId) || chapterId <= 0) return res.status(400).json({ message: 'Invalid chapter id' })
  if (!title) return res.status(400).json({ message: 'Lesson title is required' })
  if (!content) return res.status(400).json({ message: 'Lesson content is required' })

  const result = await pool.query(
    `INSERT INTO learning_lessons
      (chapter_id, title, content, image_url, video_url, duration_minutes, xp_reward, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, chapter_id, title, content, image_url, video_url, duration_minutes, xp_reward, sort_order`,
    [chapterId, title, content, imageUrl, videoUrl, durationMinutes, xpReward, sortOrder]
  )
  return res.json({ lesson: result.rows[0] })
})

app.patch('/api/admin/learning/lessons/:id', authRequired, adminRequired, async (req, res) => {
  const lessonId = Number(req.params.id)
  const title = String(req.body?.title || '').trim()
  const content = String(req.body?.content || '').trim()
  const imageUrl = String(req.body?.imageUrl || '').trim()
  const videoUrl = String(req.body?.videoUrl || '').trim()
  const durationMinutes = Number(req.body?.durationMinutes || 5)
  const xpReward = Number(req.body?.xpReward || 30)
  const sortOrder = Number(req.body?.sortOrder || 1)
  if (!Number.isFinite(lessonId) || lessonId <= 0) return res.status(400).json({ message: 'Invalid lesson id' })
  if (!title) return res.status(400).json({ message: 'Lesson title is required' })
  if (!content) return res.status(400).json({ message: 'Lesson content is required' })

  const result = await pool.query(
    `UPDATE learning_lessons
     SET title = $1, content = $2, image_url = $3, video_url = $4, duration_minutes = $5, xp_reward = $6, sort_order = $7
     WHERE id = $8
     RETURNING id, chapter_id, title, content, image_url, video_url, duration_minutes, xp_reward, sort_order`,
    [title, content, imageUrl, videoUrl, durationMinutes, xpReward, sortOrder, lessonId]
  )
  if (!result.rows.length) return res.status(404).json({ message: 'Lesson not found' })
  return res.json({ lesson: result.rows[0] })
})

app.delete('/api/admin/learning/lessons/:id', authRequired, adminRequired, async (req, res) => {
  const lessonId = Number(req.params.id)
  if (!lessonId) return res.status(400).json({ message: 'Invalid lesson id' })
  await pool.query(`DELETE FROM learning_lessons WHERE id = $1`, [lessonId])
  return res.json({ ok: true })
})

app.patch('/api/admin/learning/chapters/:id', authRequired, adminRequired, async (req, res) => {
  const chapterId = Number(req.params.id)
  const title = String(req.body?.title || '').trim()
  const description = String(req.body?.description || '').trim()
  const sortOrder = Number(req.body?.sortOrder || 1)
  if (!chapterId || !title) return res.status(400).json({ message: 'Invalid chapter payload' })

  const result = await pool.query(
    `UPDATE learning_chapters
     SET title = $1, description = $2, sort_order = $3
     WHERE id = $4
     RETURNING id, level_id, title, description, sort_order`,
    [title, description, sortOrder, chapterId]
  )
  if (!result.rows.length) return res.status(404).json({ message: 'Chapter not found' })
  return res.json({ chapter: result.rows[0] })
})

app.delete('/api/admin/learning/chapters/:id', authRequired, adminRequired, async (req, res) => {
  const chapterId = Number(req.params.id)
  if (!chapterId) return res.status(400).json({ message: 'Invalid chapter id' })
  await pool.query(`DELETE FROM learning_chapters WHERE id = $1`, [chapterId])
  return res.json({ ok: true })
})

app.patch('/api/admin/users/:id/role', authRequired, adminRequired, async (req, res) => {
  const nextRole = String(req.body?.role || '')
  if (!['admin', 'user'].includes(nextRole)) {
    return res.status(400).json({ message: 'Role must be admin or user' })
  }
  const result = await pool.query(
    `UPDATE users SET role = $1 WHERE id = $2 RETURNING *`,
    [nextRole, req.params.id]
  )
  const user = mapUser(result.rows[0])
  if (!user) return res.status(404).json({ message: 'User not found' })
  return res.json({ user: publicUser(user) })
})

app.patch('/api/admin/users/:id/status', authRequired, adminRequired, async (req, res) => {
  const nextStatus = String(req.body?.status || '')
  if (!['active', 'inactive'].includes(nextStatus)) {
    return res.status(400).json({ message: 'Status must be active or inactive' })
  }
  const result = await pool.query(
    `UPDATE users SET status = $1 WHERE id = $2 RETURNING *`,
    [nextStatus, req.params.id]
  )
  const user = mapUser(result.rows[0])
  if (!user) return res.status(404).json({ message: 'User not found' })
  return res.json({ user: publicUser(user) })
})

app.patch('/api/admin/users/:id/subscription', authRequired, adminRequired, async (req, res) => {
  const userId = String(req.params.id || '').trim()
  const planCode = PRO_PLAN_CODE
  const durationDays = Math.max(1, Math.min(365, Number(req.body?.durationDays || 30)))
  if (!userId) return res.status(400).json({ message: 'Invalid user id.' })
  const userRes = await pool.query(`SELECT id FROM users WHERE id = $1 LIMIT 1`, [userId])
  if (!userRes.rows.length) return res.status(404).json({ message: 'User not found.' })
  await activateUserSubscription(userId, planCode, durationDays)
  const subscription = await getUserSubscription(userId)
  return res.json({ ok: true, userId, subscription })
})

app.use((error, req, res, _next) => {
  const requestId = res.getHeader('X-Request-Id') || ''
  if (String(error?.message || '').includes('CORS origin denied')) {
    return res.status(403).json({ message: 'CORS origin denied.', requestId })
  }
  console.error('[api-error]', requestId, error?.message || error)
  return res.status(500).json({ message: 'Internal server error.', requestId })
})

await initDatabase()

const httpServer = createServer(app)
setupMt5WebSocketServer(httpServer)

httpServer.listen(PORT, () => {
  console.log(`Auth server running on http://localhost:${PORT}`)
  console.log('Admin Gmail whitelist:', [...adminGmails].join(', ') || '(none)')
  if (!mailerEnabled) console.log('Mailer is disabled. OTP endpoints will return 503.')
  if (MT5_AUTO_SYNC_ENABLED) {
    console.log(
      `[mt5-auto-sync] enabled interval=${MT5_AUTO_SYNC_INTERVAL_MS}ms stale=${MT5_AUTO_SYNC_STALE_MS}ms days=${MT5_AUTO_SYNC_DAYS}`
    )
    runAutoMt5SyncJob().catch((error) => {
      console.error('[mt5-auto-sync][startup]', error.message || error)
    })
    runMultiAccountAutoSync().catch((error) => {
      console.error('[mt5-multi-sync][startup]', error.message || error)
    })
    if (!mt5AutoSyncTimer) {
      mt5AutoSyncTimer = setInterval(() => {
        runAutoMt5SyncJob().catch((error) => {
          console.error('[mt5-auto-sync][interval]', error.message || error)
        })
        runMultiAccountAutoSync().catch((error) => {
          console.error('[mt5-multi-sync][interval]', error.message || error)
        })
      }, MT5_AUTO_SYNC_INTERVAL_MS)
    }
  } else {
    console.log('[mt5-auto-sync] disabled')
  }
  if (mailerEnabled) {
    runAutoMonthlyReportJob().catch((error) => {
      console.error('[monthly-report][auto][startup]', error.message || error)
    })
    if (!monthlyReportTimer) {
      monthlyReportTimer = setInterval(() => {
        runAutoMonthlyReportJob().catch((error) => {
          console.error('[monthly-report][auto][interval]', error.message || error)
        })
      }, MONTHLY_REPORT_AUTO_INTERVAL_MS)
    }
  }
})
