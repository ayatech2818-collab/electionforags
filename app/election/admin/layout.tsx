import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');

  if (!session || session.value !== 'authenticated') {
    redirect('/admin-login');
  }

  return (
    <div className="font-sans flex flex-col min-h-screen">
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-xl text-slate-900 tracking-tight">Election <span className="text-blue-600">Controller</span></span>
          </div>
          <div className="flex items-center gap-4">
            <form action="/admin-login/actions" method="POST">
              <button 
                formAction={async () => {
                  'use server';
                  const { cookies } = await import('next/headers');
                  const cookieStore = await cookies();
                  cookieStore.delete('admin_session');
                  const { redirect } = await import('next/navigation');
                  redirect('/admin-login');
                }}
                className="text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-slate-50">
        {children}
      </main>
    </div>
  );
}
