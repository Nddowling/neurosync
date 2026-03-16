import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  Stethoscope,
  MessageSquare,
  FileText,
  Pill,
  BookOpen,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  Shield,
  ChevronRight,
  Database,
  CreditCard,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
  { name: "Consult", page: "Consult", icon: MessageSquare },
  { name: "SOAP Notes", page: "SOAPNotes", icon: FileText },
  { name: "Medications", page: "Medications", icon: Pill },
  { name: "DSM-5 Reference", page: "DSMReference", icon: BookOpen },
  { name: "Patients", page: "Patients", icon: User },
  { name: "Knowledge Base", page: "KnowledgeBase", icon: Database },
  { name: "Subscription", page: "Subscription", icon: CreditCard },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="flex h-screen bg-gray-50/50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-6 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 tracking-tight">NeuroSync</h1>
                <p className="text-[11px] text-gray-400 font-medium tracking-wide uppercase">Clinical AI Assistant</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-gray-900 text-white shadow-lg shadow-gray-900/10"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <item.icon className={`w-[18px] h-[18px] ${isActive ? "text-teal-400" : "text-gray-400 group-hover:text-gray-600"}`} />
                  <span>{item.name}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
                </Link>
              );
            })}
          </nav>

          {/* Security Notice */}
          <div className="mx-3 mb-3">
            <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">Security Notice</p>
                  <p className="text-[11px] text-amber-600 mt-0.5 leading-relaxed">
                    Do not enter PHI. HIPAA compliance planned for V2.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* User */}
          <div className="px-4 py-4 border-t border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white text-sm font-medium">
                {user?.full_name?.[0] || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name || "Clinician"}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-600" />
            <span className="font-semibold text-gray-900">NeuroSync</span>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}