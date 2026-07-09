import Link from 'next/link';
import { User, ShieldCheck, ClipboardList, Vote, Settings } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl mb-4">
            AGS Election Portal
          </h1>
          <p className="text-lg text-slate-600">
            Select your role to access the system.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col h-full text-center">
            <div className="mx-auto bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Vote className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Student Voter</h2>
            <p className="text-sm text-slate-500 mb-6 flex-grow">Cast your anonymous vote securely.</p>
            <Link href="/election/vote" className="w-full inline-block bg-blue-600 text-white font-medium py-2.5 rounded-xl hover:bg-blue-700 transition-colors">
              Go to Booth
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col h-full text-center">
            <div className="mx-auto bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Mother Mentor</h2>
            <p className="text-sm text-slate-500 mb-6 flex-grow">Download ID cards for your class.</p>
            <Link href="/election/mentor" className="w-full inline-block border border-purple-200 text-purple-700 font-medium py-2.5 rounded-xl hover:bg-purple-50 transition-colors">
              Access Portal
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col h-full text-center">
            <div className="mx-auto bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Settings className="w-8 h-8 text-slate-700" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Controller</h2>
            <p className="text-sm text-slate-500 mb-6 flex-grow">Full management & live results.</p>
            <Link href="/election/admin" className="w-full inline-block border border-slate-200 text-slate-700 font-medium py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
              Manage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
