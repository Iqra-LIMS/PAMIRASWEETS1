import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";
import CartProvider from "../components/CartProvider";
import Header from "../components/Header";
import CartDrawer from "../components/CartDrawer";
import PricesProvider from "../components/PricesProvider";
import { getPrices } from "../lib/pricestore.js";

export const dynamic = "force-dynamic"; // prices come from the database

const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-display" });
const body = Jost({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-body" });

export const metadata = {
  title: "PAMIRA | A Little Luxury in Every Gift",
  description: "Stuffed dates in moon, flower and heart shapes, dipped in chocolate and packed in curated gift boxes.",
};

export default async function RootLayout({ children }) {
  const prices = await getPrices();
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <PricesProvider prices={prices}>
          <CartProvider>
            <Header />
            {children}
            <CartDrawer />
          </CartProvider>
        </PricesProvider>
      </body>
    </html>
  );
}
