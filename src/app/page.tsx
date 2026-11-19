import { Urbanist } from "next/font/google";
import HomePage from "@/components/HomePage";

// Same rounded geometric sans as the Roadmap dashboard.
const urbanist = Urbanist({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default function Home() {
  return (
    <div className={urbanist.className}>
      <HomePage />
    </div>
  );
}
