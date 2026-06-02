import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ── NGÂN HÀNG CÂU HỎI ──
export const QUIZ_BANK = [
{q:"Tiền được tạo ra bằng cách nào chủ yếu trong hệ thống hiện đại?",opts:["Nhà nước in tiền giấy trực tiếp","Ngân hàng thương mại tạo tiền qua cho vay","Khai thác vàng và bạc","Chính phủ phát hành trái phiếu"],ans:1,exp:"Phần lớn tiền trong kinh tế hiện đại được tạo ra khi ngân hàng thương mại cấp tín dụng cho vay."},
{q:"Lạm phát 8%/năm có nghĩa là:",opts:["Tài sản của bạn tăng 8%","Sức mua của tiền giảm 8%","Lãi suất tăng 8%","GDP tăng 8%"],ans:1,exp:"Lạm phát 8% = giá cả tăng 8% = $100 hôm nay chỉ mua được $92 giá trị sau 1 năm."},
{q:"Thị trường Forex giao dịch mấy giờ mỗi ngày?",opts:["8 giờ (theo giờ NYSE)","16 giờ","24 giờ, 5 ngày/tuần","24 giờ, 7 ngày/tuần"],ans:2,exp:"Forex hoạt động 24/5 — mở từ Sydney Chủ nhật đến New York thứ Sáu, không nghỉ cuối tuần."},
{q:"Thị trường nào giao dịch 24/7 không nghỉ?",opts:["Forex","Chứng khoán (Stocks)","Crypto","Hàng hóa (Commodities)"],ans:2,exp:"Crypto là thị trường duy nhất hoạt động 24/7 kể cả cuối tuần và ngày lễ."},
{q:"Bull Market được định nghĩa là thị trường:",opts:["Giảm 10% từ đỉnh","Tăng 20%+ từ đáy gần nhất","Đi ngang trong 6 tháng","Có khối lượng thấp"],ans:1,exp:"Bull market = thị trường tăng 20%+ từ đáy gần nhất, kéo dài ít nhất 2 tháng."},
{q:"Fed là viết tắt của:",opts:["Federal Exchange Department","Federal Reserve (Cục Dự trữ Liên bang Mỹ)","Foreign Exchange Division","Financial Exchange Director"],ans:1,exp:"Fed = Federal Reserve System — ngân hàng trung ương của Mỹ, điều hành chính sách tiền tệ."},
{q:"Khi Fed tăng lãi suất, tác động đầu tiên đến USD là:",opts:["USD yếu đi","USD mạnh lên","USD không thay đổi","USD mất giá"],ans:1,exp:"Lãi suất cao → USD hấp dẫn hơn với nhà đầu tư → dòng vốn chảy vào → USD tăng giá."},
{q:"Lãi suất tăng → USD mạnh → Vàng thường:",opts:["Tăng theo USD","Giảm (vì Vàng tính bằng USD và không sinh lãi)","Không đổi","Tăng gấp đôi"],ans:1,exp:"Vàng tính bằng USD nên USD mạnh → cần ít USD mua vàng hơn → giá vàng giảm."},
{q:"'Hawkish' của ngân hàng trung ương có nghĩa là:",opts:["Ủng hộ nới lỏng tiền tệ, giảm lãi suất","Ủng hộ thắt chặt tiền tệ, tăng lãi suất","Chính sách trung lập","Không có quan điểm rõ ràng"],ans:1,exp:"Hawkish = diều hâu = ủng hộ tăng lãi suất để kiểm soát lạm phát → tốt cho đồng tiền đó."},
{q:"NFP (Non-Farm Payroll) là:",opts:["Chỉ số giá nông sản","Báo cáo việc làm phi nông nghiệp Mỹ — chỉ số lao động quan trọng nhất","Tỷ lệ thất nghiệp hàng tháng","GDP hàng quý của Mỹ"],ans:1,exp:"NFP phát hành thứ Sáu đầu tháng, đo số việc làm mới tạo ra — tác động mạnh nhất đến USD."},
{q:"'Bid' trong Forex là:",opts:["Giá bạn có thể MUA","Giá broker sẵn sàng MUA từ bạn (giá bạn SELL)","Chênh lệch giá mua bán","Phí hoa hồng"],ans:1,exp:"Bid = giá broker mua vào = giá bạn bán ra. Luôn thấp hơn Ask."},
{q:"1 Standard Lot trong Forex bằng bao nhiêu đơn vị tiền tệ?",opts:["1,000","10,000","100,000","1,000,000"],ans:2,exp:"1 Standard Lot = 100,000 đơn vị tiền tệ cơ sở. Mini lot = 10,000. Micro lot = 1,000."},
{q:"Đòn bẩy 1:100 có nghĩa:",opts:["Lợi nhuận tăng 100 lần, rủi ro không đổi","Kiểm soát $100,000 chỉ với $1,000 margin","Phí giảm 100 lần","Spread giảm 100 lần"],ans:1,exp:"Leverage 1:100 = $1,000 margin kiểm soát $100,000 vị thế. Khuếch đại cả lời lẫn lỗ 100x."},
{q:"'Long' trong trading có nghĩa:",opts:["Giữ lệnh lâu","Mua vào, kỳ vọng giá tăng","Bán khống","Không có vị thế"],ans:1,exp:"Long = mua vào = buy = kỳ vọng giá tăng để bán cao hơn kiếm lời."},
{q:"Stop Loss (SL) được đặt để:",opts:["Tối đa hóa lợi nhuận","Giới hạn thua lỗ tối đa khi giá đi ngược chiều","Tự động chốt lời","Tăng đòn bẩy"],ans:1,exp:"SL = mức giá khi chạm vào lệnh tự đóng → bảo vệ tài khoản khỏi thua lỗ quá lớn."},
{q:"'Risk-on' trong tài chính có nghĩa:",opts:["Nhà đầu tư tránh rủi ro, mua tài sản an toàn","Nhà đầu tư chấp nhận rủi ro, mua tài sản lợi nhuận cao","Thị trường đang giảm","Lãi suất tăng"],ans:1,exp:"Risk-on = nhà đầu tư lạc quan, mua cổ phiếu, crypto, AUD, NZD — tài sản rủi ro cao hơn."},
{q:"DXY (Dollar Index) đo lường:",opts:["Giá USD so với Vàng","Sức mạnh USD so với rổ 6 đồng tiền lớn (EUR, JPY, GBP, CAD, SEK, CHF)","Lạm phát của Mỹ","Thâm hụt thương mại Mỹ"],ans:1,exp:"DXY = chỉ số đo giá trị USD so với 6 đồng tiền chính. DXY tăng = USD mạnh."},
{q:"Bitcoin được tạo ra vào năm nào và bởi ai?",opts:["2005, Elon Musk","2009, Satoshi Nakamoto (bút danh)","2010, Vitalik Buterin","2008, Ngân hàng Trung ương"],ans:1,exp:"Bitcoin ra đời năm 2009 bởi Satoshi Nakamoto — danh tính thật đến nay vẫn là bí ẩn."},
{q:"Nến Doji có đặc điểm chính là:",opts:["Thân nến rất dài","Thân nến gần bằng 0 — giá mở và đóng gần nhau","Bóng trên rất dài","Không có bóng nến"],ans:1,exp:"Doji = thân nến cực nhỏ vì giá mở/đóng gần nhau → thị trường do dự, cân bằng mua bán."},
{q:"Hammer xuất hiện ở ĐÁY xu hướng giảm báo hiệu:",opts:["Tiếp tục giảm","Đảo chiều tăng tiềm năng — bóng dưới dài thể hiện phe mua phản công","Sideway tiếp tục","Không có ý nghĩa"],ans:1,exp:"Hammer ở đáy downtrend = bóng dưới dài → giá bị đẩy xuống nhưng mua kéo lên → bullish reversal."},
{q:"Bullish Engulfing gồm:",opts:["Hai nến xanh liên tiếp","Nến đỏ nhỏ + nến xanh lớn bao trùm hoàn toàn nến trước","Nến xanh + nến đỏ lớn","Ba nến xanh"],ans:1,exp:"Bullish engulfing = nến đỏ nhỏ + nến xanh lớn bao trùm → phe mua áp đảo → đảo chiều tăng."},
{q:"Morning Star là mô hình 3 nến báo hiệu:",opts:["Tiếp tục giảm","Đảo chiều tăng ở đáy — nến đỏ, Doji/nhỏ, nến xanh","Tiếp tục tăng","Sideway"],ans:1,exp:"Morning Star ở đáy downtrend: nến đỏ lớn + nến Doji/nhỏ + nến xanh lớn = bullish reversal."},
{q:"Uptrend được xác định bởi:",opts:["Lower High và Lower Low","Higher High (HH) và Higher Low (HL) liên tiếp","Giá đi ngang","Khối lượng thấp"],ans:1,exp:"Uptrend = HH + HL liên tiếp = đỉnh sau cao hơn đỉnh trước, đáy sau cao hơn đáy trước."},
{q:"Support (hỗ trợ) là vùng:",opts:["Giá thường bị từ chối khi tăng","Giá thường dừng và bật lên khi giảm — có lực cầu mạnh","Giá không thể vượt qua","Vùng không quan trọng"],ans:1,exp:"Support = vùng cầu (demand) mạnh, khi giá chạm vào thường bật lên vì người mua xuất hiện."},
{q:"Double Top là mô hình:",opts:["Tiếp diễn tăng","Đảo chiều giảm — 2 đỉnh bằng nhau + phá vỡ neckline xuống","Tiếp diễn giảm","Đảo chiều tăng"],ans:1,exp:"Double Top ở đỉnh uptrend: 2 lần test resistance không qua + phá neckline = bearish reversal."},
{q:"RSI (Relative Strength Index) dao động trong khoảng:",opts:["−100 đến +100","0 đến 100","0 đến 200","Không giới hạn"],ans:1,exp:"RSI dao động 0-100. Trên 70 = overbought. Dưới 30 = oversold. 50 = trung tính."},
{q:"MACD được tính bằng:",opts:["EMA12 + EMA26","EMA12 − EMA26 (và Signal line = EMA9 của MACD)","SMA50 − SMA200","RSI trừ đi Stochastic"],ans:1,exp:"MACD = EMA12 − EMA26. Signal line = EMA9 của MACD. Histogram = MACD − Signal."},
{q:"Bollinger Bands gồm:",opts:["1 đường trung bình","2 đường","3 đường: Middle band (SMA20) + Upper band + Lower band (±2SD)","5 đường"],ans:2,exp:"Bollinger Bands = SMA20 (middle) ± 2 standard deviations. Khoảng 95% giá nằm trong dải này."},
{q:"Fibonacci Retracement mức 61.8% được gọi là:",opts:["Mức kém quan trọng nhất","Golden Ratio — mức thoái lui phổ biến và mạnh nhất trong Fibonacci","Mức ngẫu nhiên","Chỉ dùng trong Forex"],ans:1,exp:"61.8% = Golden Ratio = tỷ lệ xuất hiện trong tự nhiên và tài chính. Mức Fibonacci quan trọng nhất."},
{q:"FOMO trong trading là viết tắt của:",opts:["Follow Our Market Orders","Fear Of Missing Out — sợ bỏ lỡ cơ hội","Fixed Order Management Operation","Fast Order Mode Only"],ans:1,exp:"FOMO = Fear Of Missing Out = vào lệnh vì sợ bỏ lỡ, không có setup rõ ràng → thường thua lỗ."},
{q:"Revenge Trading (giao dịch trả thù) là:",opts:["Giao dịch sau khi nghiên cứu kỹ","Vào lệnh ngay sau khi thua để gỡ lại — quyết định từ cảm xúc tức giận","Chiến lược phục hồi có kế hoạch","Giao dịch ngược xu hướng"],ans:1,exp:"Revenge trading = cảm xúc sau khi thua → vào lệnh thiếu kế hoạch → thường thua tiếp hoặc nặng hơn."},
{q:"Quy tắc 1-2% trong quản lý rủi ro có nghĩa:",opts:["Lợi nhuận mục tiêu 1-2% mỗi lệnh","Không rủi ro quá 1-2% tổng tài khoản mỗi lệnh","Chỉ giao dịch 1-2 lần mỗi ngày","Spread tối đa 1-2%"],ans:1,exp:"2% rule: rủi ro $200 với tài khoản $10,000. Thua 50 lệnh liên tiếp vẫn còn 36% tài khoản."},
{q:"Risk/Reward Ratio 1:2 có nghĩa:",opts:["Rủi ro $2, mục tiêu $1","Rủi ro $1, mục tiêu $2 — tối thiểu khuyến nghị cho mọi lệnh","Winrate phải 50%","Tỷ lệ margin"],ans:1,exp:"R:R 1:2 = mỗi đồng rủi ro có thể kiếm 2 đồng. Chỉ cần winrate >33% là có lãi dài hạn."},
{q:"Loss Aversion (sợ mất) trong trading biểu hiện qua:",opts:["Cắt lỗ nhanh theo kế hoạch","Giữ lệnh thua quá lâu vì không muốn chấp nhận lỗ + thoát lệnh lãi quá sớm","Theo đúng trading plan","Không có cảm xúc khi trading"],ans:1,exp:"Loss aversion = đau khi mất > vui khi thắng → giữ lệnh thua và cắt lệnh lãi sớm = sai hoàn toàn."},
{q:"Price Action trading là phương pháp:",opts:["Chỉ dùng nhiều indicator","Đọc hành vi giá thuần túy — ít hoặc không dùng indicator","Phân tích tin tức","Giao dịch theo cảm tính"],ans:1,exp:"Price Action = đọc câu chuyện mua bán qua nến và cấu trúc thị trường — không phụ thuộc indicator."},
{q:"Supply Zone (Vùng cung) là:",opts:["Vùng có nhiều lệnh mua","Vùng có nhiều lệnh bán của institutional — giá thường bị từ chối khi quay lại","Vùng support","Vùng sideway"],ans:1,exp:"Supply zone = nơi institutional đặt lệnh bán lớn. Khi giá quay lại, thường bị đẩy xuống."},
{q:"Liquidity Grab là:",opts:["Tăng thanh khoản thị trường","Smart money đẩy giá qua vùng stop loss cluster → lấy liquidity → đảo chiều ngay","Khối lượng tăng đột biến","Breakout thật"],ans:1,exp:"Liquidity grab = giá sweep qua stop loss của retail → trigger orders đó → SM đảo chiều ngay sau."},
{q:"Wyckoff Method xác định 4 giai đoạn thị trường theo thứ tự:",opts:["Markup → Accumulation → Distribution → Markdown","Accumulation → Markup → Distribution → Markdown","Distribution → Accumulation → Markup → Markdown","Không có thứ tự cố định"],ans:1,exp:"Wyckoff cycle: tích lũy → tăng → phân phối → giảm. Lặp đi lặp lại trong mọi thị trường."},
{q:"Elliott Wave Impulse gồm bao nhiêu sóng?",opts:["3","5 sóng (1-2-3-4-5) theo xu hướng chính","7","Không cố định"],ans:1,exp:"Impulse wave = 5 sóng. Sóng 1,3,5 đi theo trend. Sóng 2,4 điều chỉnh. Sóng 3 thường mạnh nhất."},
{q:"Sharpe Ratio đo lường:",opts:["Tổng lợi nhuận","Lợi nhuận điều chỉnh theo rủi ro — càng cao càng tốt, >1 là tốt","Tổng số lệnh thắng","Max drawdown"],ans:1,exp:"Sharpe = (Return − Risk free rate) / Std deviation. >1 = tốt. >2 = xuất sắc. <0 = tệ hơn risk-free."},
{q:"Winrate 40% với R:R 1:3 có profitable không?",opts:["Không — winrate quá thấp","Có — expectancy dương: 40%×3 − 60%×1 = +0.6R","Hòa vốn","Không tính được"],ans:1,exp:"40%×3R − 60%×1R = 1.2R − 0.6R = +0.6R mỗi lệnh. Profitable dù winrate dưới 50%."},
{q:"Drawdown 50% cần lợi nhuận bao nhiêu để phục hồi?",opts:["50%","75%","100%","25%"],ans:2,exp:"Mất 50% = còn $50. Cần +100% từ $50 để về lại $100. Đây là lý do tránh drawdown lớn."},
{q:"Volume tăng mạnh khi giá phá vỡ resistance có ý nghĩa:",opts:["Breakout giả","Breakout thật — nhiều participants tham gia = conviction cao = đáng tin cậy hơn","Volume không quan trọng","Tín hiệu bán"],ans:1,exp:"Volume cao khi breakout = nhiều người tin vào move đó = self-fulfilling = breakout mạnh hơn."},
{q:"Lý do 90% retail trader thua lỗ dài hạn là:",opts:["Thị trường không công bằng","Kết hợp: thiếu edge thật, quản lý rủi ro kém, cảm xúc không kiểm soát, thiếu kỷ luật","Broker gian lận","Không đủ vốn"],ans:1,exp:"Nguyên nhân thật: no edge + poor risk management + emotional decisions + no discipline = formula thua."},
]

export const useQuizStore = defineStore('quiz', () => {
  const sessionQuizzes  = ref([])
  const currentIndex    = ref(0)
  const score           = ref(0)
  const currentShuffled = ref(null)
  const answered        = ref(false)

  const currentQuestion = computed(() => sessionQuizzes.value[currentIndex.value])
  const progress        = computed(() => (currentIndex.value / 20) * 100)
  const isFinished      = computed(() => currentIndex.value >= 20)

  function startQuiz() {
    const shuffled = [...QUIZ_BANK].sort(() => Math.random() - 0.5)
    sessionQuizzes.value = shuffled.slice(0, 20)
    currentIndex.value   = 0
    score.value          = 0
    answered.value       = false
    _shuffle()
  }

  function _shuffle() {
    const q = currentQuestion.value
    if (!q) return
    const correctText = q.opts[q.ans]
    const indices = [0,1,2,3].sort(() => Math.random() - 0.5)
    const opts    = indices.map(i => q.opts[i])
    currentShuffled.value = { opts, correctIdx: opts.indexOf(correctText) }
    answered.value = false
  }

  function submitAnswer(idx) {
    if (answered.value) return
    answered.value = true
    if (idx === currentShuffled.value.correctIdx) score.value += 10
  }

  function nextQuestion() {
    currentIndex.value++
    if (!isFinished.value) _shuffle()
  }

  return { sessionQuizzes, currentIndex, score, currentShuffled, answered,
           currentQuestion, progress, isFinished,
           startQuiz, submitAnswer, nextQuestion }
})