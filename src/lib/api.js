// كل استدعاءات قاعدة البيانات في التطبيق تمر من هذا الملف فقط.
import { supabase } from './supabase';
import { MEDIA_FUNCTION } from '../constants/config';

let _token = null;
let _onExpired = null;

export function setSessionToken(token) {
  _token = token || null;
}
export function getSessionToken() {
  return _token;
}
export function setOnSessionExpired(fn) {
  _onExpired = fn;
}

// أكواد الأخطاء الثابتة ← رسائل عربية
const MESSAGES = {
  SESSION_INVALID: 'انتهت الجلسة، سجّل الدخول من جديد.',
  FORBIDDEN: 'ليست لديك صلاحية لتنفيذ هذا الإجراء.',
  BAD_CREDENTIALS: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
  TOO_MANY_ATTEMPTS: 'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.',
  USERNAME_TAKEN: 'اسم المستخدم مستخدم بالفعل.',
  USERNAME_INVALID: 'اسم المستخدم: ٣–٢٠ حرفاً إنجليزياً صغيراً أو أرقاماً أو شرطة سفلية.',
  DISPLAY_NAME_INVALID: 'الاسم الظاهر يجب أن يكون بين حرفين و٣٢ حرفاً.',
  PASSWORD_TOO_SHORT: 'كلمة المرور قصيرة، الحد الأدنى ٨ أحرف.',
  PASSWORD_TOO_LONG: 'كلمة المرور طويلة جداً.',
  TERMS_REQUIRED: 'يجب الموافقة على الشروط وسياسة الخصوصية.',
  OLD_PASSWORD_WRONG: 'كلمة المرور الحالية غير صحيحة.',
  AVATAR_INVALID: 'الأفتار غير صالح.',
  ROOM_NAME_INVALID: 'اسم الغرفة يجب أن يكون بين حرفين و٦٠ حرفاً.',
  ROOM_DESCRIPTION_INVALID: 'وصف الغرفة طويل جداً.',
  CODE_INVALID: 'رمز الدعوة غير صحيح.',
  ALREADY_MEMBER: 'أنت عضو في هذه الغرفة بالفعل.',
  REQUEST_PENDING: 'لديك طلب انضمام قيد المراجعة لهذه الغرفة.',
  REQUEST_NOT_FOUND: 'الطلب غير موجود أو تمت مراجعته.',
  NOT_MEMBER: 'أنت لست عضواً في هذه الغرفة.',
  CANNOT_REMOVE_OWNER: 'لا يمكن إزالة مالك الغرفة.',
  OWNER_CANNOT_LEAVE: 'مالك الغرفة لا يمكنه المغادرة.',
  TITLE_REQUIRED: 'اكتب عنواناً للذكرى.',
  DESCRIPTION_TOO_LONG: 'التفاصيل طويلة جداً.',
  MEMORY_NOT_FOUND: 'الذكرى غير موجودة.',
  MEDIA_INVALID: 'تعذّر قبول الصورة.',
  MEDIA_LIMIT: 'الحد الأقصى ١٠ صور للذكرى الواحدة.',
  COMMENT_EMPTY: 'اكتب تعليقاً أولاً.',
  COMMENT_TOO_LONG: 'التعليق طويل جداً.',
  COMMENT_NOT_FOUND: 'التعليق غير موجود.',
  ANON_NOT_ALLOWED: 'التعليق المجهول غير مفعّل في هذه الغرفة.',
  BAD_REQUEST: 'طلب غير صالح.',
  NETWORK: 'تعذّر الاتصال بالإنترنت. تحقق من الشبكة وأعد المحاولة.',
  SERVER_ERROR: 'حدث خطأ غير متوقع. حاول مرة أخرى.',
};

export class ApiError extends Error {
  constructor(code) {
    super(MESSAGES[code] || MESSAGES.SERVER_ERROR);
    this.code = code;
  }
}

function codeOf(error) {
  const msg = String(error?.message || '');
  const m = msg.match(/[A-Z][A-Z_]{3,}/);
  if (m && MESSAGES[m[0]]) return m[0];
  if (/network|fetch|failed to fetch|timeout/i.test(msg)) return 'NETWORK';
  return 'SERVER_ERROR';
}

function fail(code) {
  if (code === 'SESSION_INVALID' && _onExpired) _onExpired();
  throw new ApiError(code);
}

async function rpc(fn, params = {}) {
  let res;
  try {
    res = await supabase.rpc(fn, params);
  } catch (e) {
    return fail('NETWORK');
  }
  if (res.error) return fail(codeOf(res.error));
  if (res.data && typeof res.data === 'object' && res.data.error) return fail(res.data.error);
  return res.data;
}

const t = () => ({ p_token: _token });

// ---------- الحساب ----------
export const register = (username, password, displayName) =>
  rpc('register', { p_username: username, p_password: password, p_display_name: displayName, p_accept_terms: true });
export const login = (username, password) => rpc('login', { p_username: username, p_password: password });
export const getMe = (token) => rpc('get_me', { p_token: token });
export const logout = (token) => rpc('logout', { p_token: token });
export const updateProfile = ({ displayName = null, avatarId = null }) =>
  rpc('update_profile', { ...t(), p_display_name: displayName, p_avatar_id: avatarId });
export const changePassword = (oldPassword, newPassword) =>
  rpc('change_password', { ...t(), p_old: oldPassword, p_new: newPassword });
export const getLegal = () => rpc('get_legal');

// ---------- الغرف ----------
export const createRoom = (name, description, allowAnonymous) =>
  rpc('create_room', { ...t(), p_name: name, p_description: description, p_allow_anonymous: allowAnonymous });
export const listMyRooms = () => rpc('list_my_rooms', t());
export const getRoom = (roomId) => rpc('get_room', { ...t(), p_room: roomId });
export const joinRoom = (code) => rpc('join_room', { ...t(), p_code: code });
export const listMyRequests = () => rpc('list_my_requests', t());
export const cancelRequest = (id) => rpc('cancel_request', { ...t(), p_request: id });
export const reviewRequest = (id, decision) => rpc('review_request', { ...t(), p_request: id, p_decision: decision });
export const removeMember = (roomId, userId) => rpc('remove_member', { ...t(), p_room: roomId, p_user: userId });
export const leaveRoom = (roomId) => rpc('leave_room', { ...t(), p_room: roomId });
export const regenerateJoinCode = (roomId) => rpc('regenerate_join_code', { ...t(), p_room: roomId });

// ---------- الذكريات ----------
export const createMemory = (roomId, title, description) =>
  rpc('create_memory', { ...t(), p_room: roomId, p_title: title, p_description: description });
export const addMedia = (memoryId, m, sort) =>
  rpc('add_media', {
    ...t(),
    p_memory: memoryId,
    p_path: m.path,
    p_thumb_path: m.thumb_path,
    p_width: m.width,
    p_height: m.height,
    p_bytes: m.bytes,
    p_sort: sort,
  });
export const listMemories = ({ roomId = null, limit = 30, before = null } = {}) =>
  rpc('list_memories', { ...t(), p_room: roomId, p_limit: limit, p_before: before });
export const getMemory = (id) => rpc('get_memory', { ...t(), p_memory: id });
export const deleteMemory = (id) => rpc('delete_memory', { ...t(), p_memory: id });
export const toggleLike = (id) => rpc('toggle_like', { ...t(), p_memory: id });
export const addComment = (id, body, anonymous) =>
  rpc('add_comment', { ...t(), p_memory: id, p_body: body, p_anonymous: anonymous });
export const deleteComment = (id) => rpc('delete_comment', { ...t(), p_comment: id });

// ---------- الإشعارات ----------
export const listNotifications = () => rpc('list_notifications', t());
export const unreadCount = () => rpc('unread_count', t());
export const markAllRead = () => rpc('mark_all_read', t());
export const markRead = (id) => rpc('mark_read', { ...t(), p_id: id });

// ---------- الصور (Edge Function + تخزين خاص) ----------
async function media(body) {
  let res;
  try {
    res = await supabase.functions.invoke(MEDIA_FUNCTION, { body: { token: _token, ...body } });
  } catch (e) {
    return fail('NETWORK');
  }
  if (res.error) return fail('SERVER_ERROR');
  if (res.data?.error) return fail(res.data.error);
  return res.data;
}

export const requestUploadUrls = (memoryId, count) => media({ action: 'upload_urls', memory_id: memoryId, count });
export const signMedia = (ids, variant) => media({ action: 'sign', ids, variant });

export async function uploadToSigned(path, token, bytes) {
  const { error } = await supabase.storage
    .from('zikra-media')
    .uploadToSignedUrl(path, token, bytes, { contentType: 'image/jpeg' });
  if (error) return fail('SERVER_ERROR');
}
