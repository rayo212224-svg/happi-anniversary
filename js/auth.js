// สถานะการตรวจคำถามลับ
let isQuizVerified = false;

// สลับหน้าจอ Login / Register
function toggleAuth(mode) {
    document.getElementById('login-form').classList.toggle('hidden', mode === 'register');
    document.getElementById('register-form').classList.toggle('hidden', mode === 'login');
}

// ตรวจสอบคำถามลับ CAPTCHA ประจำคู่รัก
function verifyQuiz() {
    const ans = document.getElementById('quiz-ans').value.trim();
    if (ans === "212224") {
        isQuizVerified = true;
        document.getElementById('quiz-status').className = "status-passed";
        document.getElementById('quiz-status').innerText = "✅ ยืนยันตัวตนสำเร็จ!";
    } else {
        isQuizVerified = false;
        document.getElementById('quiz-status').className = "status-pending";
        document.getElementById('quiz-status').innerText = "❌ รหัสไม่ถูกต้อง ลองอีกครั้งนะ";
    }
}

// ระบบสมัครสมาชิกใหม่
function handleRegister() {
    const u = document.getElementById('reg-username').value.trim();
    const p = document.getElementById('reg-password').value.trim();
    const cp = document.getElementById('reg-confirm').value.trim();
    const nick = document.getElementById('reg-nickname').value.trim();

    if (!u || !p || !nick) return showModal("ข้อผิดพลาด", "กรุณากรอกข้อมูลให้ครบถ้วน");
    if (p !== cp) return showModal("ข้อผิดพลาด", "รหัสผ่านไม่ตรงกัน");
    if (!isQuizVerified) return showModal("ข้อผิดพลาด", "กรุณายืนยันตัวตนรหัสลับคู่รักก่อนสมัคร");

    // ตรวจสอบชื่อผู้ใช้ซ้ำบน Cloud Database
    db.ref('users/' + u).once('value', snapshot => {
        if (snapshot.exists()) {
            showModal("ข้อผิดพลาด", "ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว");
        } else {
            const newUser = {
                username: u,
                password: p,
                nickname: nick,
                diamonds: 1000,
                inventory: []
            };
            
            // บันทึกลง Realtime Database
            db.ref('users/' + u).set(newUser);
            writeRealtimeLog(`สมัครสมาชิกใหม่: ${nick} (${u})`);
            showModal("สำเร็จ!", "สมัครสมาชิกเรียบร้อย ได้รับ 1,000 💎");
            
            // รีเซ็ตฟอร์มสมัคร
            document.getElementById('reg-username').value = '';
            document.getElementById('reg-password').value = '';
            document.getElementById('reg-confirm').value = '';
            document.getElementById('reg-nickname').value = '';
            document.getElementById('quiz-ans').value = '';
            isQuizVerified = false;
            document.getElementById('quiz-status').className = "status-pending";
            document.getElementById('quiz-status').innerText = "❌ ยังไม่ได้ยืนยันตัวตน";

            toggleAuth('login');
        }
    });
}

// ระบบเข้าสู่ระบบ
function handleLogin() {
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value.trim();

    if (!u || !p) return showModal("ข้อผิดพลาด", "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");

    // ตรวจสอบสิทธิ์แอดมิน (Admin Login)
    if (u === "212224" && p === "Aa100852") {
        currentUser = {
            username: "212224",
            nickname: "แอดมิน (Admin)",
            diamonds: 99999,
            isAdmin: true
        };
        writeRealtimeLog("แอดมินเข้าสู่ระบบ");
        startApp();
        return;
    }

    // ตรวจสอบบัญชีผู้เล่นทั่วไปบน Cloud Database
    db.ref('users/' + u).once('value', snapshot => {
        const userData = snapshot.val();
        if (userData && userData.password === p) {
            currentUser = userData;
            writeRealtimeLog(`ผู้เล่นล็อกอิน: ${userData.nickname}`);
            startApp();
            
            // แสดงข้อความต้อนรับจากแอดมิน
            db.ref('settings/welcomeMsg').once('value', s => {
                const msg = s.val() || "ยินดีต้อนรับสู่ร้านค้าความทรงจำของเรา 💕";
                showModal(`สวัสดี ${currentUser.nickname} ✨`, msg);
            });
        } else {
            showModal("ข้อผิดพลาด", "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        }
    });
}