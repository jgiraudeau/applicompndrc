"use client";

import { SessionProvider } from "next-auth/react";
import { TrackProvider } from "@/context/TrackContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <TrackProvider>
                {children}
            </TrackProvider>
        </SessionProvider>
    );
}
