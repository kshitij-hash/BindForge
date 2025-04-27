import {
  ArrowRight,
  Braces,
  Database,
  FlaskRoundIcon as Flask,
  Microscope,
  ArrowLeftRight,
  CheckCircle,
  Settings,
  LineChart,
} from "lucide-react";
import Link from "next/link";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="sticky top-0 z-40 w-full border-b bg-white">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Flask className="h-6 w-6 text-teal-600" />
            <span className="text-xl font-bold">BindForge</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/libraries"
              className="text-sm text-gray-500 hover:text-teal-600"
            >
              Libraries
            </Link>
            <Link
              href="/molecules"
              className="text-sm text-gray-500 hover:text-teal-600"
            >
              Molecules
            </Link>
            <Link
              href="/protein"
              className="text-sm text-gray-500 hover:text-teal-600"
            >
              Protein
            </Link>
            <Link
              href="/search"
              className="text-sm text-gray-500 hover:text-teal-600"
            >
              Search
            </Link>
            <Link
              href="/test-set"
              className="text-sm text-gray-500 hover:text-teal-600"
            >
              Test Set
            </Link>
            <Link
              href="/workflow"
              className="text-sm font-medium text-teal-600 hover:text-teal-700"
            >
              Workflow
            </Link>
          </nav>
          <Button variant="outline" className="hidden md:flex">
            <Link href="/workflow">Try Now</Link>
          </Button>
          <Button variant="outline" size="icon" className="md:hidden">
            <span className="sr-only">Toggle menu</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-white to-teal-50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col max-w-3xl mx-auto text-center">
              <div className="inline-block rounded-lg bg-teal-100 px-3 py-1 text-sm text-teal-700 mx-auto">
                Biotechnology Innovation
              </div>
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mt-4">
                AI-Powered Covalent Binding Prediction
              </h1>
              <p className="mt-4 text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Enhancing drug discovery with advanced AI for accurate
                prediction of small molecule inhibitors to target proteins.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-6 justify-center">
                <Button className="bg-teal-600 hover:bg-teal-700" asChild>
                  <Link href="/workflow">
                    Start Docking Workflow
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline">View Documentation</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow Section - NEW */}
        <section id="workflow" className="w-full py-12 md:py-24 bg-white">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-10">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-teal-100 px-3 py-1 text-sm text-teal-700">
                  New Feature
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                  Intuitive Docking Workflow
                </h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our step-by-step workflow guides you through the entire
                  process from protein selection to results analysis.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <Card className="border-2 border-teal-100 hover:border-teal-200 transition-colors">
                <CardHeader className="pb-2">
                  <div className="bg-teal-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-xl font-bold text-teal-700">1</span>
                  </div>
                  <CardTitle>Protein Structure</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">
                    Upload or search for protein structures with automatic
                    processing and cysteine identification.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-teal-100 hover:border-teal-200 transition-colors">
                <CardHeader className="pb-2">
                  <div className="bg-teal-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-xl font-bold text-teal-700">2</span>
                  </div>
                  <CardTitle>Molecule Input</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">
                    Add molecules via SMILES notation or choose from our curated
                    libraries of potential inhibitors.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-teal-100 hover:border-teal-200 transition-colors">
                <CardHeader className="pb-2">
                  <div className="bg-teal-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-xl font-bold text-teal-700">3</span>
                  </div>
                  <CardTitle>Docking Setup</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">
                    Configure binding site parameters and select advanced
                    docking algorithms for precise simulation.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-teal-100 hover:border-teal-200 transition-colors">
                <CardHeader className="pb-2">
                  <div className="bg-teal-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-xl font-bold text-teal-700">4</span>
                  </div>
                  <CardTitle>Results Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">
                    Visualize binding interactions and get detailed reports on
                    covalent binding predictions.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-center mt-10">
              <Button className="bg-teal-600 hover:bg-teal-700" asChild>
                <Link href="/workflow">
                  Try the Workflow
                  <ArrowLeftRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="w-full py-12 md:py-24 lg:py-32 bg-gray-50"
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-teal-100 px-3 py-1 text-sm text-teal-700">
                  Key Features
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                  Advanced Capabilities
                </h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our AI agent enhances drug discovery through sophisticated
                  prediction models.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 mt-12">
              <Card className="border-2 border-teal-100 hover:border-teal-200 transition-colors">
                <CardHeader className="pb-2">
                  <div className="bg-teal-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <Database className="h-6 w-6 text-teal-700" />
                  </div>
                  <CardTitle>Docking Integration</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">
                    Integration with AutoDock Vina and Glide for comprehensive
                    binding analysis.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 border-teal-100 hover:border-teal-200 transition-colors">
                <CardHeader className="pb-2">
                  <div className="bg-teal-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <Braces className="h-6 w-6 text-teal-700" />
                  </div>
                  <CardTitle>Machine Learning</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">
                    Advanced ML algorithms refine prediction models based on
                    historical data.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 border-teal-100 hover:border-teal-200 transition-colors">
                <CardHeader className="pb-2">
                  <div className="bg-teal-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <Microscope className="h-6 w-6 text-teal-700" />
                  </div>
                  <CardTitle>Real-time Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">
                    Interactive feedback for modifying molecular structures
                    before synthesis.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Technology Section */}
        <section
          id="technology"
          className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-teal-50 to-white"
        >
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <div className="inline-block rounded-lg bg-teal-100 px-3 py-1 text-sm text-teal-700 mb-4">
                Technology
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                Powered by the Eliza Framework
              </h2>
              <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed mt-4">
                Our solution leverages the Eliza framework's capabilities on
                Solana to ensure scalability and efficiency in computational
                drug discovery.
              </p>
              <ul className="space-y-2 mt-6">
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-500"></div>
                  <span>High-throughput molecular simulations</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-500"></div>
                  <span>Secure data handling for proprietary compounds</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-500"></div>
                  <span>Accelerated research and development workflows</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-500"></div>
                  <span>Step-by-step guided workflow for researchers</span>
                </li>
              </ul>
              <div className="flex gap-4 mt-6">
                <Button variant="outline">
                  Technical Whitepaper
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button className="bg-teal-600 hover:bg-teal-700" asChild>
                  <Link href="/workflow">Try the Workflow</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section
          id="contact"
          className="w-full py-12 md:py-24 lg:py-32 bg-teal-900 text-white"
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                  Join the Research Initiative
                </h2>
                <p className="max-w-[900px] text-teal-100 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Collaborate with our team to advance computational drug
                  discovery.
                </p>
              </div>
              <div className="w-full max-w-md space-y-4">
                <form className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
                  <input
                    className="flex h-10 w-full rounded-md border border-teal-700 bg-teal-800 px-3 py-2 text-sm placeholder:text-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter your email"
                    type="email"
                  />
                  <Button className="bg-white text-teal-900 hover:bg-teal-100">
                    Subscribe
                  </Button>
                </form>
                <p className="text-teal-200 text-sm">
                  Get early access to our workflow and research tools
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - Simplified */}
      <footer className="w-full py-6 bg-white border-t">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2">
              <Flask className="h-5 w-5 text-teal-600" />
              <span className="font-bold">BindForge</span>
            </div>
            <div className="flex flex-wrap gap-6 mt-4 md:mt-0">
              <Link
                href="/libraries"
                className="text-sm text-gray-500 hover:text-teal-600"
              >
                Libraries
              </Link>
              <Link
                href="/molecules"
                className="text-sm text-gray-500 hover:text-teal-600"
              >
                Molecules
              </Link>
              <Link
                href="/protein"
                className="text-sm text-gray-500 hover:text-teal-600"
              >
                Protein
              </Link>
              <Link
                href="/search"
                className="text-sm text-gray-500 hover:text-teal-600"
              >
                Search
              </Link>
              <Link
                href="/test-set"
                className="text-sm text-gray-500 hover:text-teal-600"
              >
                Test Set
              </Link>
              <Link
                href="/workflow"
                className="text-sm text-gray-500 hover:text-teal-600"
              >
                Workflow
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-4 md:mt-0">
              © 2025 BindForge Biotechnology
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
