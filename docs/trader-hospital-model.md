# Trader Hospital Model (MT5 Behavioral Engine v2)

## 1) Du lieu dau vao tu MT5
- `history_deals_get`: lich su deal de tao trade lifecycle (open/close, profit, volume, reason, sl, tp, time).
- Deal properties: `DEAL_REASON`, `DEAL_ENTRY`, `DEAL_TYPE`, `DEAL_TIME`, `DEAL_VOLUME`, `DEAL_PROFIT`.
- Account snapshot: `balance`, `equity`, `profit` (floating PnL).

## 2) Nhom chi so cot loi
- Performance:
  - `winRate = wins / totalDeals * 100`
  - `profitFactor = grossProfit / grossLossAbs`
  - `expectancy = winRate * avgWin - lossRate * avgLoss`
  - `rr = avgWin / avgLoss`
- Risk:
  - `drawdownPct = maxDrawdownAbs / equityPeak * 100`
  - `slCoveragePct = tradesWithSL / totalDeals * 100`
  - `avgTradeRR = mean(reward/risk)` voi trade co SL + TP hop le
- Behavior:
  - `fomoRate = outsidePlanCount / totalDeals * 100`
  - `revengeRate = revengeCount / totalDeals * 100`
  - `overtradePercent = max(0, avgDealsPerDay / 5 - 1) * 100`
  - `quickReentryRate = quickReentryCount / totalDeals * 100`
  - `postLossVolumeEscalationRate = postLossVolumeEscalationCount / totalDeals * 100`

## 3) Risk decomposition (behavioral)
- `impulseControlRisk = 0.45*revengeRate + 0.25*quickReentryRate + 0.30*postLossVolumeEscalationRate`
- `executionDisciplineRisk = 0.50*fomoRate + 0.25*overtradePercent + 0.25*(100-disciplineRate)`
- `capitalProtectionRisk = 0.55*(100-riskManagementScore) + 0.45*drawdownRisk`
- `strategyStabilityRisk = 0.40*directionBiasRisk + 0.30*sessionDriftRisk + 0.30*expectancyRisk`
- `behaviorRiskScore = 0.30*impulseControlRisk + 0.28*executionDisciplineRisk + 0.27*capitalProtectionRisk + 0.15*strategyStabilityRisk`
- `behaviorScore = 100 - behaviorRiskScore`

## 4) Syndrome scoring (Trader Hospital)
- FOMO syndrome:
  - `0.70*fomoRate + 0.20*quickReentryRate + 0.10*(100-disciplineRate)`
- Revenge syndrome:
  - `0.60*revengeRate + 0.40*postLossVolumeEscalationRate`
- Overtrade syndrome:
  - `0.65*overtradePercent + 0.35*quickReentryRate`
- Risk protocol syndrome:
  - `0.75*capitalProtectionRisk + 0.25*expectancyRisk`
- Consistency syndrome:
  - `strategyStabilityRisk`

Severity mapping:
- `>=80`: critical
- `>=60`: high
- `>=40`: medium
- `<40`: low

## 5) Treatment protocol mapping
- Phase `emergency`:
  - tam dung trade 60 phut
  - chi mo lai lenh khi checklist >= 70/100
  - risk moi lenh <= 0.5%
- Phase `stabilize`:
  - toi da 3 lenh/ngay
  - moi lenh bat buoc SL, RR >= 1.5
  - sau lenh thua nghi 20 phut
- Phase `optimize/maintain`:
  - tiep tuc checklist + review cuoi ngay
  - toi uu khung gio/huong trade co edge

Global hard rules:
- `No SL => No Trade`
- `No RR >= 1.5 => No Trade`
- `2 losses in a row => Cool-down`

## 6) Tai lieu hoc thuat va tai lieu goc
- MT5 Python `history_deals_get`:
  - https://www.mql5.com/en/docs/python_metatrader5/mt5historydealsget_py
- MT5 deal properties (`DEAL_REASON`, `DEAL_ENTRY`):
  - https://www.mql5.com/en/docs/constants/tradingconstants/dealproperties
- Prospect Theory (loss aversion, risk behavior):
  - https://www.econometricsociety.org/publications/econometrica/browse/1979/03/01/prospect-theory-analysis-decision-under-risk
- Individual investor underperformance (turnover/behavior):
  - https://www.nber.org/papers/w12223
- Overconfidence and trading frequency:
  - https://www.nber.org/papers/w14727
- What drives trading behavior:
  - https://www.nber.org/papers/w12397
- Disposition effect:
  - https://www.nber.org/papers/w8734
- Implementation intentions for behavior change:
  - https://www.researchgate.net/publication/7109275_Implementation_Intentions_and_Goal_Achievement_A_Meta-Analysis_of_Effects_and_Processes
