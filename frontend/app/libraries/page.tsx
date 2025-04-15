"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { ArrowLeft, Database, FlaskRoundIcon as Flask } from "lucide-react";

type Library = "covalent" | "non-covalent" | "warheads";

interface Molecule {
  smiles: string;
  name?: string;
  molecular_weight?: string;
  molecular_formula?: string;
  [key: string]: any;
}

export default function LibrariesPage() {
  const [activeLibrary, setActiveLibrary] = useState<Library>("covalent");
  const [molecules, setMolecules] = useState<Record<string, Molecule>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLibrary = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `http://localhost:8000/api/library/${activeLibrary}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || `Failed to fetch ${activeLibrary} library`
          );
        }

        setMolecules(data.molecules);
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchLibrary();
  }, [activeLibrary]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="sticky top-0 z-40 w-full border-b bg-white">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Flask className="h-6 w-6 text-teal-600" />
            <span className="text-xl font-bold">NeuraViva</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium hover:text-teal-600 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/libraries"
              className="text-sm font-medium text-teal-600 transition-colors"
            >
              Libraries
            </Link>
          </nav>
          <Link href="/">
            <Button variant="outline" className="hidden md:flex">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 bg-gradient-to-b from-white to-teal-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-8">
            <div className="inline-block rounded-lg bg-teal-100 px-3 py-1 text-sm text-teal-700">
              Molecular Database
            </div>
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">Molecule Libraries</h1>
            <p className="max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Browse our curated collection of molecules for drug discovery and research
            </p>
          </div>

          <div className="mb-8">
            <div className="flex justify-center border-b">
              <button
                className={`py-3 px-6 ${
                  activeLibrary === "covalent"
                    ? "border-b-2 border-teal-500 font-medium text-teal-700"
                    : "text-gray-600 hover:text-teal-600"
                } transition-colors`}
                onClick={() => setActiveLibrary("covalent")}
              >
                Covalent Inhibitors
              </button>
              <button
                className={`py-3 px-6 ${
                  activeLibrary === "non-covalent"
                    ? "border-b-2 border-teal-500 font-medium text-teal-700"
                    : "text-gray-600 hover:text-teal-600"
                } transition-colors`}
                onClick={() => setActiveLibrary("non-covalent")}
              >
                Non-covalent Binders
              </button>
              <button
                className={`py-3 px-6 ${
                  activeLibrary === "warheads"
                    ? "border-b-2 border-teal-500 font-medium text-teal-700"
                    : "text-gray-600 hover:text-teal-600"
                } transition-colors`}
                onClick={() => setActiveLibrary("warheads")}
              >
                Warhead Fragments
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent"></div>
              <p className="mt-4 text-gray-500">Loading molecules...</p>
            </div>
          ) : error ? (
            <div className="bg-red-100 text-red-700 p-4 rounded-lg max-w-lg mx-auto">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(molecules).map(([name, molecule]) => (
                <Card key={name} className="border-2 border-teal-100 hover:border-teal-200 transition-colors overflow-hidden">
                  <CardContent className="p-6">
                    <div className="bg-teal-100 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                      <Database className="h-5 w-5 text-teal-700" />
                    </div>
                    <h3 className="font-semibold text-lg">{name}</h3>
                    <div className="bg-gray-100 p-3 rounded-md mt-3">
                      <p className="text-sm font-mono break-all text-gray-700">
                        {molecule.smiles}
                      </p>
                    </div>
                    <div className="mt-4 space-y-1">
                      {molecule.molecular_weight && (
                        <p className="text-sm flex items-center">
                          <span className="w-16 text-gray-500">MW:</span>
                          <span className="font-medium">{molecule.molecular_weight}</span>
                        </p>
                      )}
                      {molecule.molecular_formula && (
                        <p className="text-sm flex items-center">
                          <span className="w-16 text-gray-500">Formula:</span>
                          <span className="font-medium">{molecule.molecular_formula}</span>
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {!loading && !error && Object.keys(molecules).length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500">No molecules found in this library.</p>
            </div>
          )}
        </div>
      </main>
      
      {/* Footer - Simplified */}
      <footer className="w-full py-6 bg-white border-t">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2">
              <Flask className="h-5 w-5 text-teal-600" />
              <span className="font-bold">NeuraViva</span>
            </div>
            <p className="text-sm text-gray-500 mt-4 md:mt-0">
              © 2025 NeuraViva Biotechnology
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
