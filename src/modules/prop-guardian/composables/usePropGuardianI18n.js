import { computed } from 'vue'
import { useUiStore } from '../../../stores/useUiStore.js'
import { propGuardianMessages } from '../i18n/propGuardianMessages.js'

function getByPath(source, path) {
  const parts = String(path || '')
    .split('.')
    .filter(Boolean)
  let cursor = source
  for (const part of parts) {
    if (cursor && Object.prototype.hasOwnProperty.call(cursor, part)) {
      cursor = cursor[part]
    } else {
      return null
    }
  }
  return cursor
}

function interpolate(template, params = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ''))
}

function humanize(value) {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const alertTypeLabels = {
  DAILY_DD_WARNING: { vi: 'Canh bao daily DD', en: 'Daily DD warning' },
  DAILY_DD_DANGER: { vi: 'Daily DD nguy hiem', en: 'Daily DD danger' },
  MAX_DD_WARNING: { vi: 'Canh bao max DD', en: 'Max DD warning' },
  TRAILING_DD_DANGER: { vi: 'Max DD trailing nguy hiem', en: 'Trailing DD danger' },
  PROFIT_TARGET_NEAR: { vi: 'Gan profit target', en: 'Profit target near' },
  CONSISTENCY_RISK: { vi: 'Rui ro consistency', en: 'Consistency risk' },
  REVENGE_TRADING: { vi: 'Revenge trading', en: 'Revenge trading' },
  OVERTRADING: { vi: 'Overtrading', en: 'Overtrading' },
  OVERSIZING: { vi: 'Oversizing', en: 'Oversizing' },
  NO_STOP_LOSS: { vi: 'Lenh khong co SL', en: 'No stop loss' },
  BAD_SESSION: { vi: 'Khung gio xau', en: 'Bad session' },
  NEWS_RISK: { vi: 'Rui ro news', en: 'News risk' },
  PAYOUT_PROTECTION: { vi: 'Bao ve payout', en: 'Payout protection' },
  LOCKDOWN_MODE: { vi: 'Lockdown mode', en: 'Lockdown mode' },
  PROP_DD_DANGER_ZONE: { vi: 'Vung drawdown nguy hiem 6-7%', en: '6-7% drawdown danger zone' },
  OUTSIDE_TRADING_HOURS: { vi: 'Ngoai gio duoc trade', en: 'Outside trading hours' }
}

const issueTypeLabels = {
  REVENGE_TRADING: { vi: 'Rui ro revenge trading', en: 'Revenge trading risk' },
  OVERTRADING: { vi: 'Rui ro overtrading', en: 'Overtrading risk' },
  FOMO: { vi: 'Lenh FOMO', en: 'FOMO entries' },
  OVERSIZING: { vi: 'Rui ro oversizing', en: 'Oversizing risk' },
  HOLDING_LOSER: { vi: 'Giu lenh lo qua lau', en: 'Holding loser too long' },
  CUTTING_WINNER: { vi: 'Cat loi som', en: 'Cutting winners early' },
  BAD_SESSION: { vi: 'Khung gio xau', en: 'Bad session window' }
}

const exactTextMapVi = {
  'Any time': 'Bat ky luc nao',
  Open: 'Mo',
  Closed: 'Dong',
  'Detected by Guardian engine': 'Duoc Guardian engine phat hien',
  'No MT5 cache yet. Connect Exness/MT5 to switch from mock to live mode.':
    'Chua co MT5 cache. Hay ket noi Exness/MT5 de chuyen tu mock sang live.',
  'Cannot load Exness/MT5 data right now. Mock realtime mode is active.':
    'Tam thoi khong the tai du lieu Exness/MT5. Che do mock realtime dang hoat dong.',
  'Trading window is open.': 'Khung gio trade dang mo.',
  'Trading window is closed for the current plan.': 'Khung gio trade dang dong theo ke hoach hien tai.',
  'This is a risk-management estimate, not financial advice.':
    'Day la uoc tinh quan ly rui ro, khong phai loi khuyen tai chinh.',
  'No live orders will be closed by this system. It only warns and creates taskcare actions unless explicit execution permission is enabled.':
    'He thong nay khong tu dong dong lenh that. He thong chi canh bao va tao taskcare, tru khi ban bat quyen execution ro rang.',
  'This system is a risk management and journaling assistant, not financial advice.':
    'He thong nay la tro ly quan ly rui ro va journaling, khong phai loi khuyen tai chinh.',
  'Risk buffers are healthy and no active blocker is detected.':
    'Buffer rui ro dang tot va khong co blocker nao hien tai.',
  'Daily DD, max DD, trading window, and open risk are inside plan.':
    'Daily DD, max DD, gio trade va rui ro dang mo deu nam trong ke hoach.',
  'Take only planned setups and keep normal risk.': 'Chi vao setup da co ke hoach va giu risk binh thuong.',
  'Trading is allowed only with reduced risk and a complete plan.':
    'Chi nen trade voi rui ro giam va co ke hoach day du.',
  'Do not open new trades until the active blockers are handled.':
    'Khong mo lenh moi cho den khi cac blocker hien tai duoc xu ly.',
  'Current time is outside the allowed trading window.': 'Thoi gian hien tai nam ngoai khung gio duoc trade.',
  'Consistency rule is violated.': 'Rule consistency dang bi vi pham.',
  'Daily drawdown is above 50%.': 'Daily drawdown dang tren 50%.',
  'Daily drawdown is 70% used.': 'Daily drawdown da dung 70%.',
  'Max drawdown buffer is 75% used.': 'Buffer max drawdown da dung 75%.',
  'Lockdown risk mode is active.': 'Che do lockdown dang hoat dong.',
  'Account drawdown is near the dangerous 6-7% challenge zone.':
    'Account drawdown dang gan vung nguy hiem 6-7% cua challenge.',
  'Consistency rule is near its limit.': 'Rule consistency dang gan gioi han.',
  'Use half risk, require SL, and stop after one invalid setup.':
    'Dung mot nua risk, bat buoc co SL va dung sau mot setup khong hop le.',
  'Keep risk inside plan and journal the trade before entry.':
    'Giu risk trong ke hoach va journal trade truoc khi vao lenh.',
  'Protect open risk now': 'Bao ve rui ro dang mo ngay',
  'Stop trading plan': 'Dung ke hoach giao dich',
  'Defend daily drawdown': 'Bao ve daily drawdown',
  'Break the revenge loop': 'Cat vong lap revenge',
  'Execute only the planned setup': 'Chi thuc thi setup dung ke hoach',
  'Should I trade now?': 'Hom nay co nen trade khong?',
  'Daily DD shock': 'Soc Daily DD',
  'Max DD compression': 'Max DD bi nen',
  'Unprotected open risk': 'Rui ro dang mo khong duoc bao ve',
  'Behavior spiral': 'Vong xoay hanh vi',
  'Capital Preservation Mode': 'Che do bao toan von',
  'Normal Risk Mode': 'Che do rui ro binh thuong',
  'Daily drawdown is above 95%. New trades can push the account into violation.':
    'Daily drawdown dang tren 95%. Lenh moi co the day tai khoan vao trang thai vi pham.',
  'Daily drawdown usage crossed 85%.': 'Ty le dung daily drawdown da vuot 85%.',
  'Daily drawdown usage is above 70%.': 'Ty le dung daily drawdown dang tren 70%.',
  'Half of the daily loss buffer is used.': 'Mot nua buffer daily loss da duoc dung.',
  'Max drawdown buffer is nearly exhausted.': 'Buffer max drawdown gan nhu da can.',
  'Max drawdown usage is above 80%.': 'Ty le dung max drawdown dang tren 80%.',
  'The current time is outside the trading window configured for this challenge.':
    'Thoi gian hien tai nam ngoai khung gio duoc cau hinh cho challenge nay.',
  'One day is contributing too much of the challenge profit.':
    'Mot ngay dang dong gop qua nhieu vao loi nhuan challenge.',
  'The account is entering the drawdown zone where many prop challenges become hard to recover.':
    'Tai khoan dang vao vung drawdown ma nhieu challenge prop firm rat kho hoi phuc.',
  'Stop trading for today and review open position risk.':
    'Dung trade hom nay va review rui ro cac lenh dang mo.',
  'Do not open new trades until next session.':
    'Khong mo lenh moi cho den phien tiep theo.',
  'Reduce risk to 0.25% or stop for the session.': 'Giam risk ve 0.25% hoac dung trade cho phien nay.',
  'Lower position size and require A+ setups only.': 'Giam size va chi thuc thi setup A+.',
  'Switch to capital preservation mode.': 'Chuyen sang che do bao toan von.',
  'Cut risk and stop correlated exposure.': 'Cat risk va dung exposure dong correlation.',
  'Wait for the planned trading window before taking a new trade.':
    'Cho den khung gio trade trong ke hoach truoc khi vao lenh moi.',
  'Reduce risk and avoid forcing a big single-day profit spike.':
    'Giam risk va tranh ep loi nhuan mot ngay qua lon.',
  'Stop adding risk and switch to capital preservation until buffer is rebuilt.':
    'Dung them risk va chuyen sang bao toan von den khi buffer duoc phuc hoi.',
  'Reduce the position or move to a valid planned risk.': 'Giam vi the hoac dua ve muc risk dung ke hoach.',
  'Add a stop loss or close/reduce the position.': 'Them stop loss hoac dong/giam vi the.',
  'Protect the challenge first, then reassess after the next valid session.':
    'Bao ve challenge truoc, sau do danh gia lai o phien hop le tiep theo.',
  'The challenge is close to target. Protect the account and verify min trading days.':
    'Challenge da gan muc tieu. Hay bao ve tai khoan va kiem tra so ngay giao dich toi thieu.',
  'Avoid oversized trades and preserve buffer.': 'Tranh lenh qua size va giu buffer an toan.',
  'The account should prioritize protecting drawdown buffer over pushing profit.':
    'Tai khoan nen uu tien bao ve buffer drawdown hon la ep loi nhuan.',
  'The risk mode should prioritize protecting drawdown buffer over pushing profit.': 'Tai khoan nen uu tien bao ve buffer drawdown hon la ep loi nhuan.',
  'The challenge is healthy enough for selective execution.': 'Challenge con on de chi giao dich co chon loc.',
  'Add a valid SL or reduce/close the unprotected position.':
    'Them SL hop le hoac giam/dong vi the chua duoc bao ve.',
  'Stop opening new trades for today and complete post-session review.':
    'Dung mo lenh moi hom nay va hoan thanh review sau phien.',
  'Drawdown usage is inside the lockdown threshold.': 'Muc dung drawdown da vao nguong lockdown.',
  'Use capital preservation mode for the rest of the day.': 'Dung che do bao toan von cho phan con lai cua ngay.',
  'One normal loss can push the challenge toward violation.': 'Mot lenh thua binh thuong co the day challenge gan vi pham.',
  'Take a 30 minute break and return only with 0.25% risk.':
    'Nghi 30 phut va chi quay lai voi risk 0.25%.',
  'Loss streak plus fast re-entry is the main behavior risk today.':
    'Chuoi thua cong vao lai qua nhanh la rui ro hanh vi chinh hom nay.',
  'Reduce planned risk by 50%.': 'Giam risk ke hoach 50%.',
  'Max 1-2 trades today.': 'Toi da 1-2 lenh hom nay.',
  'Avoid high-impact news and correlated positions.': 'Tranh tin high-impact va cac vi the tuong quan.',
  'Stop after first rule break.': 'Dung ngay sau lan dau vi pham rule.',
  'Normal planned risk only.': 'Chi dung risk binh thuong theo ke hoach.',
  'Trade only A/A+ setup.': 'Chi trade setup A/A+.',
  'Keep SL active.': 'Luon giu SL hoat dong.',
  'Stop after max trades plan.': 'Dung khi dat gioi han so lenh.',
  'Risk buffers are still available, but every trade must stay inside plan.':
    'Buffer rui ro van con, nhung moi trade phai nam trong ke hoach.',
  'Stop or cut risk to minimum.': 'Dung trade hoac cat risk ve muc toi thieu.',
  'Keep risk below the daily stop plan.': 'Giu risk ben duoi daily stop plan.',
  'Pause new risk until the buffer improves.': 'Tam dung risk moi cho den khi buffer cai thien.',
  'Avoid correlated exposure.': 'Tranh exposure co tuong quan.',
  'Add SL or reduce exposure immediately.': 'Them SL hoac giam exposure ngay.',
  'Keep SL in place.': 'Giu SL dung vi tri.',
  'Take a 30 minute reset before any new trade.': 'Reset 30 phut truoc khi vao lenh moi.',
  'Stay inside trade count plan.': 'Giu so lenh trong ke hoach.',
  'No stop loss. Risk cannot be calculated accurately.': 'Khong co stop loss. Khong the tinh risk chinh xac.',
  'Trade is not recommended under the current drawdown buffer.':
    'Khong khuyen nghi trade voi buffer drawdown hien tai.',
  'Pause for 30-45 minutes and reduce next trade risk to 0.25%.':
    'Tam nghi 30-45 phut va giam risk lenh tiep theo ve 0.25%.',
  'Stop after the next invalid setup. The account does not need more volume today.':
    'Dung sau setup khong hop le tiep theo. Tai khoan khong can them volume hom nay.',
  'Require setup tag and planned entry zone before any new order.':
    'Bat buoc co setup tag va vung entry da len ke hoach truoc moi lenh.',
  'Cap risk to the planned percentage and reduce lot after losses.':
    'Khoa risk theo ty le da lap ke hoach va giam lot sau chuoi thua.',
  'Do not widen SL. If thesis is invalid, reduce or close.':
    'Khong noi SL. Neu y tuong trade sai, hay giam hoac dong vi the.',
  'Use partials or a fixed management rule instead of closing winners too early.':
    'Dung chot mot phan hoac rule quan ly co dinh thay vi cat loi qua som.',
  'Avoid the weakest session until the playbook is updated.':
    'Tranh phien yeu nhat cho den khi cap nhat playbook.',
  'No critical behavior risk': 'Khong co rui ro hanh vi khan cap',
  'Revenge trading risk': 'Rui ro revenge trading',
  'Overtrading risk': 'Rui ro overtrading',
  'FOMO entries': 'Lenh FOMO',
  'Oversizing risk': 'Rui ro oversizing',
  'Holding loser too long': 'Giu lenh lo qua lau',
  'Cutting winners early': 'Cat loi som',
  'Bad session window': 'Khung gio xau',
  'All open positions have SL.': 'Tat ca lenh dang mo deu co SL.',
  'Take a 30 minute break after the loss streak.': 'Nghi 30 phut sau chuoi thua.',
  'Set max trades today and stop after the limit.': 'Dat gioi han so lenh hom nay va dung khi dat nguong.',
  'Write the setup name before entering the next trade.': 'Ghi ten setup truoc khi vao lenh tiep theo.',
  'Reduce lot size before the next trade.': 'Giam lot truoc lenh tiep theo.',
  'Review open position risk now.': 'Review rui ro lenh dang mo ngay.',
  'Review exit rules after the session.': 'Review rule thoat lenh sau phien.',
  'Review session performance this week.': 'Review hieu suat theo phien trong tuan nay.',
  'Keep risk within plan and continue journaling.': 'Giu risk trong ke hoach va tiep tuc journaling.',
  'Follow the daily risk plan.': 'Lam theo ke hoach risk trong ngay.',
  'The system protects the challenge by sizing from remaining buffers.':
    'He thong bao ve challenge bang cach tinh size theo buffer con lai.',
  'Clear limits reduce impulsive decisions.': 'Gioi han ro rang giup giam quyet dinh boc dong.',
  'Emotional state affects rule compliance.': 'Trang thai cam xuc anh huong truc tiep den viec tuan thu rule.',
  'Open risk can violate rules before closed PnL updates.': 'Rui ro dang mo co the vi pham rule truoc khi PnL dong cap nhat.',
  'Behavior data powers the AI Guardian.': 'Du lieu hanh vi cung cap suc manh cho AI Guardian.',
  'The Guardian engine': 'Guardian engine',
  'The account does not need more volume today.': 'Tai khoan khong can them volume trong ngay hom nay.',
  'A no-SL position can break daily or max drawdown faster than the Guardian can forecast.':
    'Lenh khong co SL co the pha daily/max drawdown nhanh hon muc Guardian du doan.',
  'The account is healthy enough for selective execution.': 'Tai khoan con khong gian cho giao dich co chon loc.'
}

const exactTextPatternsVi = [
  [/^([\d.,]+) equity, ([\d.,]+) daily DD buffer\.$/, (_, equity, dd) => `${equity} equity, buffer daily DD con lai ${dd}.`],
  [/^([A-Za-z ]+) \u00b7 ([A-Za-z ]+)$/, (_, left, right) => `${left} · ${right}`],
  [/^(\d+) open position has no stop loss\.$/, (_, count) => `${count} lenh dang mo khong co stop loss.`],
  [/^Daily drawdown is (\d+)% used\.$/, (_, pct) => `Daily drawdown dang dung ${pct}%.`],
  [/^Max drawdown buffer is (\d+)% used\.$/, (_, pct) => `Buffer max drawdown dang dung ${pct}%.`],
  [/^(\d+) consecutive losses detected\.$/, (_, count) => `Phat hien ${count} chuoi thua lien tiep.`],
  [/^Daily drawdown is (\d+)% used\.$/, (_, pct) => `Daily drawdown da dung ${pct}%.`],
  [/^Max drawdown buffer is (\d+)% used\.$/, (_, pct) => `Buffer max drawdown da dung ${pct}%.`],
  [/^If the current risk continues, daily drawdown usage can rise from (\d+)%\.$/, (_, pct) => `Neu rui ro hien tai tiep tuc, ty le dung daily drawdown co the tang tu ${pct}%.`],
  [/^Daily DD is (\d+)% used, ([\d.]+) remaining\.$/, (_, used, rem) => `Daily DD da dung ${used}%, con lai ${rem}.`],
  [/^Max DD is (\d+)% used, account DD ([\d.]+)%\.$/, (_, used, dd) => `Max DD da dung ${used}%, account DD ${dd}%.`],
  [/^(\d+)% daily DD used, ([\d.]+) remaining\.$/, (_, used, rem) => `Daily DD da dung ${used}%, con lai ${rem}.`],
  [/^(\d+)% max DD used, account DD ([\d.]+)%\.$/, (_, used, dd) => `Max DD da dung ${used}%, account DD ${dd}%.`],
  [/^(\d+) loss streak, (\d+)\/(\d+) trades today\.$/, (_, streak, count, max) => `Chuoi thua ${streak}, hom nay ${count}/${max} lenh.`],
  [/^([A-Z, ]+) has no SL\.$/, (_, symbols) => `${symbols} khong co SL.`],
  [/^([A-Z]+) has no stop loss\.$/, (_, symbol) => `${symbol} khong co stop loss.`],
  [/^([A-Z]+) can consume most of the remaining daily drawdown if SL is hit\.$/, (_, symbol) => `${symbol} co the "an" phan lon daily drawdown con lai neu hit SL.`],
  [/^(\d+) open position has no stop loss\.$/, (_, count) => `${count} lenh dang mo khong co stop loss.`],
  [/^Trades today exceeded the plan \((\d+)\/(\d+)\)\.$/, (_, a, b) => `So lenh hom nay vuot ke hoach (${a}/${b}).`],
  [/^Daily drawdown is above (\d+)%\.$/, (_, pct) => `Daily drawdown dang tren ${pct}%.`],
  [/^Max drawdown usage is above (\d+)%\.$/, (_, pct) => `Max drawdown dang tren ${pct}%.`],
  [/^The account is entering the drawdown zone where many prop challenges become hard to recover\.$/, () => 'Tai khoan dang vao vung drawdown ma nhieu challenge prop firm rat kho hoi phuc.'],
  [/^The current time is outside the trading window configured for this challenge\.$/, () => 'Thoi gian hien tai nam ngoai khung gio giao dich da cau hinh cho challenge nay.'],
  [/^One day is contributing too much of the challenge profit\.$/, () => 'Mot ngay dang dong gop qua nhieu vao loi nhuan challenge.'],
  [/^The challenge is close to target\. Protect the account and verify min trading days\.$/, () => 'Challenge dang gan target. Hay bao ve tai khoan va kiem tra so ngay giao dich toi thieu.'],
  [/^The account should prioritize protecting drawdown buffer over pushing profit\.$/, () => 'Tai khoan nen uu tien bao ve buffer drawdown hon la ep loi nhuan.']
]

export function usePropGuardianI18n() {
  const uiStore = useUiStore()
  const locale = computed(() => (uiStore.locale === 'en' ? 'en' : 'vi'))

  function pgT(path, params = {}) {
    const dictionary = propGuardianMessages[locale.value] || propGuardianMessages.en
    const fallback = getByPath(propGuardianMessages.en, path) ?? path
    const raw = getByPath(dictionary, path) ?? fallback
    if (typeof raw !== 'string') return String(path)
    return interpolate(raw, params)
  }

  function pgValue(group, value) {
    const key = String(value ?? '')
    const raw = getByPath(propGuardianMessages[locale.value], `${group}.${key}`)
    if (typeof raw === 'string') return raw
    const fallback = getByPath(propGuardianMessages.en, `${group}.${key}`)
    if (typeof fallback === 'string') return fallback
    return humanize(key)
  }

  function pgText(input) {
    const raw = String(input ?? '')
    if (!raw) return raw
    if (locale.value === 'en') return raw

    if (Object.prototype.hasOwnProperty.call(exactTextMapVi, raw)) {
      return exactTextMapVi[raw]
    }

    for (const [regex, mapper] of exactTextPatternsVi) {
      const match = raw.match(regex)
      if (match) return mapper(...match)
    }

    return humanize(raw)
  }

  function alertTypeLabel(type) {
    return pgValue('status', type) !== humanize(type)
      ? pgValue('status', type)
      : (alertTypeLabels[type]?.[locale.value] || humanize(type))
  }

  function issueTypeLabel(type) {
    return issueTypeLabels[type]?.[locale.value] || humanize(type)
  }

  function taskStatusLabel(status) {
    const key = String(status || '').toLowerCase()
    if (key === 'done') return locale.value === 'vi' ? 'Xong' : 'Done'
    if (key === 'skipped') return locale.value === 'vi' ? 'Bo qua' : 'Skip'
    return locale.value === 'vi' ? 'Can lam' : 'Todo'
  }

  function taskCategoryLabel(category) {
    return pgValue('taskcare.categories', category)
  }

  function riskModeLabel(mode) {
    return pgValue('riskMode', mode)
  }

  function statusLabel(value) {
    return pgValue('status', value)
  }

  function severityLabel(value) {
    return pgValue('severity', value)
  }

  function setupValueLabel(value) {
    return pgValue('values', value)
  }

  function decisionLabel(value) {
    const key = String(value || '').toUpperCase()
    if (key === 'NO') return locale.value === 'vi' ? 'KHONG' : 'NO'
    if (key === 'ONLY A+' || key === 'ONLY_A+' || key === 'ONLY A PLUS') return locale.value === 'vi' ? 'CHI A+' : 'ONLY A+'
    if (key === 'YES') return locale.value === 'vi' ? 'CO' : 'YES'
    return humanize(value)
  }

  function bandLabel(value) {
    const key = String(value || '').toLowerCase()
    if (key === 'high') return locale.value === 'vi' ? 'Cao' : 'High'
    if (key === 'medium') return locale.value === 'vi' ? 'Trung binh' : 'Medium'
    if (key === 'low') return locale.value === 'vi' ? 'Thap' : 'Low'
    return humanize(value)
  }

  function healthLabel(value) {
    const key = String(value || '').toLowerCase()
    if (key === 'healthy') return locale.value === 'vi' ? 'Khoe' : 'Healthy'
    if (key === 'watch') return locale.value === 'vi' ? 'Can theo doi' : 'Watch'
    if (key === 'fragile') return locale.value === 'vi' ? 'Mong manh' : 'Fragile'
    if (key === 'critical') return locale.value === 'vi' ? 'Khan cap' : 'Critical'
    return humanize(value)
  }

  function dailyLossModeLabel(mode) {
    return setupValueLabel(mode)
  }

  function drawdownTypeLabel(type) {
    return setupValueLabel(type)
  }

  function alertProblem(alert) {
    const type = String(alert?.type || '').toUpperCase()
    if (issueTypeLabels[type]) return issueTypeLabel(type)
    if (alertTypeLabels[type]) return alertTypeLabel(type)
    return pgText(alert?.problem || alert?.title || '')
  }

  function alertMessage(alert) {
    return pgText(alert?.message || alert?.recommendation || '')
  }

  function alertAction(alert) {
    return pgText(alert?.action || alert?.recommendedAction || '')
  }

  function alertEvidenceLabel(key) {
    const label = getByPath(propGuardianMessages[locale.value], `evidenceKeys.${key}`)
    if (typeof label === 'string') return label
    const fallback = getByPath(propGuardianMessages.en, `evidenceKeys.${key}`)
    if (typeof fallback === 'string') return fallback
    return humanize(key)
  }

  function taskTitle(task) {
    return getByPath(propGuardianMessages[locale.value], `taskText.${task?.id}.title`) || pgText(task?.title || '')
  }

  function taskDescription(task) {
    return getByPath(propGuardianMessages[locale.value], `taskText.${task?.id}.description`) || pgText(task?.description || '')
  }

  function commandLabel(value) {
    return pgText(value)
  }

  function modeTone(mode) {
    return String(mode || '').toLowerCase()
  }

  return {
    locale,
    pgT,
    pgText,
    pgValue,
    alertTypeLabel,
    alertProblem,
    alertMessage,
    alertAction,
    alertEvidenceLabel,
    issueTypeLabel,
    taskTitle,
    taskDescription,
    taskStatusLabel,
    taskCategoryLabel,
    riskModeLabel,
    statusLabel,
    severityLabel,
    setupValueLabel,
    decisionLabel,
    bandLabel,
    healthLabel,
    dailyLossModeLabel,
    drawdownTypeLabel,
    commandLabel,
    modeTone
  }
}
