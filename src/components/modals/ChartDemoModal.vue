<template>
  <div>
    <div class="modal-title">📊 Chart Demo – Thực Chiến Ảo</div>
    <div v-if="!placed">
      <div style="background:rgba(155,39,175,.1);border:1px solid rgba(192,64,251,.2);border-radius:10px;padding:14px;margin-bottom:16px">
        <div style="font-family:'Orbitron',sans-serif;font-size:12px;color:var(--violet-light);margin-bottom:8px;letter-spacing:1px">BTCUSDT · 1H</div>
        <div style="display:flex;gap:16px;font-size:14px">
          <span style="color:var(--text-muted)">Giá hiện tại:</span>
          <span style="color:#fff;font-weight:700">{{ btcPrice || 'Loading...' }}</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        <div>
          <label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">Stop Loss (SL)</label>
          <input v-model="sl" type="number" placeholder="Nhập SL..." style="width:100%;padding:10px 12px;background:rgba(255,23,68,.08);border:1px solid rgba(255,23,68,.3);border-radius:8px;color:#fff;font-family:'Rajdhani',sans-serif;font-size:14px;outline:none" />
        </div>
        <div>
          <label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">Take Profit (TP)</label>
          <input v-model="tp" type="number" placeholder="Nhập TP..." style="width:100%;padding:10px 12px;background:rgba(0,230,118,.08);border:1px solid rgba(0,230,118,.3);border-radius:8px;color:#fff;font-family:'Rajdhani',sans-serif;font-size:14px;outline:none" />
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button @click="place('buy')" style="padding:12px;background:var(--green);border:none;border-radius:10px;color:#000;font-family:'Orbitron',sans-serif;font-size:12px;font-weight:700;cursor:pointer;letter-spacing:1px">📈 BUY LONG</button>
        <button @click="place('sell')" style="padding:12px;background:var(--red);border:none;border-radius:10px;color:#fff;font-family:'Orbitron',sans-serif;font-size:12px;font-weight:700;cursor:pointer;letter-spacing:1px">📉 SELL SHORT</button>
      </div>
    </div>
    <div v-else style="text-align:center;padding:20px 0">
      <div style="font-size:44px;margin-bottom:16px">{{ dir==='buy'?'🟢':'🔴' }}</div>
      <div style="font-size:15px;color:#fff;margin-bottom:12px">Lệnh đã được ghi nhận!</div>
      <div style="background:rgba(255,255,255,.04);border-radius:10px;padding:14px;text-align:left;font-size:13px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:var(--text-muted)">Hướng:</span><strong>{{ dir==='buy'?'LONG 📈':'SHORT 📉' }}</strong></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:var(--text-muted)">SL:</span><strong style="color:var(--red)">{{ sl?'$'+Number(sl).toLocaleString():'Chưa đặt' }}</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">TP:</span><strong style="color:var(--green)">{{ tp?'$'+Number(tp).toLocaleString():'Chưa đặt' }}</strong></div>
      </div>
      <button class="modal-btn" @click="modal.closeModal()">XONG</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useModalStore }  from '../../stores/useModalStore.js'

const modal    = useModalStore()
const sl       = ref('')
const tp       = ref('')
const btcPrice = ref('')
const placed   = ref(false)
const dir      = ref('')

onMounted(async () => {
  try {
    const r = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT')
    const d = await r.json()
    btcPrice.value = '$' + parseFloat(d.price).toLocaleString('en-US', { maximumFractionDigits: 0 })
  } catch {}
})

function place(d) { dir.value = d; placed.value = true }
</script>