"use client";

import { FlaskRoundIcon as Flask } from "lucide-react";
import Link from "next/link";
import WorkflowContainer from "@/components/Workflow/WorkflowContainer";

export default function WorkflowPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-white">
        <div className="container flex h-16 items-center">
          <div className="flex items-center gap-2">
            <Flask className="h-6 w-6 text-teal-600" />
            <span className="text-xl font-bold">
              BindForge Docking Workflow
            </span>
          </div>
          <div className="ml-auto">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-teal-600 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <WorkflowContainer />
      </main>

      {/* Footer */}
      <footer className="w-full py-6 bg-white border-t mt-auto">
        <div className="container flex justify-center">
          <p className="text-sm text-gray-500">
            © 2025 BindForge Biotechnology
          </p>
        </div>
      </footer>
    </div>
  );
}
