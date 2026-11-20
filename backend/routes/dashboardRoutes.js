const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Message = require("../models/Message");
const Visit = require("../models/Visit");
const Admin = require("../models/Admin");
const Project = mongoose.models.Project || require("../models/project");

// دالة مساعدة لحساب تاريخ البداية حسب الفلتر
function getStartDate(range) {
  const now = new Date();
  if (range === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (range === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (range === "90d") return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  return null; // All Time
}

/* =========================================
   1. AUTH ROUTES (تسجيل دخول الأدمن)
========================================= */
async function ensureDefaultAdmin() {
  const count = await Admin.countDocuments();
  if (count === 0) {
    await Admin.create({
      name: "Abdallah Mohamed",
      email: "admin@abdallah.dev",
      password: "admin123",
    });
  }
}

router.post("/auth/login", async (req, res) => {
  try {
    await ensureDefaultAdmin();
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email: (email || "").toLowerCase().trim() });
    if (!admin || admin.password !== password) {
      return res.status(401).json({
        success: false,
        message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
      });
    }

    res.json({
      success: true,
      token: `admin-session-${admin._id}-${Date.now()}`,
      admin: { id: admin._id, name: admin.name, email: admin.email, avatar: admin.avatar },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
  
});

// جلب بيانات الأدمن الحالية
router.get("/admin/profile", async (req, res) => {
  try {
    await ensureDefaultAdmin();
    const admin = await Admin.findOne();
    res.json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        avatar: admin.avatar || "",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// تحديث بيانات الأدمن (الاسم، البريد الإلكتروني، والصورة)
router.put("/admin/profile", async (req, res) => {
  try {
    await ensureDefaultAdmin();
    const { adminId, name, email, avatar } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "الاسم والبريد الإلكتروني مطلوبان",
      });
    }

    let admin = adminId ? await Admin.findById(adminId) : null;
    if (!admin) admin = await Admin.findOne();

    admin.name = name.trim();
    admin.email = email.toLowerCase().trim();
    if (avatar !== undefined) {
      admin.avatar = avatar;
    }
    await admin.save();

    res.json({
      success: true,
      message: "Profile updated successfully!",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        avatar: admin.avatar || "",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// تغيير كلمة مرور الأدمن
router.put("/admin/password", async (req, res) => {
  try {
    await ensureDefaultAdmin();
    const { adminId, currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "يرجى إدخال كلمة المرور الحالية والجديدة",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف",
      });
    }

    let admin = adminId ? await Admin.findById(adminId) : null;
    if (!admin) admin = await Admin.findOne();

    if (admin.password !== currentPassword) {
      return res.status(401).json({
        success: false,
        message: "كلمة المرور الحالية غير صحيحة",
      });
    }

    admin.password = newPassword;
    await admin.save();

    res.json({
      success: true,
      message: "Password changed successfully!",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================
   2. MESSAGES ROUTES (الرسائل الحقيقية)
========================================= */
router.get("/messages", async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    const unreadCount = await Message.countDocuments({ isRead: false });
    res.json({ success: true, data: messages, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/messages", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: "جميع الحقول مطلوبة" });
    }
    const newMsg = await Message.create({
      name,
      email,
      subject: subject || "Portfolio Inquiry",
      message,
    });
    res.status(201).json({ success: true, data: newMsg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch("/messages/:id/read", async (req, res) => {
  try {
    const updated = await Message.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// تعليم كل الرسائل كمقروءة دفعة واحدة
router.patch("/messages/mark-all-read", async (req, res) => {
  try {
    await Message.updateMany({ isRead: false }, { isRead: true });
    res.json({ success: true, message: "All messages marked as read" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// إعادة الرسالة إلى "غير مقروءة"
router.patch("/messages/:id/unread", async (req, res) => {
  try {
    const updated = await Message.findByIdAndUpdate(
      req.params.id,
      { isRead: false },
      { new: true }
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// حذف رسالة نهائياً
router.delete("/messages/:id", async (req, res) => {
  try {
    const deleted = await Message.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }
    res.json({ success: true, message: "Message deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================
   3. ANALYTICS & OVERVIEW (إحصائيات حقيقية بالفلتر)
========================================= */
router.post("/analytics/track", async (req, res) => {
  try {
    const { visitorId, page } = req.body;
    if (!visitorId) return res.status(400).json({ success: false });
    await Visit.create({ visitorId, page: page || "/" });
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/analytics/overview", async (req, res) => {
  try {
    const range = req.query.range || "30d";
    const startDate = getStartDate(range);
    const dateFilter = startDate ? { createdAt: { $gte: startDate } } : {};
    const projectFilter = startDate
      ? { $or: [{ createdAt: { $gte: startDate } }, { createdAt: { $exists: false } }] }
      : {};

    const [projects, messagesCount, unreadMessagesCount, totalViews, uniqueVisitors] =
      await Promise.all([
        Project.find(projectFilter),
        Message.countDocuments(dateFilter),
        Message.countDocuments({ isRead: false }),
        Visit.countDocuments(dateFilter),
        Visit.distinct("visitorId", dateFilter),
      ]);

    const allProjects = await Project.find();

    res.json({
      success: true,
      stats: {
        projectsCount: projects.length,
        messagesCount,
        unreadMessagesCount,
        totalViews,
        visitorsCount: uniqueVisitors.length,
      },
      allProjects,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;