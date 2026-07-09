'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function loginAdmin(formData: FormData) {
  const adminId = formData.get('adminId');
  const password = formData.get('password');

  const expectedId = process.env.CONTROLLER_ID || 'admin';
  const expectedPassword = process.env.CONTROLLER_PASSWORD || 'agselectionid9965';

  if (adminId === expectedId && password === expectedPassword) {
    const cookieStore = await cookies();
    cookieStore.set('admin_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });
    
    redirect('/election/admin');
  } else {
    return { error: 'Invalid Controller ID or Password' };
  }
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
  redirect('/admin-login');
}
