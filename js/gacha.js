// ฟังก์ชันสุ่มการ์ด (Gacha System)
function playGacha() {
    if (currentUser.diamonds < 100) {
        return showModal("เพชรไม่พอ", "คุณต้องมีอย่างน้อย 100 💎 เพื่อสุ่มการ์ด");
    }

    db.ref('cards').once('value', snapshot => {
        const cardsObj = snapshot.val();
        if (!cardsObj) return showModal("แจ้งเตือน", "ยังไม่มีการ์ดในระบบ ให้แอดมินเพิ่มการ์ดก่อนนะครับ");

        const cards = Object.values(cardsObj);
        
        // คำนวณน้ำหนักสุ่มตาม Rate (%)
        let totalWeight = cards.reduce((sum, c) => sum + (c.dropRate || 10), 0);
        let randomNum = Math.random() * totalWeight;
        let selectedCard = null;

        for (let card of cards) {
            if (randomNum < (card.dropRate || 10)) {
                selectedCard = card;
                break;
            }
            randomNum -= (card.dropRate || 10);
        }

        if (!selectedCard) selectedCard = cards[0];

        // หักเพชร 100 💎 และเพิ่มการ์ดลงคลัง
        currentUser.diamonds -= 100;
        if (!currentUser.inventory) currentUser.inventory = [];
        currentUser.inventory.push(selectedCard);

        saveUserData();
        writeRealtimeLog(`${currentUser.nickname} สุ่มได้การ์ด: [${selectedCard.title}]`);

        // แสดงผลการสุ่ม
        showModal("🎉 ยินดีด้วย!", `
            <div style="text-align:center;">
                <img src="${selectedCard.image}" style="width:160px; height:160px; object-fit:cover; border-radius:12px; margin-bottom:10px;">
                <h3 style="color:var(--primary);">${selectedCard.title}</h3>
                <p style="font-size:13px; color:var(--text-muted);">${selectedCard.message || ''}</p>
            </div>
        `);
    });
}

// โหลดรายการการ์ดในหน้า "ร้านค้า"
function loadShopItems() {
    const shopList = document.getElementById('shop-list');
    db.ref('cards').on('value', snapshot => {
        const cardsObj = snapshot.val() || {};
        const cards = Object.values(cardsObj);

        if (cards.length === 0) {
            shopList.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:var(--text-muted);">ไม่มีสินค้าในร้านค้าขณะนี้</p>`;
            return;
        }

        shopList.innerHTML = cards.map(c => `
            <div class="item-card">
                <img src="${c.image}" alt="${c.title}">
                <h4>${c.title}</h4>
                <p style="font-size:12px; color:var(--text-muted); margin:4px 0;">${c.message || ''}</p>
                <button class="btn btn-primary btn-sm" onclick="buyCard('${c.id}')" style="margin-top:8px;">
                    ซื้อ (${c.price} 💎)
                </button>
            </div>
        `).join('');
    });
}

// ซื้อการ์ดจากร้านค้า
function buyCard(cardId) {
    db.ref('cards/' + cardId).once('value', snapshot => {
        const card = snapshot.val();
        if (!card) return;

        if (currentUser.diamonds < card.price) {
            return showModal("เพชรไม่พอ", `คุณต้องการ ${card.price} 💎 เพื่อซื้อการ์ดนี้`);
        }

        currentUser.diamonds -= card.price;
        if (!currentUser.inventory) currentUser.inventory = [];
        currentUser.inventory.push(card);

        saveUserData();
        writeRealtimeLog(`${currentUser.nickname} ซื้อการ์ด: [${card.title}]`);
        showModal("สำเร็จ!", `คุณได้รับ [${card.title}] เรียบร้อยแล้ว`);
        loadInventoryItems();
    });
}

// โหลดรายการการ์ดใน "คลังของฉัน"
function loadInventoryItems() {
    const invList = document.getElementById('inventory-list');
    const inv = currentUser.inventory || [];

    if (inv.length === 0) {
        invList.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:var(--text-muted);">คลังของคุณยังว่างเปล่า ไปสุ่มหรือซื้อการ์ดกันเลย!</p>`;
        return;
    }

    invList.innerHTML = inv.map((item, idx) => `
        <div class="item-card">
            <img src="${item.image}" alt="${item.title}">
            <h4>${item.title}</h4>
            <p style="font-size:12px; color:var(--text-muted); margin:4px 0;">${item.message || ''}</p>
            <button class="btn btn-danger btn-sm" onclick="sellCard(${idx})" style="margin-top:8px;">
                ขายคืน (+${item.sellPrice || 50} 💎)
            </button>
        </div>
    `).join('');
}

// ขายการ์ดคืนเพื่อรับเพชร
function sellCard(index) {
    const item = currentUser.inventory[index];
    if (!item) return;

    const sellPrice = item.sellPrice || 50;
    currentUser.diamonds += sellPrice;
    currentUser.inventory.splice(index, 1);

    saveUserData();
    writeRealtimeLog(`${currentUser.nickname} ขายการ์ด: [${item.title}] ได้รับ ${sellPrice} 💎`);
    showModal("ขายสำเร็จ", `คุณได้รับ +${sellPrice} 💎`);
    loadInventoryItems();
}

// โหลดกล่องจดหมาย Real-time
function loadMailboxItems() {
    const mailList = document.getElementById('mailbox-list');
    db.ref('mails').on('value', snapshot => {
        const mailsObj = snapshot.val() || {};
        const mails = Object.values(mailsObj).filter(m => m.target === 'all' || m.target === currentUser.username);

        if (mails.length === 0) {
            mailList.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:var(--text-muted);">ไม่มีจดหมายใหม่</p>`;
            return;
        }

        mailList.innerHTML = mails.map(m => {
            const isClaimed = m.claimedBy && m.claimedBy[currentUser.username];
            return `
                <div class="item-card" style="text-align:left;">
                    <h4>✉️ จดหมายจากแอดมิน</h4>
                    <p style="font-size:13px; margin:8px 0; color:var(--text-main);">${m.msg}</p>
                    <p style="font-size:12px; color:var(--primary); font-weight:bold;">แนบมา: +${m.diamonds} 💎</p>
                    <button class="btn ${isClaimed ? 'btn-secondary' : 'btn-accent'} btn-sm" 
                        onclick="claimMail('${m.id}', ${m.diamonds})" 
                        ${isClaimed ? 'disabled' : ''} 
                        style="margin-top:10px; width:100%;">
                        ${isClaimed ? 'รับแล้ว ✅' : 'กดรับของขวัญ 🎁'}
                    </button>
                </div>
            `;
        }).join('');
    });
}

// กดรับของขวัญจากจดหมาย
function claimMail(mailId, diamonds) {
    db.ref(`mails/${mailId}/claimedBy/${currentUser.username}`).set(true);
    currentUser.diamonds += diamonds;

    saveUserData();
    writeRealtimeLog(`${currentUser.nickname} รับจดหมายได้ +${diamonds} 💎`);
    showModal("สำเร็จ!", `คุณได้รับ +${diamonds} 💎 เข้าบัญชีเรียบร้อย`);
}