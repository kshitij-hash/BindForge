
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="fixed w-full top-0 bg-white/80 backdrop-blur-md z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 bg-gradient-to-tr from-blue-600 to-green-400 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">E</span>
          </div>
          <h1 className="text-xl font-bold">CovalentEliza</h1>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors">Features</a>
          <a href="#workflow" className="text-gray-700 hover:text-blue-600 transition-colors">Workflow</a>
          <a href="#integration" className="text-gray-700 hover:text-blue-600 transition-colors">Eliza Integration</a>
          <Button className="bg-blue-600 hover:bg-blue-700">Get Started</Button>
        </nav>

        {/* Mobile Menu Button */}
        <button className="md:hidden" onClick={toggleMobileMenu}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white py-4 px-4 shadow-lg">
          <nav className="flex flex-col gap-4">
            <a 
              href="#features" 
              className="text-gray-700 hover:text-blue-600 transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </a>
            <a 
              href="#workflow" 
              className="text-gray-700 hover:text-blue-600 transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Workflow
            </a>
            <a 
              href="#integration" 
              className="text-gray-700 hover:text-blue-600 transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Eliza Integration
            </a>
            <Button className="bg-blue-600 hover:bg-blue-700 w-full">Get Started</Button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
