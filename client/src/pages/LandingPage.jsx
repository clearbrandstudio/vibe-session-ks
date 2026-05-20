import React from 'react'
import Nav from '../components/Nav'
import Hero from '../components/Hero'
import SocialProofBar from '../components/SocialProofBar'
import DualProductSplit from '../components/DualProductSplit'
import StudioExperience from '../components/StudioExperience'
import CloudFeatures from '../components/CloudFeatures'
import Manifesto from '../components/Manifesto'
import ProtocolStack from '../components/ProtocolStack'
import Gallery from '../components/Gallery'
import Pricing from '../components/Pricing'
import LeadCapture from '../components/LeadCapture'
import Footer from '../components/Footer'
import NoiseOverlay from '../components/ui/NoiseOverlay'

export default function LandingPage() {
  return (
    <div className="bg-black selection:bg-white selection:text-black min-h-screen">
      <NoiseOverlay />
      <div className="relative z-10 transition-opacity duration-1000 ease-in-out">
        <Nav />
        <main>
          <Hero />
          <SocialProofBar />
          <DualProductSplit />
          <StudioExperience />
          <CloudFeatures />
          <Manifesto />
          <ProtocolStack />
          <Gallery />
          <Pricing />
          <LeadCapture />
        </main>
        <Footer />
      </div>
    </div>
  )
}
