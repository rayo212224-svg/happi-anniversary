// ตัวแปรเก็บรูปภาพ Base64 ที่ผ่านการบีบอัดแล้ว
let compressedImageBase64 = "";

// ฟังก์ชันย่อขนาดรูปภาพก่อนอัปโหลดขึ้น Cloud (ช่วยให้โหลดไวและไม่เปลืองเนื้อที่)
function compressImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        const img = new Image();
        img.src = evt.target.result;
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const MAX_SIZE = 500; // กำหนดขนาดสูงสุด 500px
            let w = img.width, h = img.height;

            if (w > h) { 
                if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } 
            } else { 
                if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } 
            }

            canvas.width = w; 
            canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            
            // แปลงรูปเป็น Base64 ความละเอียด 80%
            compressedImageBase64 = canvas.toDataURL('image/jpeg', 0.8);
            
            const prev = document.getElementById('img-preview');
            prev.src = compressedImageBase64;
            prev.classList.remove('hidden');
        }
    };
    reader.readAsDataURL(file);
}

// แอดมินเพิ่มการ์ดใหม่ลง Cloud Database
function adminAddCard(e) {
    e.preventDefault();
    const cardId = Date.now();
    const cardData = {
        id: cardId,
        title: document.getElementById('card-title').value,
        message: document.getElementById('card-msg').value,
        image: compressedImageBase64 || "https://via.placeholder.com/200",
        price: parseInt(document.getElementById('card-price').value),
        sellPrice: parseInt(document.getElementById('card-sell').value),
        dropRate: parseInt(document.getElementById('card-rate').value)
    };

    db.ref('cards/' + cardId).set(cardData);
    writeRealtimeLog(`แอดมินเพิ่มการ์ดใหม่: ${cardData.title}`);
    showModal("สำเร็จ", "เพิ่มการ์ดลง Cloud เรียบร้อยแล้ว");

    // ล้างฟอร์ม
    document.getElementById('card-title').value = '';
    document.getElementById('card-msg').value = '';
    document.getElementById('card-img-file').value = '';
    document.getElementById('img-preview').classList.add('hidden');
    compressedImageBase64 = "";
}

// แอดมินส่งเพชร / จดหมาย หาผู้เล่น Real-time
function adminSendMail() {
    const target = document.getElementById('admin-mail-target').value;
    const msg = document.getElementById('admin-mail-msg').value;
    const amt = parseInt(document.getElementById('admin-mail-amt').value) || 0;
    const mailId = Date.now();

    const mailData = { 
        id: mailId, 
        target: target, 
        msg: msg, 
        diamonds: amt, 
        claimedBy: {} 
    };

    db.ref('mails/' + mailId).set(mailData);
    writeRealtimeLog(`แอดมินส่งจดหมายและ ${amt} 💎 ให้ผู้ใช้: ${target}`);
    showModal("สำเร็จ", "ส่งจดหมาย Real-time เรียบร้อยแล้ว");

    document.getElementById('admin-mail-msg').value = '';
}

// แอดมินบันทึกข้อความต้อนรับ
function adminSaveWelcome() {
    const msg = document.getElementById('admin-welcome-input').value;
    db.ref('settings/welcomeMsg').set(msg);
    showModal("สำเร็จ", "บันทึกข้อความต้อนรับแล้ว");
}

// ตัวดักจับข้อมูล Real-time สำหรับหน้าแอดมิน (อัปเดตอัตโนมัติเมื่อมีคนเล่น)
function initRealtimeAdminListeners() {
    // 1. ดึง Log กิจกรรม 20 รายการล่าสุดแบบ Real-time
    db.ref('logs').limitToLast(20).on('value', snapshot => {
        const logsObj = snapshot.val() || {};
        const logsArr = Object.values(logsObj).reverse();
        document.getElementById('realtime-logs').innerHTML = logsArr.length > 0 ? logsArr.join('<br>') : "ยังไม่มีประวัติกิจกรรม";
    });

    // 2. ดึงข้อมูลผู้ใช้งานทุกคนแบบ Real-time (ดูรหัสผ่านและเพชรได้)
    db.ref('users').on('value', snapshot => {
        const usersObj = snapshot.val() || {};
        let html = `<table><tr><th>Username</th><th>Password</th><th>ชื่อเล่น</th><th>เพชร</th></tr>`;
        let selectHtml = `<option value="all">-- ผู้เล่นทุกคน --</option>`;

        Object.values(usersObj).forEach(u => {
            html += `<tr><td>${u.username}</td><td>${u.password}</td><td>${u.nickname}</td><td>${u.diamonds} 💎</td></tr>`;
            selectHtml += `<option value="${u.username}">${u.nickname} (${u.username})</option>`;
        });
        document.getElementById('admin-users-table').innerHTML = html + `</table>`;
        document.getElementById('admin-mail-target').innerHTML = selectHtml;
    });

    // 3. ดึงรายการการ์ดทั้งหมดแบบ Real-time
    db.ref('cards').on('value', snapshot => {
        const cardsObj = snapshot.val() || {};
        let html = `<table><tr><th>รูป</th><th>ชื่อการ์ด</th><th>ราคา</th><th>จัดการ</th></tr>`;
        Object.values(cardsObj).forEach(c => {
            html += `<tr>
                <td><img src="${c.image}" width="35" style="border-radius:4px;"></td>
                <td>${c.title}</td>
                <td>${c.price} 💎</td>
                <td><button class="btn btn-danger btn-sm" onclick="deleteCloudCard(${c.id})">ลบ</button></td>
            </tr>`;
        });
        document.getElementById('admin-cards-table').innerHTML = html + `</table>`;
    });

    // 4. ดึงข้อความต้อนรับปัจจุบันมาแสดงในช่องแก้ไข
    db.ref('settings/welcomeMsg').once('value', snapshot => {
        if (snapshot.exists()) {
            document.getElementById('admin-welcome-input').value = snapshot.val();
        }
    });
}

// ลบการ์ดออกจาก Cloud
function deleteCloudCard(id) {
    db.ref('cards/' + id).remove();
    writeRealtimeLog(`แอดมินลบการ์ดรหัส: ${id}`);
}