import Hero from './Hero';
import HowItWorks from './HowItWorks';
import Features from './Features';
import Pricing from './Pricing';
import Waitlist from './Waitlist';
import Footer from './Footer';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Hero />
      <HowItWorks />
      <Features />
      <Pricing />
      <Waitlist />
      <Footer />
    </div>
  );
}

// Named exports for direct section imports
export { Hero, HowItWorks, Features, Pricing, Waitlist, Footer };
