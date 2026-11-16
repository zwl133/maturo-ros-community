import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import crypto from "crypto";

// ===== 服务层：用户认证（注册 / 登录 / 会话）=====

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public code: string = "AUTH_ERROR"
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// 注册：邮箱 + 密码（bcrypt 加密），生成公开 handle
export async function registerUser(input: {
  email: string;
  password: string;
  handle: string;
  name?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const handle = input.handle.trim();

  // 输入校验
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AuthError("邮箱格式不正确", 400, "INVALID_EMAIL");
  }
  if (password.length < 6) {
    throw new AuthError("密码至少 6 位", 400, "WEAK_PASSWORD");
  }
  if (!/^[a-zA-Z0-9_-]{3,20}$/.test(handle)) {
    throw new AuthError("用户名需 3-20 位，仅限字母数字下划线", 400, "INVALID_HANDLE");
  }

  // 查重
  const emailExists = await prisma.user.findUnique({ where: { email } });
  if (emailExists) {
    throw new AuthError("该邮箱已注册", 409, "EMAIL_EXISTS");
  }
  const handleExists = await prisma.user.findUnique({ where: { handle } });
  if (handleExists) {
    throw new AuthError("该用户名已被占用", 409, "HANDLE_EXISTS");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      handle,
      name: input.name?.trim() || handle,
    },
  });

  return { id: user.id, email: user.email, handle: user.handle, name: user.name };
}

// 登录：校验邮箱密码，创建会话
export async function loginUser(input: { email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AuthError("邮箱或密码错误", 401, "INVALID_CREDENTIALS");
  }
  if (user.status === "banned") {
    throw new AuthError("账号已被封禁", 403, "BANNED");
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AuthError("邮箱或密码错误", 401, "INVALID_CREDENTIALS");
  }

  // 创建会话 token（随机 48 字节 hex）
  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 天

  await prisma.session.create({
    data: { token, userId: user.id, expiresAt },
  });

  return {
    token,
    user: { id: user.id, email: user.email, handle: user.handle, name: user.name, role: user.role },
  };
}

// 通过 token 获取会话对应的用户
export async function getUserBySessionToken(token: string) {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  return session.user;
}

// 登出：删除会话
export async function logoutSession(token: string) {
  await prisma.session.deleteMany({ where: { token } });
}

// 更新用户资料（昵称 / 简介 / 头像）
export async function updateProfile(
  userId: string,
  input: { name?: string; bio?: string; avatar?: string }
) {
  const name = input.name?.trim();
  const bio = input.bio?.trim();

  if (name !== undefined && (name.length < 1 || name.length > 30)) {
    throw new AuthError("昵称需 1-30 个字符", 400, "INVALID_NAME");
  }
  if (bio !== undefined && bio.length > 200) {
    throw new AuthError("简介最多 200 字", 400, "INVALID_BIO");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(bio !== undefined ? { bio } : {}),
      ...(input.avatar !== undefined ? { avatar: input.avatar } : {}),
    },
  });

  return { id: user.id, handle: user.handle, name: user.name, bio: user.bio, avatar: user.avatar };
}
