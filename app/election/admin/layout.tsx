import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

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
          <div className="flex items-center gap-6">
            <Link href="/election/admin" className="font-bold text-xl text-slate-900 tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity">
              Election <span className="text-blue-600">Controller</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-2 border-l pl-6 border-slate-200">
              <Link href="/election/admin/results" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors">
                Division Dashboard
              </Link>
              <Link href="/election/admin/live" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 transition-colors">
                Live Analytics 🚀
              </Link>
            </nav>
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
