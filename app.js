const nodemailer = require("nodemailer");

// cấu hình SMTP Gmail bằng App Password
const mailer = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "vtu09715@gmail.com",      // Gmail của bạn
        pass: "aqfq vulh lyon potx"          // App Password 16 ký tự
    }
});

// Hàm tạo nội dung email
function taoNoiDungEmail(uv, tin) {
    return `
Kính gửi anh/chị ${uv.HoTen},

Chúc mừng anh/chị đã vượt qua vòng xét tuyển cho vị trí **${tin.TieuDe}**.

-----------------------------
📌 **Thông tin buổi phỏng vấn**
• Thời gian: 08:00 sáng ngày mai
• Địa điểm: ${tin.DiaDiem}
• Mức lương dự kiến: ${tin.MucLuong}

-----------------------------
📌 **Thông tin ứng viên**
• Họ tên: ${uv.HoTen}
• Ngày sinh: ${uv.NgaySinh}
• Giới tính: ${uv.GioiTinh}
• Kinh nghiệm: ${uv.KinhNghiem}
• Kỹ năng: ${uv.KyNang}

-----------------------------
📄 **Mô tả công việc**
${tin.MoTa}

Rất mong anh/chị có mặt đúng giờ để buổi phỏng vấn diễn ra thuận lợi.

Trân trọng,  
Phòng nhân sự
    `;
}

// ================== IMPORTS ==================
const express = require('express');
const session = require('express-session');
const sql = require('mssql');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// ================== SQL CONFIG ==================
const dbConfig = {
  user: 'sa',
  password: '123456a@',
  server: 'DESKTOP-FSI2778\\SQLVN',
  database: 'tuyendung',
  options: { encrypt: false, trustServerCertificate: true }
};

// ================== CONNECT SQL ==================
sql.connect(dbConfig)
  .then(() => console.log('✅ SQL Server kết nối OK'))
  .catch(err => console.error('❌ SQL error:', err));

// ================== MIDDLEWARE ==================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
  })
);

// ================== STATIC & UPLOADS ==================
const publicDir = path.join(__dirname, 'public');
const uploadDir = path.join(publicDir, 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Đã tạo thư mục uploads:', uploadDir);
}

app.use(express.static(publicDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName =
      Date.now() + '-' + file.originalname.replace(/[^\w.-]/g, '_');
    cb(null, safeName);
  }
});
const upload = multer({ storage });

// ========================================================
// ========= HÀM FAKE AI ĐÁNH GIÁ ỨNG VIÊN ================
// ========================================================
function fakeAI_GenerateReview(d) {
  // Điểm phù hợp 60 - 95%
  const percent = Math.floor(Math.random() * 36) + 60;

  const hoTen = d.HoTen || 'Ứng viên';
  const hocVan = d.HocVan || 'chưa cập nhật';
  const kinhNghiem = d.KinhNghiem || 'chưa rõ kinh nghiệm';
  const kyNang = d.KyNang || 'chưa cập nhật kỹ năng';
  const viTri = d.TieuDe || 'vị trí đang tuyển';
  const mucLuong = d.MucLuong || 'mức lương thỏa thuận';
  const diaDiem = d.DiaDiem || 'địa điểm làm việc phù hợp';

  const summary = `
AI đánh giá tổng quan:
${hoTen} có nền tảng học vấn ${hocVan}, cùng với ${kinhNghiem}, phù hợp với định hướng công việc tại doanh nghiệp.
Ứng viên thể hiện nhóm kỹ năng chính: ${kyNang}, đáp ứng tương đối tốt yêu cầu chuyên môn của vị trí ${viTri}.

Nhận xét chi tiết:
- Vị trí ứng tuyển: ${viTri}
- Địa điểm làm việc: ${diaDiem}
- Mức lương tham chiếu: ${mucLuong}
- Học vấn: ${hocVan}
- Kinh nghiệm: ${kinhNghiem}
- Kỹ năng nổi bật: ${kyNang}

Đánh giá tổng hợp:
- Mức độ phù hợp với vị trí: ${percent}%
- Gợi ý: Nhà tuyển dụng nên cân nhắc liên hệ phỏng vấn để đánh giá thêm về thái độ, khả năng thích nghi và tiềm năng phát triển dài hạn.
`.trim();

  return { summary, percent };
}

// ================== ROUTES ==================
app.get('/', (req, res) =>
  res.sendFile(path.join(publicDir, 'index.html'))
);

// ========================================================
// ======================= AUTH ===========================
app.post('/register', async (req, res) => {
  try {
    const { username, password, email, sdt } = req.body;
    const pool = await sql.connect(dbConfig);

    const check = await pool
      .request()
      .input('u', sql.NVarChar, username)
      .query('SELECT * FROM TaiKhoan WHERE TenDangNhap=@u');

    if (check.recordset.length > 0) {
      return res.json({ message: 'Tên đăng nhập đã tồn tại' });
    }

    await pool
      .request()
      .input('u', sql.NVarChar, username)
      .input('p', sql.NVarChar, password)
      .input('e', sql.NVarChar, email || null)
      .input('s', sql.NVarChar, sdt || null)
      .input('v', sql.NVarChar, 'UngVien')
      .query(`
        INSERT INTO TaiKhoan
          (TenDangNhap, MatKhau, Email, SoDienThoai, VaiTro, TrangThai, NgayTao)
        VALUES
          (@u, @p, @e, @s, @v, 1, GETDATE())
      `);

    const tk = await pool.request()
      .query('SELECT TOP 1 MaTK FROM TaiKhoan ORDER BY MaTK DESC');

    const maTK = tk.recordset[0].MaTK;

    await pool
      .request()
      .input('ma', sql.Int, maTK)
      .query(`
        INSERT INTO UngVien (MaTK, HoTen)
        VALUES (@ma, N'Chưa cập nhật')
      `);

    res.json({ message: 'Đăng ký thành công' });
  } catch (err) {
    console.error('❌ Lỗi đăng ký:', err);
    res.json({ error: 'Lỗi khi đăng ký' });
  }
});

// =========== ĐĂNG NHẬP ===========
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const pool = await sql.connect(dbConfig);

    const rs = await pool.request()
      .input('u', sql.NVarChar, username)
      .input('p', sql.NVarChar, password)
      .query('SELECT * FROM TaiKhoan WHERE TenDangNhap=@u AND MatKhau=@p');

    if (rs.recordset.length === 0) {
      return res.json({ message: 'Sai tài khoản hoặc mật khẩu' });
    }

    const user = rs.recordset[0];

    req.session.user = {
      id: user.MaTK,
      username: user.TenDangNhap,
      role: user.VaiTro
    };

    if (user.VaiTro === 'Admin') {
      const checkAdmin = await pool
        .request()
        .input('ma', sql.Int, user.MaTK)
        .query('SELECT * FROM Admin WHERE MaTK=@ma');

      if (checkAdmin.recordset.length === 0) {
        await pool.request()
          .input('ma', sql.Int, user.MaTK)
          .query("INSERT INTO Admin(TenCongTy,MaTK) VALUES(N'Chưa cập nhật',@ma)");
      }
    }

    res.json({ message: 'Đăng nhập thành công', user: req.session.user });
  } catch (err) {
    console.error('❌ Lỗi đăng nhập:', err);
    res.json({ error: 'Lỗi khi đăng nhập' });
  }
});

// =========== ĐĂNG XUẤT ===========
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Đã đăng xuất' }));
});

// ========================================================
// ===================== ADMIN APIs =======================

// ---- Thêm tin tuyển dụng ----
app.post('/admin/themtin', upload.single('hinhanh'), async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'Admin')
      return res.json({ message: 'Không có quyền' });

    const { tieude, mota, mucluong, diadiem } = req.body;
    const file = req.file ? '/uploads/' + req.file.filename : null;

    const pool = await sql.connect(dbConfig);

    const rsAdmin = await pool.request()
      .input('ma', sql.Int, req.session.user.id)
      .query('SELECT MaAdmin FROM Admin WHERE MaTK=@ma');

    if (rsAdmin.recordset.length === 0)
      return res.json({ message: 'Không tìm thấy Admin tương ứng' });

    const maAdmin = rsAdmin.recordset[0].MaAdmin;

    await pool.request()
      .input('ad', sql.Int, maAdmin)
      .input('td', sql.NVarChar, tieude)
      .input('mt', sql.NVarChar, mota)
      .input('ml', sql.NVarChar, mucluong)
      .input('dd', sql.NVarChar, diadiem)
      .input('ha', sql.NVarChar, file)
      .query(`
        INSERT INTO TinTuyenDung
          (MaAdmin,TieuDe,MoTa,MucLuong,DiaDiem,HinhAnh,NgayDang,TrangThai)
        VALUES
          (@ad,@td,@mt,@ml,@dd,@ha,GETDATE(),N'Đang tuyển')
      `);

    res.json({ message: 'Thêm tin thành công' });
  } catch (err) {
    console.error('❌ Lỗi thêm tin:', err);
    res.json({ message: 'Lỗi khi thêm tin' });
  }
});

// ---- Danh sách tin ----
app.get('/admin/danhsachtin', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const rs = await pool.request()
      .query(`
        SELECT 
            t.*,
            (SELECT COUNT(*) FROM UngTuyen WHERE MaTin = t.MaTin AND TrangThai = N'Được chọn') AS DaDuyet
        FROM TinTuyenDung t
        ORDER BY MaTin DESC
      `);

    res.json({ data: rs.recordset });

  } catch (err) {
    console.error('❌ Lỗi lấy danh sách tin:', err);
    res.json({ error: 'Lỗi lấy danh sách tin' });
  }
});

// ---- Danh sách ứng viên ----
app.get('/admin/ungvien', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'Admin')
      return res.json({ message: 'Không có quyền' });

    const pool = await sql.connect(dbConfig);

    const rs = await pool.request().query(`
      SELECT 
        ut.MaUngTuyen,
        uv.HoTen,
        tk.Email,
        tk.SoDienThoai,
        t.TieuDe,
        ut.TrangThai,
        ut.NgayNop
      FROM UngTuyen ut
      JOIN UngVien uv ON ut.MaUV = uv.MaUV
      JOIN TaiKhoan tk ON uv.MaTK = tk.MaTK
      JOIN TinTuyenDung t ON ut.MaTin = t.MaTin
      ORDER BY ut.NgayNop DESC
    `);

    res.json({ data: rs.recordset });
  } catch (err) {
    console.error('❌ Lỗi lấy danh sách ứng viên:', err);
    res.json({ message: 'Lỗi lấy danh sách ứng viên' });
  }
});

// ---- Xem hồ sơ ứng viên (CÓ AI) ----
app.get('/admin/xemhoso', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'Admin')
      return res.json({ message: 'Không có quyền' });

    const { maUngTuyen } = req.query;
    if (!maUngTuyen) return res.json({ message: 'Thiếu mã ứng tuyển' });

    const pool = await sql.connect(dbConfig);

    const rs = await pool.request()
      .input('id', sql.Int, maUngTuyen)
      .query(`
        SELECT 
          ut.MaUngTuyen,
          ut.TrangThai,
          ut.NgayNop,
          ut.AIDanhGia,
          ut.AIDiemPhuHop,

          uv.MaUV,
          uv.HoTen,
          uv.NgaySinh,
          uv.GioiTinh,
          uv.DiaChi,
          uv.HocVan,
          uv.KinhNghiem,
          uv.KyNang,
          uv.CV_URL,
          uv.Anh,

          tk.Email,
          tk.SoDienThoai,

          t.MaTin,
          t.TieuDe,
          t.MoTa,
          t.MucLuong,
          t.DiaDiem
        FROM UngTuyen ut
        JOIN UngVien uv ON ut.MaUV = uv.MaUV
        JOIN TaiKhoan tk ON uv.MaTK = tk.MaTK
        JOIN TinTuyenDung t ON ut.MaTin = t.MaTin
        WHERE ut.MaUngTuyen = @id
      `);

    if (rs.recordset.length === 0)
      return res.json({ message: 'Không tìm thấy hồ sơ' });

    let data = rs.recordset[0];

    // Nếu chưa có đánh giá AI -> tạo mới và lưu DB
    if (!data.AIDanhGia || !data.AIDiemPhuHop) {
      const ai = fakeAI_GenerateReview(data);

      await pool.request()
        .input('id', sql.Int, maUngTuyen)
        .input('dg', sql.NVarChar, ai.summary)
        .input('pt', sql.Int, ai.percent)
        .query('UPDATE UngTuyen SET AIDanhGia=@dg, AIDiemPhuHop=@pt WHERE MaUngTuyen=@id');

      data.AIDanhGia = ai.summary;
      data.AIDiemPhuHop = ai.percent;
    }

    res.json({ data });

  } catch (err) {
    console.error('❌ Lỗi xem hồ sơ:', err);
    res.json({ message: 'Lỗi xem hồ sơ ứng viên' });
  }
});

// ========================= CHI TIẾT TIN =========================
app.get("/admin/chitiettin", async (req, res) => {
    try {
        const { maTin } = req.query;
        if (!maTin) return res.json({ message: "Thiếu mã tin" });

        const pool = await sql.connect(dbConfig);

        const rs = await pool.request()
            .input("id", sql.Int, maTin)
            .query(`
                SELECT 
                    t.*,
                    (SELECT COUNT(*) FROM UngTuyen WHERE MaTin = t.MaTin AND TrangThai = N'Được chọn') AS DaDuyet
                FROM TinTuyenDung t
                WHERE t.MaTin = @id
            `);

        if (rs.recordset.length === 0)
            return res.json({ message: "Không tìm thấy tin" });

        res.json({ data: rs.recordset[0] });

    } catch (err) {
        console.error("❌ Lỗi chi tiết tin:", err);
        res.json({ error: "Lỗi server" });
    }
});

// ========================================================
// **** NÚT ĐỒNG Ý / TỪ CHỐI – SQL SERVER ****
// ========================================================
app.post("/admin/xetduyet", async (req, res) => {
    try {
        const { maUngTuyen, trangThai } = req.body;

        const pool = await sql.connect(dbConfig);

        // 1) Cập nhật trạng thái
        await pool.request()
            .input('id', sql.Int, maUngTuyen)
            .input('tt', sql.NVarChar, trangThai)
            .query(`
                UPDATE UngTuyen
                SET TrangThai = @tt
                WHERE MaUngTuyen = @id
            `);
        // ⭐ TẠO LỊCH PHỎNG VẤN NẾU ĐƯỢC CHỌN ⭐
if (trangThai === "Được chọn") {

    // Kiểm tra đã tạo lịch phỏng vấn chưa (tránh trùng)
    const check = await pool.request()
        .input('id', sql.Int, maUngTuyen)
        .query(`
            SELECT MaPV FROM LichPhongVan WHERE MaUngTuyen = @id
        `);

    if (check.recordset.length === 0) {
        await pool.request()
            .input('id', sql.Int, maUngTuyen)
            .query(`
                INSERT INTO LichPhongVan (MaUngTuyen, ThoiGian, DiaDiem, HinhThuc, GhiChu, TrangThai)
                VALUES (@id, NULL, NULL, NULL, N'Ứng viên được duyệt – chờ đặt lịch', N'Chờ lịch')
            `);
    }
}

        // 2) Lấy dữ liệu ứng viên để gửi email
        const rs2 = await pool.request()
            .input('id', sql.Int, maUngTuyen)
            .query(`
                SELECT 
                    uv.HoTen, uv.NgaySinh, uv.GioiTinh, uv.KinhNghiem, uv.KyNang,
                    tk.Email,
                    tin.TieuDe, tin.MucLuong, tin.DiaDiem, tin.MoTa
                FROM UngTuyen ut
                JOIN UngVien uv ON uv.MaUV = ut.MaUV
                JOIN TaiKhoan tk ON tk.MaTK = uv.MaTK
                JOIN TinTuyenDung tin ON tin.MaTin = ut.MaTin
                WHERE ut.MaUngTuyen = @id
            `);

        if (rs2.recordset.length === 0) {
            return res.json({ error: "Không tìm thấy dữ liệu ứng viên." });
        }

        const data = rs2.recordset[0];

        // 3) Gửi email nếu được chọn
        if (trangThai === "Được chọn") {

            const noiDung = taoNoiDungEmail(data, data);

            await mailer.sendMail({
                from: "vtu09715@gmail.com",
                to: data.Email,
                subject: "Thông báo trúng tuyển – Lời mời phỏng vấn",
                text: noiDung
            });
        }

        res.json({ message: "Cập nhật thành công! Email đã được gửi." });

    } catch (err) {
        console.error("❌ Lỗi xetduyet:", err);
        res.json({ error: "Lỗi server" });
    }
});
// ========================= SỬA TIN =========================
app.post("/admin/suatin", async (req, res) => {
    try {
        const { maTin, tieude, mota, luong, diachi, soluong } = req.body;

        const pool = await sql.connect(dbConfig);

        await pool.request()
            .input("id", sql.Int, maTin)
            .input("td", sql.NVarChar, tieude)
            .input("mt", sql.NVarChar, mota)
            .input("ml", sql.NVarChar, luong)
            .input("dd", sql.NVarChar, diachi)
            .input("sl", sql.Int, soluong)
            .query(`
                UPDATE TinTuyenDung
                SET 
                    TieuDe = @td,
                    MoTa = @mt,
                    MucLuong = @ml,
                    DiaDiem = @dd,
                    SoLuongTuyen = @sl
                WHERE MaTin = @id
            `);

        res.json({ message: "Cập nhật tin thành công" });

    } catch (err) {
        console.error("❌ Lỗi suatin:", err);
        res.json({ error: "Lỗi server khi cập nhật tin" });
    }
});

// ========================= XOÁ TIN =========================
app.post("/admin/xoatin", async (req, res) => {
    try {
        const { maTin } = req.body;
        const pool = await sql.connect(dbConfig);

        // Xoá đơn ứng tuyển của tin
        await pool.request()
            .input("id", sql.Int, maTin)
            .query(`DELETE FROM UngTuyen WHERE MaTin = @id`);

        // Xoá tin
        await pool.request()
            .input("id", sql.Int, maTin)
            .query(`DELETE FROM TinTuyenDung WHERE MaTin = @id`);

        res.json({ message: "Đã xoá tin tuyển dụng" });

    } catch (err) {
        console.error("❌ Lỗi xoá tin:", err);
        res.json({ error: "Lỗi server" });
    }
});

// ========================================================
// ====================== USER APIs =======================

// ---- Ứng tuyển ----
app.post('/user/ungtuyen', async (req, res) => {
  try {
    if (!req.session.user)
      return res.json({ message: 'Chưa đăng nhập' });

    const { maTin } = req.body;
    const pool = await sql.connect(dbConfig);

    // 1) Lấy số lượng tuyển & số đã duyệt
    const rsTin = await pool.request()
      .input("id", sql.Int, maTin)
      .query(`
        SELECT 
            SoLuongTuyen,
            (SELECT COUNT(*) FROM UngTuyen WHERE MaTin=@id AND TrangThai=N'Được chọn') AS DaDuyet
        FROM TinTuyenDung
        WHERE MaTin=@id
      `);

    if (rsTin.recordset.length === 0)
      return res.json({ message: "Không tìm thấy tin" });

    const { SoLuongTuyen, DaDuyet } = rsTin.recordset[0];

    if (DaDuyet >= SoLuongTuyen)
      return res.json({ message: "Tin đã đủ ứng viên – không thể ứng tuyển" });

    // 2) Lấy mã ứng viên
    const uv = await pool.request()
      .input('ma', sql.Int, req.session.user.id)
      .query('SELECT MaUV FROM UngVien WHERE MaTK=@ma');

    if (uv.recordset.length === 0)
      return res.json({ message: 'Không tìm thấy hồ sơ ứng viên' });

    const maUV = uv.recordset[0].MaUV;

    // 3) Ghi đơn ứng tuyển
    await pool.request()
      .input('uv', sql.Int, maUV)
      .input('tin', sql.Int, maTin)
      .query(`
        INSERT INTO UngTuyen(MaUV,MaTin,NgayNop,TrangThai)
        VALUES(@uv,@tin,GETDATE(),N'Chờ duyệt')
      `);

    res.json({ message: 'Ứng tuyển thành công' });

  } catch (err) {
    console.error('❌ Lỗi ứng tuyển:', err);
    res.json({ message: 'Lỗi khi ứng tuyển' });
  }
});


// ---- Lấy hồ sơ ứng viên ----
app.get('/user/thongtin', async (req, res) => {
  try {
    if (!req.session.user)
      return res.json({ message: 'Chưa đăng nhập' });

    const pool = await sql.connect(dbConfig);

    const rs = await pool.request()
      .input('ma', sql.Int, req.session.user.id)
      .query('SELECT * FROM UngVien WHERE MaTK=@ma');

    if (rs.recordset.length === 0) {
      return res.json({ data: null });
    }

    res.json({ data: rs.recordset[0] });
  } catch (err) {
    console.error('❌ Lỗi tải hồ sơ ứng viên:', err);
    res.json({ message: 'Lỗi tải hồ sơ ứng viên' });
  }
});

// ========================================================
// 🔧 CẬP NHẬT HỒ SƠ CÓ 2 FILE (CV + ẢNH)
// ========================================================
app.post(
  '/user/capnhat',
  upload.fields([
    { name: 'Anh', maxCount: 1 },
    { name: 'CV_File', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      if (!req.session.user)
        return res.json({ message: 'Chưa đăng nhập' });

      const pool = await sql.connect(dbConfig);

      const uv = await pool.request()
        .input('ma', sql.Int, req.session.user.id)
        .query('SELECT MaUV FROM UngVien WHERE MaTK=@ma');

      if (uv.recordset.length === 0)
        return res.json({ message: 'Không tìm thấy hồ sơ ứng viên' });

      const maUV = uv.recordset[0].MaUV;

      const {
        HoTen,
        NgaySinh,
        GioiTinh,
        DiaChi,
        HocVan,
        KinhNghiem,
        KyNang,
        CV_URL
      } = req.body;

      const fileAnh = req.files['Anh']
        ? '/uploads/' + req.files['Anh'][0].filename
        : null;

      const fileCV = req.files['CV_File']
        ? '/uploads/' + req.files['CV_File'][0].filename
        : null;

      const finalCV = fileCV || CV_URL;

      let sqlStr = `
        UPDATE UngVien SET
          HoTen=@ten,
          NgaySinh=@ns,
          GioiTinh=@gt,
          DiaChi=@dc,
          HocVan=@hv,
          KinhNghiem=@kn,
          KyNang=@ky,
          CV_URL=@cv
          ${fileAnh ? ', Anh=@anh' : ''}
        WHERE MaUV=@id
      `;

      const q = pool.request()
        .input('ten', sql.NVarChar, HoTen)
        .input('ns', sql.Date, NgaySinh || null)
        .input('gt', sql.NVarChar, GioiTinh)
        .input('dc', sql.NVarChar, DiaChi)
        .input('hv', sql.NVarChar, HocVan)
        .input('kn', sql.NVarChar, KinhNghiem)
        .input('ky', sql.NVarChar, KyNang)
        .input('cv', sql.NVarChar, finalCV)
        .input('id', sql.Int, maUV);

      if (fileAnh) q.input('anh', sql.NVarChar, fileAnh);

      await q.query(sqlStr);

      res.json({
        message: 'Cập nhật hồ sơ thành công',
        anh: fileAnh,
        cv: finalCV
      });
    } catch (err) {
      console.error('❌ Lỗi cập nhật hồ sơ ứng viên:', err);
      res.json({ message: 'Lỗi cập nhật hồ sơ' });
    }
  }
);

// ---- Danh sách đơn đã ứng tuyển ----
app.get('/user/danhsachungtuyen', async (req, res) => {
  try {
    if (!req.session.user)
      return res.json({ message: 'Chưa đăng nhập' });

    const pool = await sql.connect(dbConfig);

    const rs = await pool.request()
      .input('ma', sql.Int, req.session.user.id)
      .query(`
        SELECT 
            t.TieuDe,
            ut.MaUngTuyen,
            ut.TrangThai,
            ut.NgayNop,
            pv.ThoiGian,
            pv.DiaDiem,
            pv.HinhThuc,
            pv.GhiChu
        FROM UngTuyen ut
        JOIN UngVien uv ON ut.MaUV = uv.MaUV
        JOIN TinTuyenDung t ON ut.MaTin = t.MaTin
        LEFT JOIN LichPhongVan pv ON pv.MaUngTuyen = ut.MaUngTuyen
        WHERE uv.MaTK = @ma
        ORDER BY ut.NgayNop DESC
      `);

    res.json({ data: rs.recordset });
  } catch (err) {
    res.json({ message: 'Lỗi tải danh sách ứng tuyển' });
  }
});


// ================== SERVER ==================
const PORT = 3002;
app.listen(PORT, () =>
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`)
);
app.post("/admin/datlich", async (req, res) => {
    try {
        const { maUngTuyen, ThoiGian, DiaDiem, HinhThuc, GhiChu } = req.body;

        const pool = await sql.connect(dbConfig);

        // Nếu đã có lịch → update
        const check = await pool.request()
            .input("id", sql.Int, maUngTuyen)
            .query("SELECT * FROM LichPhongVan WHERE MaUngTuyen=@id");

        if (check.recordset.length > 0) {
            await pool.request()
                .input("id", sql.Int, maUngTuyen)
                .input("t", sql.DateTime, ThoiGian)
                .input("d", sql.NVarChar, DiaDiem)
                .input("h", sql.NVarChar, HinhThuc)
                .input("g", sql.NVarChar, GhiChu)
                .query(`
                    UPDATE LichPhongVan
                    SET ThoiGian=@t, DiaDiem=@d, HinhThuc=@h, GhiChu=@g, TrangThai=N'Đã đặt'
                    WHERE MaUngTuyen=@id
                `);
        } else {
            await pool.request()
                .input("id", sql.Int, maUngTuyen)
                .input("t", sql.DateTime, ThoiGian)
                .input("d", sql.NVarChar, DiaDiem)
                .input("h", sql.NVarChar, HinhThuc)
                .input("g", sql.NVarChar, GhiChu)
                .query(`
                    INSERT INTO LichPhongVan (MaUngTuyen, ThoiGian, DiaDiem, HinhThuc, GhiChu, TrangThai)
                    VALUES (@id, @t, @d, @h, @g, N'Đã đặt')
                `);
        }

        res.json({ message: "Đặt lịch thành công!" });

    } catch (err) {
        console.error(err);
        res.json({ error: "Lỗi server" });
    }
});
app.get("/admin/xemlich", async (req, res) => {
    try {
        const { maUngTuyen } = req.query;

        const pool = await sql.connect(dbConfig);

        const rs = await pool.request()
            .input("id", sql.Int, maUngTuyen)
            .query("SELECT * FROM LichPhongVan WHERE MaUngTuyen=@id");

        res.json({ data: rs.recordset[0] || null });

    } catch (err) {
        res.json({ error: "Lỗi server" });
    }
});
