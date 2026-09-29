// ข้อมูลผู้ใช้งานปัจจุบัน
let currentUser = null;

// เริ่มต้นใช้งานแอปหลังล็อกอินสำเร็จ
function startApp() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('app-section').classList.remove('hidden');

    // อัปเดตข้อมูลบน Navbar
    updateUserUI();

    // หากเป็นผู้ใช้ทั่วไป ให้ซิงค์ข้อมูล real-time จาก Cloud
    if (!currentUser.isAdmin) {
        db.ref('users/' + currentUser.username).on('value', snapshot => {
            if (snapshot.exists()) {
                currentUser = snapshot.val();
                updateUserUI();
            }
        });
    } else {
        // หากเป็นแอดมิน ให้แสดงปุ่มแท็บแอดมินและเปิดระบบ Monitoring
        document.getElementById('admin-tab-btn').classList.remove('hidden');
        initRealtimeAdminListeners();
    }

    // โหลดข้อมูลเริ่มต้นของแต่ละแท็บ
    loadShopItems();
    loadMailboxItems();
}

// อัปเดตชื่อและจำนวนเพชรอบน Navbar
function updateUserUI() {
    if (!currentUser) return;
    document.getElementById('user-display-name').innerText = currentUser.nickname || currentUser.username;
    document.getElementById('user-diamonds').innerText = currentUser.diamonds || 0;
}

// สลับแท็บเมนูหน้าจอ
function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    const btns = document.querySelectorAll('.tab-btn');

    tabs.forEach(t => t.classList.remove('active'));
    btns.forEach(b => b.classList.remove('active'));

    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) activeTab.classList.add('active');

    // ไฮไลต์ปุ่มที่เลือก (ยกเว้นปุ่มแอดมินหรือปุ่มภายนอก)
    event.target.classList.add('active');

    // โหลดข้อมูลตามแท็บที่กด
    if (tabName === 'inventory') loadInventoryItems();
    if (tabName === 'shop') loadShopItems();
    if (tabName === 'mailbox') loadMailboxItems();
}

// บันทึกข้อมูลผู้ใช้ลง Cloud Realtime Database
function saveUserData() {
    if (currentUser && !currentUser.isAdmin) {
        db.ref('users/' + currentUser.username).update({
            diamonds: currentUser.diamonds,
            inventory: currentUser.inventory || []
        });
    }
}

// บันทึก Log กิจกรรมขึ้น Cloud Realtime Database
function writeRealtimeLog(actionText) {
    const logId = Date.now();
    const time = new Date().toLocaleTimeString('th-TH');
    const logMsg = `[${time}] ${actionText}`;
    db.ref('logs/' + logId).set(logMsg);
}

// ลิงก์เปิดไปหน้า YouTube
function openYouTube() {
    window.open('https://www.youtube.com', '_blank');
}

// ระบบป็อบอัปแจ้งเตือน (Modal)
function showModal(title, bodyHtml) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

// ออกจากระบบ
function handleLogout() {
    if (currentUser && !currentUser.isAdmin) {
        writeRealtimeLog(`ผู้เล่นออกจากระบบ: ${currentUser.nickname}`);
    }
    currentUser = null;
    location.reload();
}