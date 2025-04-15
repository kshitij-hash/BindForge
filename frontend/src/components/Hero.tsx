
import { Button } from "@/components/ui/button";
import MoleculeVisual from "./MoleculeVisual";

const Hero = () => {
  return (
    <section className="pt-24 pb-16 lg:pt-32 lg:pb-24 bg-gradient-hero text-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              AI-Powered Covalent Binding Prediction
            </h1>
            <p className="text-xl mb-8 text-blue-50">
              Accelerate drug discovery with our Eliza-powered AI agent that enhances prediction accuracy 
              of irreversible covalent binding between small molecule inhibitors and MAPKAPK2/MK2.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-6 py-6">
                Launch Platform
              </Button>
              <Button variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-6 py-6">
                View Documentation
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-2 text-blue-100">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i} 
                    className="w-8 h-8 rounded-full bg-white/90 ring-2 ring-blue-600 flex items-center justify-center text-xs font-medium text-blue-600"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span className="ml-2">Trusted by leading research institutions</span>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600/20 rounded-full blur-3xl"></div>
              <MoleculeVisual />
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-16">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 flex flex-wrap justify-around gap-8">
          <div className="text-center">
            <p className="text-3xl font-bold">98.5%</p>
            <p className="text-sm opacity-80">Prediction Accuracy</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">10x</p>
            <p className="text-sm opacity-80">Faster Simulations</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">40+</p>
            <p className="text-sm opacity-80">Research Partners</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">200k+</p>
            <p className="text-sm opacity-80">Compounds Analyzed</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
