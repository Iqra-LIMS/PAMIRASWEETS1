"use client";
import { createContext, useContext } from "react";
import { DEFAULT_PRICES } from "../lib/prices";

const Ctx = createContext(DEFAULT_PRICES);
export const usePrices = () => useContext(Ctx);
export default function PricesProvider({ prices, children }) {
  return <Ctx.Provider value={prices}>{children}</Ctx.Provider>;
}
