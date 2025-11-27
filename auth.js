// auth.js
const { sql, pool } = require('./db');

// Đăng ký (Ứng viên) - bắt buộc email hoặc sdt
exports.register = async (req, res) => {
  const { username, password, email, sdt } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Tên đăng nhập và mật khẩu là bắt buộc' });
  if (!email && !sdt) return res.status(400).json({ message: 'Vui lòng nhập ít nhất Email hoặc Số điện thoại' });

  try {
    const p = await pool;
    const check = await p.request().input('u', sql.NVarChar(50), username)
      .query('SELECT MaTK FROM TaiKhoan WHERE TenDangNhap=@u');
    if (check.recordset.length > 0) return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });

    await p.request()
      .input('u', sql.NVarChar(50), username)
      .input('p', sql.NVarChar(255), password)
      .input('e', sql.NVarChar(100), email || null)
      .input('s', sql.NVarChar(20), sdt || null)
      .input('r', sql.NVarChar(20), 'UngVien')
      .query(`INSERT INTO TaiKhoan (TenDangNhap, MatKhau, Email, SoDienThoai, VaiTro, TrangThai)
              VALUES (@u,@p,@e,@s,@r,1)`);

    res.json({ message: 'Đăng ký thành công. Bạn có thể đăng nhập.' });
  } catch (err) {
    console.error('❌ Lỗi đăng ký:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi đăng ký' });
  }
};

// Đăng nhập (so sánh trực tiếp)
exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Thiếu thông tin đăng nhập' });

  try {
    const p = await pool;
    const rs = await p.request().input('u', sql.NVarChar(50), username)
      .query('SELECT * FROM TaiKhoan WHERE TenDangNhap=@u AND TrangThai=1');
    if (rs.recordset.length === 0) return res.status(400).json({ message: 'Tài khoản không tồn tại hoặc bị khóa' });

    const user = rs.recordset[0];
    if (user.MatKhau !== password) return res.status(401).json({ message: 'Sai mật khẩu' });

    req.session.user = {
      id: user.MaTK,
      username: user.TenDangNhap,
      role: user.VaiTro,
      email: user.Email,
      sdt: user.SoDienThoai
    };
    res.json({ message: 'Đăng nhập thành công', user: req.session.user });
  } catch (err) {
    console.error('❌ Lỗi đăng nhập:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi đăng nhập' });
  }
};

// Đăng xuất
exports.logout = (req, res) => {
  req.session.destroy(() => res.json({ message: 'Đã đăng xuất' }));
};
