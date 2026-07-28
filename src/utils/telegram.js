// Sifariş gələndə Telegram-a bildiriş göndərir. Token/chat_id yoxdursa sükutla keçir (site yenə işləyir).
async function notifyNewOrder(order) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const itemsList = order.items
    .map((it) => `• ${it.name} x${it.qty} — ${(it.price * it.qty).toFixed(2)} AZN`)
    .join('\n');

  const text =
    `🎂 Yeni sifariş #${order.id}\n\n` +
    `👤 Ad: ${order.customer_name}\n` +
    `📞 Tel: ${order.customer_phone}\n` +
    `📍 Ünvan: ${order.customer_address}\n` +
    (order.comment ? `💬 Qeyd: ${order.comment}\n` : '') +
    `\n${itemsList}\n\n` +
    `💰 Cəmi: ${order.total_amount.toFixed(2)} AZN\n` +
    (order.payment_note ? `💳 Ödəniş qeydi: ${order.payment_note}\n` : '');

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    console.error('[telegram] Bildiriş göndərilə bilmədi:', err.message);
  }
}

module.exports = { notifyNewOrder };
