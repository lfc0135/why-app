import type { Metadata } from "next"
import { Caveat, Literata, Patrick_Hand } from "next/font/google"
import "./globals.css"

const literata = Literata({
  subsets: ["latin"],
  display: "swap",
})

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-chalk-family",
  display: "swap",
})

const hand = Patrick_Hand({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-hand-family",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Why",
  description: "Thirty-second chalkboard explainers for fintech, crypto, and business structuring.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${caveat.variable} ${hand.variable} h-full antialiased`}>
      <body className={`${literata.className} min-h-full flex flex-col`}>{children}</body>
    </html>
  )
}
