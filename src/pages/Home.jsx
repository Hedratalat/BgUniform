import Navbar from "../components/Navbar/Navbar";
import HeroSection from "../components/HeroSection/HeroSection";
import WorkSectors from "../components/WorkSectors/WorkSectors";
import Feedback from "../components/Feedback/Feedback";
import Footer from "../components/Footer/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <WorkSectors />
      <Feedback />
      <Footer />
    </>
  );
}
